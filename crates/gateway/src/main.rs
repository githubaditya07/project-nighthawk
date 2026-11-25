use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        DefaultBodyLimit, Multipart, Path, State,
    },
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chaos_crypto::{
    compute_merkle_root, export_benchmarks_csv, hash_bytes, verify_shard,
};
use core_codec::{encode_rs84, reconstruct_and_regenerate, DATA_SHARDS, TOTAL_SHARDS};
use mesh_node::{MeshManager, NodeInspectResponse, TOTAL_NODES};
use serde::{Deserialize, Serialize};
use shared::{
    BenchmarkRun, FileManifest, NetworkImpairment, NodeStatus, ShardKind, ShardMeta,
    SystemSnapshot, TelemetryEvent,
};
use std::{
    path::PathBuf,
    sync::Arc,
    time::Instant,
};
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

fn get_iso_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let dt: chrono::DateTime<chrono::Utc> = now.into();
    dt.to_rfc3339()
}

pub struct GatewayState {
    pub mesh: MeshManager,
    pub manifest: Option<FileManifest>,
    pub impairment: NetworkImpairment,
    pub benchmarks: Vec<BenchmarkRun>,
    pub reconstructed_bytes: Option<Vec<u8>>,
    pub reconstructed_blake3: Option<String>,
    pub integrity_verified: Option<bool>,
    pub last_encode_ms: u128,
    pub last_reconstruction_ms: u128,
    pub last_healing_ms: u128,
    pub cached_shards: Vec<Option<Vec<u8>>>,
}

#[derive(Clone)]
pub struct AppState {
    pub inner: Arc<RwLock<GatewayState>>,
    pub tx: broadcast::Sender<TelemetryEvent>,
}

impl AppState {
    pub fn broadcast(&self, event: TelemetryEvent) {
        let _ = self.tx.send(event);
    }
}

#[derive(Deserialize)]
pub struct KillRequest {
    pub count: Option<usize>,
    pub random: Option<bool>,
    pub node_ids: Option<Vec<usize>>,
}

#[derive(Deserialize)]
pub struct CorruptRequest {
    pub node_id: usize,
}

#[derive(Deserialize)]
pub struct NetworkRequest {
    pub packet_loss_pct: f64,
    pub latency_ms: u64,
}

#[derive(Serialize)]
pub struct KillResponse {
    pub status: String,
    pub killed_nodes: Vec<usize>,
    pub active_nodes: usize,
    pub redundancy_level: String,
}

#[derive(Serialize)]
pub struct CorruptResponse {
    pub status: String,
    pub node_id: usize,
    pub corrupted_shard_id: usize,
    pub message: String,
}

#[derive(Serialize)]
pub struct ReconstructResponse {
    pub status: String,
    pub surviving_shards: usize,
    pub rejected_shards: Vec<usize>,
    pub original_blake3: String,
    pub reconstructed_blake3: String,
    pub matched: bool,
    pub reconstruction_ms: u128,
    pub can_download: bool,
}

#[derive(Serialize)]
pub struct HealResponse {
    pub status: String,
    pub restored_nodes: Vec<usize>,
    pub regenerated_shards: Vec<usize>,
    pub healing_ms: u128,
    pub active_nodes: usize,
    pub redundancy_level: String,
}

#[derive(Serialize)]
pub struct GenericMessageResponse {
    pub status: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct ReviveResponse {
    pub status: String,
    pub node_id: usize,
    pub active_nodes: usize,
}

#[derive(Serialize)]
pub struct RouletteResponse {
    pub status: String,
    pub killed_nodes: Vec<usize>,
    pub corrupted_node_id: Option<usize>,
    pub packet_loss_pct: f64,
    pub active_nodes: usize,
    pub redundancy_level: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let data_dir = std::env::var("NIGHTHAWK_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let mesh = MeshManager::new(&data_dir);
    let (tx, _rx) = broadcast::channel::<TelemetryEvent>(512);

    let state = AppState {
        inner: Arc::new(RwLock::new(GatewayState {
            mesh,
            manifest: None,
            impairment: NetworkImpairment::default(),
            benchmarks: Vec::new(),
            reconstructed_bytes: None,
            reconstructed_blake3: None,
            integrity_verified: None,
            last_encode_ms: 0,
            last_reconstruction_ms: 0,
            last_healing_ms: 0,
            cached_shards: vec![None; TOTAL_SHARDS],
        })),
        tx,
    };

    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/api/state", get(handle_get_state))
        .route("/api/upload", post(handle_upload))
        .route("/api/nodes/{id}/health", get(handle_node_health))
        .route("/api/nodes/{id}/revive", post(handle_node_revive))
        .route("/api/node/{node_id}/inspect", get(handle_node_inspect))
        .route("/api/chaos/kill", post(handle_chaos_kill))
        .route("/api/chaos/corrupt", post(handle_chaos_corrupt))
        .route("/api/chaos/network", post(handle_chaos_network))
        .route("/api/chaos/roulette", post(handle_chaos_roulette))
        .route("/api/reconstruct", post(handle_reconstruct))
        .route("/api/heal", post(handle_heal))
        .route("/api/download", get(handle_download))
        .route("/api/benchmarks/export", get(handle_benchmarks_export))
        .route("/api/system/reset", post(handle_system_reset))
        .route("/ws/telemetry", get(handle_ws_telemetry))
        .layer(cors)
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .with_state(state);

    let bind_addr = "0.0.0.0:8080";
    let listener = tokio::net::TcpListener::bind(bind_addr)
        .await
        .unwrap_or_else(|e| panic!("Failed to bind to {}: {}", bind_addr, e));

    let lan_mode = std::env::var("NIGHTHAWK_NODE_URLS")
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    println!("============================================================");
    println!("  PROJECT NIGHTHAWK — AXUM GATEWAY READY");
    println!("  Listening on http://{}", bind_addr);
    println!("  Telemetry stream: ws://{}/ws/telemetry", bind_addr);
    println!(
        "  Mesh Mode: {}",
        if lan_mode {
            "Distributed Multi-Laptop LAN Workers (NIGHTHAWK_NODE_URLS)"
        } else {
            "Local Disk Vaults (./data/node_01..12)"
        }
    );
    println!("============================================================");

    axum::serve(listener, app).await.unwrap();
}

async fn handle_get_state(State(app): State<AppState>) -> Json<SystemSnapshot> {
    let state = app.inner.read().await;
    let nodes = state.mesh.get_nodes().await;
    let active_nodes = state.mesh.get_active_count().await;

    let redundancy_level = if active_nodes == 12 {
        "Optimal (1.50x RS(8,4))".to_string()
    } else if active_nodes >= 8 {
        format!("Degraded ({}/12 surviving - Minimum 8 required)", active_nodes)
    } else {
        format!("Critical Failure ({}/12 surviving - Redundancy Lost)", active_nodes)
    };

    let can_download = state.reconstructed_bytes.is_some()
        && state.integrity_verified == Some(true);

    Json(SystemSnapshot {
        nodes,
        manifest: state.manifest.clone(),
        impairment: state.impairment.clone(),
        active_nodes,
        redundancy_level,
        benchmarks: state.benchmarks.clone(),
        reconstructed_blake3: state.reconstructed_blake3.clone(),
        integrity_verified: state.integrity_verified,
        can_download,
    })
}

async fn handle_upload(
    State(app): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<FileManifest>, (StatusCode, String)> {
    let mut file_name = "payload.bin".to_string();
    let mut file_bytes = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            if let Some(name) = field.file_name() {
                file_name = name.to_string();
            }
            if let Ok(bytes) = field.bytes().await {
                file_bytes = bytes.to_vec();
            }
            break;
        }
    }

    if file_bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "File payload is empty".to_string()));
    }

    let start = Instant::now();
    let original_blake3 = hash_bytes(&file_bytes);

    let (shards, shard_len) = encode_rs84(&file_bytes)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("RS(8,4) encode error: {}", e)))?;

    let mut shard_hashes = Vec::with_capacity(TOTAL_SHARDS);
    let mut shard_metas = Vec::with_capacity(TOTAL_SHARDS);

    for (i, shard) in shards.iter().enumerate() {
        let hash = hash_bytes(shard);
        shard_hashes.push(hash.clone());

        shard_metas.push(ShardMeta {
            shard_id: i,
            kind: if i < DATA_SHARDS {
                ShardKind::Data
            } else {
                ShardKind::Parity
            },
            size_bytes: shard_len,
            blake3_hash: hash,
            node_id: i + 1,
            is_corrupt: false,
        });
    }

    let merkle_root = compute_merkle_root(&shard_hashes);
    let encode_ms = start.elapsed().as_millis();

    let manifest = FileManifest {
        file_id: Uuid::new_v4().to_string(),
        filename: file_name.clone(),
        original_size: file_bytes.len(),
        original_blake3: original_blake3.clone(),
        merkle_root: merkle_root.clone(),
        storage_overhead: 1.50,
        shards: shard_metas.clone(),
    };

    let impairment = {
        let s = app.inner.read().await;
        s.impairment.clone()
    };

    // Write all 12 shards to their respective nodes
    for (i, shard) in shards.iter().enumerate() {
        let node_id = i + 1;
        let droplet = app
            .inner
            .read()
            .await
            .mesh
            .write_shard(node_id, i, shard, &impairment)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed writing shard {} to node {}: {}", i, node_id, e),
                )
            })?;

        app.broadcast(TelemetryEvent::ShardDistributed {
            shard_id: i,
            node_id,
            size_bytes: shard_len,
        });

        app.broadcast(TelemetryEvent::DropletProgress {
            packet_loss_pct: droplet.packet_loss_pct,
            sent_droplets: droplet.sent_droplets,
            lost_droplets: droplet.lost_droplets,
            received_droplets: droplet.received_droplets,
            decoded: droplet.decoded,
        });
    }

    app.broadcast(TelemetryEvent::FileEncoded {
        manifest: manifest.clone(),
        encode_ms,
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "INFO".to_string(),
        code: "FILE_ENCODED".to_string(),
        message: format!(
            "Uploaded '{}' ({} bytes). RS(8,4) generated 12 shards. Merkle root: {} in {}ms",
            file_name,
            file_bytes.len(),
            &merkle_root[..12],
            encode_ms
        ),
    });

    // Update state
    {
        let mut state = app.inner.write().await;
        state.manifest = Some(manifest.clone());
        state.last_encode_ms = encode_ms;
        state.reconstructed_bytes = None;
        state.reconstructed_blake3 = None;
        state.integrity_verified = None;
        state.cached_shards = shards.into_iter().map(Some).collect();
    }

    Ok(Json(manifest))
}

async fn handle_node_health(
    Path(id): Path<usize>,
    State(app): State<AppState>,
) -> Result<Json<shared::NodeInfo>, (StatusCode, String)> {
    let node = app
        .inner
        .read()
        .await
        .mesh
        .get_node(id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;
    Ok(Json(node))
}

async fn handle_node_revive(
    Path(id): Path<usize>,
    State(app): State<AppState>,
) -> Result<Json<ReviveResponse>, (StatusCode, String)> {
    let active = app
        .inner
        .read()
        .await
        .mesh
        .revive_node(id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    app.broadcast(TelemetryEvent::NodeStatusChanged {
        node_id: id,
        status: NodeStatus::Online,
        active_nodes: active,
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "INFO".to_string(),
        code: "NODE_REVIVED".to_string(),
        message: format!("Node {} manually revived back to Online. Active nodes: {}/12", id, active),
    });

    Ok(Json(ReviveResponse {
        status: "success".to_string(),
        node_id: id,
        active_nodes: active,
    }))
}

async fn handle_chaos_kill(
    State(app): State<AppState>,
    Json(payload): Json<KillRequest>,
) -> Json<KillResponse> {
    let count = payload.count.unwrap_or(1).clamp(1, 12);
    let random = payload.random.unwrap_or(false);

    let (killed, active) = {
        let state = app.inner.read().await;
        state.mesh.kill_nodes(count, random, payload.node_ids).await
    };

    for node_id in &killed {
        app.broadcast(TelemetryEvent::NodeStatusChanged {
            node_id: *node_id,
            status: NodeStatus::Offline,
            active_nodes: active,
        });
    }

    let redundancy_level = if active >= 8 {
        format!("Degraded ({}/12 surviving - Minimum 8 required)", active)
    } else {
        format!("Critical Failure ({}/12 surviving - Redundancy Lost)", active)
    };

    app.broadcast(TelemetryEvent::RedundancyDegraded {
        surviving_shards: active,
        required_shards: DATA_SHARDS,
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "WARN".to_string(),
        code: "CHAOS_NODES_KILLED".to_string(),
        message: format!(
            "Chaos monkey took {} nodes offline: {:?}. Active nodes: {}/12",
            killed.len(),
            killed,
            active
        ),
    });

    Json(KillResponse {
        status: "success".to_string(),
        killed_nodes: killed,
        active_nodes: active,
        redundancy_level,
    })
}

async fn handle_node_inspect(
    Path(node_id): Path<usize>,
    State(app): State<AppState>,
) -> Result<Json<NodeInspectResponse>, (StatusCode, String)> {
    let mesh = app.inner.read().await.mesh.clone();
    let res = mesh
        .inspect_node(node_id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;
    Ok(Json(res))
}

async fn handle_chaos_corrupt(
    State(app): State<AppState>,
    Json(payload): Json<CorruptRequest>,
) -> Result<Json<CorruptResponse>, (StatusCode, String)> {
    let node_id = payload.node_id.clamp(1, TOTAL_NODES);
    let shard_id = node_id - 1;

    let mesh = app.inner.read().await.mesh.clone();
    mesh.corrupt_node_shard(node_id, shard_id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e))?;

    mesh.mark_node_degraded(node_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Mark shard as corrupt in manifest
    {
        let mut state = app.inner.write().await;
        if let Some(manifest) = &mut state.manifest {
            if shard_id < manifest.shards.len() {
                manifest.shards[shard_id].is_corrupt = true;
            }
        }
    }

    app.broadcast(TelemetryEvent::NodeStatusChanged {
        node_id,
        status: NodeStatus::Degraded,
        active_nodes: mesh.get_active_count().await,
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "ERROR".to_string(),
        code: "CHAOS_BIT_ROT".to_string(),
        message: format!(
            "Injected physical disk bit rot: XORed 16 bytes on node {} (shard {})",
            node_id, shard_id
        ),
    });

    Ok(Json(CorruptResponse {
        status: "success".to_string(),
        node_id,
        corrupted_shard_id: shard_id,
        message: "Physical disk shard bytes corrupted with bit rot".to_string(),
    }))
}

async fn handle_chaos_roulette(
    State(app): State<AppState>,
) -> Result<Json<RouletteResponse>, (StatusCode, String)> {
    let mesh = app.inner.read().await.mesh.clone();

    // 1. Kill 3 random online nodes
    let (killed, active) = mesh.kill_nodes(3, true, None).await;
    for node_id in &killed {
        app.broadcast(TelemetryEvent::NodeStatusChanged {
            node_id: *node_id,
            status: NodeStatus::Offline,
            active_nodes: active,
        });
    }

    // 2. Corrupt 1 surviving online node's shard on disk (total = 4 faults = exact RS(8,4) limit)
    let nodes = mesh.get_nodes().await;
    let mut corrupted_node_id: Option<usize> = None;

    if let Some(target_node) = nodes.iter().find(|n| n.status == NodeStatus::Online) {
        let nid = target_node.node_id;
        let sid = target_node.shard_id.unwrap_or(nid - 1);

        if mesh.corrupt_node_shard(nid, sid).await.is_ok() {
            let _ = mesh.mark_node_degraded(nid).await;
            corrupted_node_id = Some(nid);

            {
                let mut state = app.inner.write().await;
                if let Some(manifest) = &mut state.manifest {
                    if sid < manifest.shards.len() {
                        manifest.shards[sid].is_corrupt = true;
                    }
                }
            }

            app.broadcast(TelemetryEvent::NodeStatusChanged {
                node_id: nid,
                status: NodeStatus::Degraded,
                active_nodes: active,
            });
        }
    }

    // 3. Set packet loss to 35%
    {
        let mut state = app.inner.write().await;
        state.impairment.packet_loss_pct = 35.0;
    }

    let valid_surviving = active.saturating_sub(if corrupted_node_id.is_some() { 1 } else { 0 });

    app.broadcast(TelemetryEvent::RedundancyDegraded {
        surviving_shards: valid_surviving,
        required_shards: DATA_SHARDS,
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "WARN".to_string(),
        code: "CHAOS_ROULETTE".to_string(),
        message: format!(
            "JUDGE CHAOS ROULETTE: Killed 3 random nodes ({:?}), corrupted node {:?} on disk, set packet loss to 35.0%. Surviving valid: {}/12",
            killed, corrupted_node_id, valid_surviving
        ),
    });

    let redundancy_level = if valid_surviving >= 8 {
        format!("Degraded ({}/12 surviving - Minimum 8 required)", valid_surviving)
    } else {
        format!("Critical Failure ({}/12 surviving - Redundancy Lost)", valid_surviving)
    };

    Ok(Json(RouletteResponse {
        status: "success".to_string(),
        killed_nodes: killed,
        corrupted_node_id,
        packet_loss_pct: 35.0,
        active_nodes: active,
        redundancy_level,
    }))
}

async fn handle_chaos_network(
    State(app): State<AppState>,
    Json(payload): Json<NetworkRequest>,
) -> Json<NetworkImpairment> {
    let impairment = NetworkImpairment {
        packet_loss_pct: payload.packet_loss_pct.clamp(0.0, 50.0),
        latency_ms: payload.latency_ms.clamp(0, 1000),
    };

    {
        let mut state = app.inner.write().await;
        state.impairment = impairment.clone();
    }

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "INFO".to_string(),
        code: "NETWORK_IMPAIRMENT_UPDATED".to_string(),
        message: format!(
            "Network impairment set to {:.1}% packet loss, {}ms latency",
            impairment.packet_loss_pct, impairment.latency_ms
        ),
    });

    Json(impairment)
}

async fn handle_reconstruct(
    State(app): State<AppState>,
) -> Result<Json<ReconstructResponse>, (StatusCode, String)> {
    let start = Instant::now();

    let (manifest, impairment) = {
        let state = app.inner.read().await;
        let manifest = state
            .manifest
            .clone()
            .ok_or((StatusCode::BAD_REQUEST, "No file uploaded yet".to_string()))?;
        (manifest, state.impairment.clone())
    };

    let mut collected_shards: Vec<Option<Vec<u8>>> = vec![None; TOTAL_SHARDS];
    let mut surviving_shard_ids = Vec::new();
    let mut rejected_shards = Vec::new();
    let mut total_detection_ms = 0u128;

    // Read and verify shards across all 12 nodes
    for i in 0..TOTAL_SHARDS {
        let node_id = i + 1;
        let mesh = app.inner.read().await.mesh.clone();
        match mesh.read_shard(node_id, i, &impairment).await {
            Ok((bytes, droplet)) => {
                let expected_hash = &manifest.shards[i].blake3_hash;
                let det_start = Instant::now();
                let (matches, actual_hash) = verify_shard(&bytes, expected_hash);
                total_detection_ms += det_start.elapsed().as_millis();

                app.broadcast(TelemetryEvent::DropletProgress {
                    packet_loss_pct: droplet.packet_loss_pct,
                    sent_droplets: droplet.sent_droplets,
                    lost_droplets: droplet.lost_droplets,
                    received_droplets: droplet.received_droplets,
                    decoded: droplet.decoded,
                });

                if matches {
                    collected_shards[i] = Some(bytes);
                    surviving_shard_ids.push(i);
                } else {
                    rejected_shards.push(i);
                    app.broadcast(TelemetryEvent::CorruptedShardRejected {
                        node_id,
                        shard_id: i,
                        expected_hash: expected_hash.clone(),
                        actual_hash: actual_hash.clone(),
                    });
                    app.broadcast(TelemetryEvent::Log {
                        timestamp: get_iso_timestamp(),
                        level: "ERROR".to_string(),
                        code: "CORRUPTED_SHARD_REJECTED".to_string(),
                        message: format!(
                            "Node {} shard {} FAILED Blake3 hash verification (expected: {}, actual: {}). Shard discarded.",
                            node_id, i, &expected_hash[..8], &actual_hash[..8]
                        ),
                    });
                }
            }
            Err(_) => {
                // Node offline or missing
            }
        }
    }

    let surviving_count = surviving_shard_ids.len();
    if surviving_count < DATA_SHARDS {
        return Err((
            StatusCode::CONFLICT,
            format!(
                "Insufficient redundancy: only {} shards survived Blake3 verification (minimum {} required)",
                surviving_count, DATA_SHARDS
            ),
        ));
    }

    app.broadcast(TelemetryEvent::ReconstructionStarted {
        surviving_shard_ids: surviving_shard_ids.clone(),
    });

    let recovered_bytes = reconstruct_and_regenerate(&mut collected_shards, manifest.original_size)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("RS(8,4) reconstruction failed: {}", e),
            )
        })?;

    let reconstructed_blake3 = hash_bytes(&recovered_bytes);
    let matched = reconstructed_blake3 == manifest.original_blake3;
    let reconstruction_ms = start.elapsed().as_millis();
    let detection_ms = total_detection_ms.max(1);

    app.broadcast(TelemetryEvent::IntegrityVerified {
        original_blake3: manifest.original_blake3.clone(),
        reconstructed_blake3: reconstructed_blake3.clone(),
        matched,
        reconstruction_ms,
    });

    let benchmark_run = BenchmarkRun {
        run_id: app.inner.read().await.benchmarks.len() + 1,
        timestamp: get_iso_timestamp(),
        scenario: format!("RS(8,4) Recovery ({}/12 shards)", surviving_count),
        file_size_bytes: manifest.original_size,
        storage_overhead: 1.50,
        encode_ms: app.inner.read().await.last_encode_ms,
        detection_ms,
        reconstruction_ms,
        healing_ms: 0,
        packet_loss_pct: impairment.packet_loss_pct,
        bandwidth_efficiency: (manifest.original_size as f64
            / (surviving_count * manifest.shards[0].size_bytes) as f64)
            * 100.0,
        fault_tolerance: "4/12 nodes (33.3%)".to_string(),
        integrity_verified: matched,
    };

    app.broadcast(TelemetryEvent::MetricsUpdate {
        benchmark: benchmark_run.clone(),
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "INFO".to_string(),
        code: "INTEGRITY_VERIFIED".to_string(),
        message: format!(
            "RS(8,4) reconstruction complete in {}ms from {} shards. Blake3 match: {}",
            reconstruction_ms, surviving_count, matched
        ),
    });

    {
        let mut state = app.inner.write().await;
        state.reconstructed_bytes = Some(recovered_bytes);
        state.reconstructed_blake3 = Some(reconstructed_blake3.clone());
        state.integrity_verified = Some(matched);
        state.last_reconstruction_ms = reconstruction_ms;
        state.cached_shards = collected_shards;
        state.benchmarks.push(benchmark_run);
    }

    Ok(Json(ReconstructResponse {
        status: "success".to_string(),
        surviving_shards: surviving_count,
        rejected_shards,
        original_blake3: manifest.original_blake3,
        reconstructed_blake3,
        matched,
        reconstruction_ms,
        can_download: matched,
    }))
}

async fn handle_heal(
    State(app): State<AppState>,
) -> Result<Json<HealResponse>, (StatusCode, String)> {
    let start = Instant::now();

    let (manifest, impairment, cached_shards) = {
        let state = app.inner.read().await;
        let manifest = state
            .manifest
            .clone()
            .ok_or((StatusCode::BAD_REQUEST, "No file uploaded yet".to_string()))?;
        (manifest, state.impairment.clone(), state.cached_shards.clone())
    };

    let mut working_shards = cached_shards;
    let mut missing_or_corrupt_nodes = Vec::new();
    let mut regenerated_shards = Vec::new();

    let nodes = app.inner.read().await.mesh.get_nodes().await;
    for node in &nodes {
        if node.status != NodeStatus::Online {
            missing_or_corrupt_nodes.push(node.node_id);
            let shard_id = node.node_id - 1;
            regenerated_shards.push(shard_id);
        }
    }

    if missing_or_corrupt_nodes.is_empty() {
        return Ok(Json(HealResponse {
            status: "success".to_string(),
            restored_nodes: Vec::new(),
            regenerated_shards: Vec::new(),
            healing_ms: 0,
            active_nodes: 12,
            redundancy_level: "Optimal (1.50x RS(8,4))".to_string(),
        }));
    }

    // 1. Transition nodes to Recovering
    app.inner
        .read()
        .await
        .mesh
        .set_nodes_recovering(&missing_or_corrupt_nodes)
        .await;

    for id in &missing_or_corrupt_nodes {
        app.broadcast(TelemetryEvent::NodeStatusChanged {
            node_id: *id,
            status: NodeStatus::Recovering,
            active_nodes: app.inner.read().await.mesh.get_active_count().await,
        });
    }

    // 2. Ensure all 12 shards are fully populated using reconstruct_and_regenerate
    let _ = reconstruct_and_regenerate(&mut working_shards, manifest.original_size).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Self-healing codec regeneration failed: {}", e),
        )
    })?;

    // 3. Write fresh, regenerated shards back to disk and verify write succeeded BEFORE reviving nodes
    for shard_id in &regenerated_shards {
        let node_id = shard_id + 1;
        let shard_data = working_shards[*shard_id].as_ref().ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Shard {} missing after regeneration", shard_id),
            )
        })?;

        app.inner
            .read()
            .await
            .mesh
            .write_shard(node_id, *shard_id, shard_data, &impairment)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed writing regenerated shard {} to node {}: {}", shard_id, node_id, e),
                )
            })?;

        app.broadcast(TelemetryEvent::ShardRegenerated {
            shard_id: *shard_id,
            target_node_id: node_id,
        });
    }

    // 4. ONLY AFTER disk writes succeed, revive recovered nodes to Online
    let active_nodes = app
        .inner
        .read()
        .await
        .mesh
        .revive_nodes(&missing_or_corrupt_nodes)
        .await;

    for id in &missing_or_corrupt_nodes {
        app.broadcast(TelemetryEvent::NodeStatusChanged {
            node_id: *id,
            status: NodeStatus::Online,
            active_nodes,
        });
    }

    let healing_ms = start.elapsed().as_millis();

    app.broadcast(TelemetryEvent::RedundancyRestored {
        active_nodes: 12,
        healing_ms,
    });

    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "INFO".to_string(),
        code: "REDUNDANCY_RESTORED".to_string(),
        message: format!(
            "Self-healing complete in {}ms. Regenerated {} shards. Network 12/12 restored.",
            healing_ms,
            regenerated_shards.len()
        ),
    });

    {
        let mut state = app.inner.write().await;
        state.last_healing_ms = healing_ms;
        state.cached_shards = working_shards;
        if let Some(m) = &mut state.manifest {
            for shard_id in &regenerated_shards {
                if *shard_id < m.shards.len() {
                    m.shards[*shard_id].is_corrupt = false;
                }
            }
        }
    }

    Ok(Json(HealResponse {
        status: "success".to_string(),
        restored_nodes: missing_or_corrupt_nodes,
        regenerated_shards,
        healing_ms,
        active_nodes: 12,
        redundancy_level: "Optimal (1.50x RS(8,4))".to_string(),
    }))
}

async fn handle_download(State(app): State<AppState>) -> Response {
    let state = app.inner.read().await;
    match (&state.reconstructed_bytes, &state.manifest) {
        (Some(bytes), Some(manifest)) => {
            let lower = manifest.filename.to_lowercase();
            let content_type = if lower.ends_with(".mp4") {
                "video/mp4"
            } else if lower.ends_with(".webm") {
                "video/webm"
            } else if lower.ends_with(".png") {
                "image/png"
            } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
                "image/jpeg"
            } else if lower.ends_with(".gif") {
                "image/gif"
            } else if lower.ends_with(".webp") {
                "image/webp"
            } else if lower.ends_with(".svg") {
                "image/svg+xml"
            } else {
                "application/octet-stream"
            };
            let filename = format!("attachment; filename=\"{}\"", manifest.filename);
            let headers = [
                (header::CONTENT_TYPE, content_type),
                (header::CONTENT_DISPOSITION, &filename),
            ];
            (StatusCode::OK, headers, bytes.clone()).into_response()
        }
        _ => (
            StatusCode::NOT_FOUND,
            "No verified reconstructed file available for download",
        )
            .into_response(),
    }
}

async fn handle_benchmarks_export(State(app): State<AppState>) -> Response {
    let benchmarks = {
        let state = app.inner.read().await;
        state.benchmarks.clone()
    };

    let csv_content = export_benchmarks_csv(&benchmarks);
    let headers = [
        (header::CONTENT_TYPE, "text/csv"),
        (
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"nighthawk_benchmarks.csv\"",
        ),
    ];
    (StatusCode::OK, headers, csv_content).into_response()
}

async fn handle_system_reset(State(app): State<AppState>) -> Json<GenericMessageResponse> {
    {
        let mut state = app.inner.write().await;
        let _ = state.mesh.wipe_all_storage().await;
        state.manifest = None;
        state.impairment = NetworkImpairment::default();
        state.reconstructed_bytes = None;
        state.reconstructed_blake3 = None;
        state.integrity_verified = None;
        state.cached_shards = vec![None; TOTAL_SHARDS];
    }

    app.broadcast(TelemetryEvent::SystemReset);
    app.broadcast(TelemetryEvent::Log {
        timestamp: get_iso_timestamp(),
        level: "INFO".to_string(),
        code: "SYSTEM_RESET".to_string(),
        message: "Network reset to factory baseline: shards wiped, 12 nodes online, impairment cleared.".to_string(),
    });

    Json(GenericMessageResponse {
        status: "success".to_string(),
        message: "Storage mesh cleanly wiped and reset to factory baseline".to_string(),
    })
}

async fn handle_ws_telemetry(ws: WebSocketUpgrade, State(app): State<AppState>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, app))
}

async fn handle_socket(mut socket: WebSocket, app: AppState) {
    let mut rx = app.tx.subscribe();

    // Stream telemetry events to the connected client
    while let Ok(event) = rx.recv().await {
        if let Ok(json_str) = serde_json::to_string(&event) {
            if socket.send(Message::Text(json_str.into())).await.is_err() {
                break;
            }
        }
    }
}
