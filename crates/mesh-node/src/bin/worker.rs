use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use chaos_crypto::{corrupt_shard_file_on_disk, format_hex_preview, hash_bytes};
use mesh_node::NodeInspectResponse;
use serde::Serialize;
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};

#[derive(Clone)]
struct WorkerState {
    node_id: usize,
    port: u16,
    is_alive: Arc<AtomicBool>,
    node_dir: PathBuf,
    started_at: Instant,
}

#[derive(Serialize)]
struct HealthResponse {
    node_id: usize,
    status: String,
    port: u16,
    uptime_secs: u64,
}

#[derive(Serialize)]
struct StatusResponse {
    node_id: usize,
    status: String,
}

#[derive(Serialize)]
struct PutShardResponse {
    status: String,
    shard_id: usize,
    size_bytes: usize,
}

fn parse_cli_args() -> (usize, u16) {
    let args: Vec<String> = std::env::args().collect();
    let mut id: Option<usize> = None;
    let mut port: Option<u16> = None;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--id" => {
                if i + 1 < args.len() {
                    id = args[i + 1].parse().ok();
                    i += 1;
                }
            }
            "--port" => {
                if i + 1 < args.len() {
                    port = args[i + 1].parse().ok();
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }

    let resolved_id = id.unwrap_or(1).clamp(1, 12);
    let resolved_port = port.unwrap_or((9000 + resolved_id) as u16);
    (resolved_id, resolved_port)
}

#[tokio::main]
async fn main() {
    let (node_id, port) = parse_cli_args();

    let base_data_dir = std::env::var("NIGHTHAWK_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./data"));
    let node_dir = base_data_dir.join(format!("node_{:02}", node_id));
    fs::create_dir_all(&node_dir).expect("Failed to create worker data directory");

    let state = WorkerState {
        node_id,
        port,
        is_alive: Arc::new(AtomicBool::new(true)),
        node_dir: node_dir.clone(),
        started_at: Instant::now(),
    };

    let app = Router::new()
        .route("/health", get(handle_health))
        .route("/shard/{shard_id}", put(handle_put_shard))
        .route("/shard/{shard_id}", get(handle_get_shard))
        .route("/hex/{shard_id}", get(handle_hex))
        .route("/kill", post(handle_kill))
        .route("/revive", post(handle_revive))
        .route("/corrupt/{shard_id}", post(handle_corrupt))
        .route("/wipe", post(handle_wipe))
        .layer(DefaultBodyLimit::max(64 * 1024 * 1024))
        .with_state(state);

    let bind_addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .unwrap_or_else(|e| panic!("Worker {} failed to bind to {}: {}", node_id, bind_addr, e));

    println!("============================================================");
    println!("  NIGHTHAWK STORAGE WORKER NODE-{:02} READY", node_id);
    println!("  Listening on http://{}", bind_addr);
    println!("  Disk Vault: {}", node_dir.display());
    println!("============================================================");

    axum::serve(listener, app).await.unwrap();
}

async fn handle_health(State(state): State<WorkerState>) -> impl IntoResponse {
    let alive = state.is_alive.load(Ordering::SeqCst);
    Json(HealthResponse {
        node_id: state.node_id,
        status: if alive { "Online".to_string() } else { "Offline".to_string() },
        port: state.port,
        uptime_secs: if alive { state.started_at.elapsed().as_secs() } else { 0 },
    })
}

async fn handle_put_shard(
    Path(shard_id): Path<usize>,
    State(state): State<WorkerState>,
    body: Bytes,
) -> impl IntoResponse {
    if !state.is_alive.load(Ordering::SeqCst) {
        return (StatusCode::SERVICE_UNAVAILABLE, "Worker node is Offline").into_response();
    }

    let path = state.node_dir.join(format!("shard_{:02}.shard", shard_id));
    if let Err(e) = fs::write(&path, &body) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write shard: {}", e),
        )
            .into_response();
    }

    Json(PutShardResponse {
        status: "ok".to_string(),
        shard_id,
        size_bytes: body.len(),
    })
    .into_response()
}

async fn handle_get_shard(
    Path(shard_id): Path<usize>,
    State(state): State<WorkerState>,
) -> impl IntoResponse {
    if !state.is_alive.load(Ordering::SeqCst) {
        return (StatusCode::SERVICE_UNAVAILABLE, "Worker node is Offline").into_response();
    }

    let path = state.node_dir.join(format!("shard_{:02}.shard", shard_id));
    if !path.exists() {
        return (StatusCode::NOT_FOUND, "Shard not found").into_response();
    }

    match fs::read(&path) {
        Ok(bytes) => (StatusCode::OK, bytes).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read shard: {}", e),
        )
            .into_response(),
    }
}

async fn handle_hex(
    Path(shard_id): Path<usize>,
    State(state): State<WorkerState>,
) -> impl IntoResponse {
    let path = state.node_dir.join(format!("shard_{:02}.shard", shard_id));
    let path_str = path.to_string_lossy().to_string();

    if !path.exists() {
        return Json(NodeInspectResponse {
            node_id: state.node_id,
            file_path: path_str,
            exists_on_disk: false,
            size_bytes: 0,
            hex_preview: String::new(),
            blake3_hash: String::new(),
        })
        .into_response();
    }

    match fs::read(&path) {
        Ok(bytes) => Json(NodeInspectResponse {
            node_id: state.node_id,
            file_path: path_str,
            exists_on_disk: true,
            size_bytes: bytes.len(),
            hex_preview: format_hex_preview(&bytes, 64),
            blake3_hash: hash_bytes(&bytes),
        })
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to inspect shard: {}", e),
        )
            .into_response(),
    }
}

async fn handle_kill(State(state): State<WorkerState>) -> impl IntoResponse {
    state.is_alive.store(false, Ordering::SeqCst);
    Json(StatusResponse {
        node_id: state.node_id,
        status: "Offline".to_string(),
    })
}

async fn handle_revive(State(state): State<WorkerState>) -> impl IntoResponse {
    state.is_alive.store(true, Ordering::SeqCst);
    Json(StatusResponse {
        node_id: state.node_id,
        status: "Online".to_string(),
    })
}

async fn handle_corrupt(
    Path(shard_id): Path<usize>,
    State(state): State<WorkerState>,
) -> impl IntoResponse {
    let path = state.node_dir.join(format!("shard_{:02}.shard", shard_id));
    if !path.exists() {
        return (StatusCode::NOT_FOUND, "Shard not found").into_response();
    }

    match corrupt_shard_file_on_disk(&path) {
        Ok(()) => Json(StatusResponse {
            node_id: state.node_id,
            status: "Degraded".to_string(),
        })
        .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_wipe(State(state): State<WorkerState>) -> impl IntoResponse {
    if state.node_dir.exists() {
        if let Ok(entries) = fs::read_dir(&state.node_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().and_then(|s| s.to_str()) == Some("shard") {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
    }
    state.is_alive.store(true, Ordering::SeqCst);
    Json(StatusResponse {
        node_id: state.node_id,
        status: "Online".to_string(),
    })
}
