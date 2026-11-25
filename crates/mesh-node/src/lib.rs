use chaos_crypto::{corrupt_shard_file_on_disk, format_hex_preview, hash_bytes};
use rand::rngs::StdRng;
use rand::seq::SliceRandom;
use rand::Rng;
use rand::SeedableRng;
use serde::{Deserialize, Serialize};
use shared::{DropletProgress, NetworkImpairment, NodeInfo, NodeStatus};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::RwLock;

pub const TOTAL_NODES: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInspectResponse {
    pub node_id: usize,
    pub file_path: String,
    pub exists_on_disk: bool,
    pub size_bytes: usize,
    pub hex_preview: String,
    pub blake3_hash: String,
}

#[derive(Debug, thiserror::Error)]
pub enum MeshError {
    #[error("Node {0} is currently unavailable (offline)")]
    NodeUnavailable(usize),
    #[error("Node {0} not found")]
    NodeNotFound(usize),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Droplet transfer failed: {0}")]
    DropletFailed(String),
    #[error("Remote worker HTTP error: {0}")]
    RemoteError(String),
}

/// Parses comma-separated `NIGHTHAWK_NODE_URLS` env var into up to 12 optional base URLs.
pub fn parse_remote_urls_from_env() -> Vec<Option<String>> {
    let mut urls = vec![None; TOTAL_NODES];
    if let Ok(raw) = std::env::var("NIGHTHAWK_NODE_URLS") {
        for (idx, part) in raw.split(',').enumerate() {
            if idx >= TOTAL_NODES {
                break;
            }
            let trimmed = part.trim().trim_end_matches('/');
            if !trimmed.is_empty() {
                urls[idx] = Some(trimmed.to_string());
            }
        }
    }
    urls
}

/// Pure-Tokio lightweight HTTP/1.1 client for communicating with remote LAN workers (`http://IP:PORT`).
async fn remote_http_call(
    method: &str,
    base_url: &str,
    path: &str,
    body: Option<&[u8]>,
) -> Result<(u16, Vec<u8>), MeshError> {
    let without_scheme = base_url
        .strip_prefix("http://")
        .or_else(|| base_url.strip_prefix("https://"))
        .unwrap_or(base_url);

    let (host_port, base_path) = match without_scheme.find('/') {
        Some(pos) => (&without_scheme[..pos], &without_scheme[pos..]),
        None => (without_scheme, ""),
    };

    let full_path = format!("{}{}", base_path.trim_end_matches('/'), path);
    let payload = body.unwrap_or(&[]);

    let connect_fut = TcpStream::connect(host_port);
    let mut stream = tokio::time::timeout(Duration::from_secs(4), connect_fut)
        .await
        .map_err(|_| MeshError::RemoteError(format!("Timeout connecting to {}", host_port)))?
        .map_err(|e| MeshError::RemoteError(format!("Connect {} failed: {}", host_port, e)))?;

    let req_head = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        method,
        full_path,
        host_port,
        payload.len()
    );

    stream
        .write_all(req_head.as_bytes())
        .await
        .map_err(|e| MeshError::RemoteError(format!("Write header failed: {}", e)))?;
    if !payload.is_empty() {
        stream
            .write_all(payload)
            .await
            .map_err(|e| MeshError::RemoteError(format!("Write body failed: {}", e)))?;
    }
    stream
        .flush()
        .await
        .map_err(|e| MeshError::RemoteError(format!("Flush failed: {}", e)))?;

    let mut raw_resp = Vec::new();
    tokio::time::timeout(Duration::from_secs(15), stream.read_to_end(&mut raw_resp))
        .await
        .map_err(|_| MeshError::RemoteError(format!("Timeout reading from {}", host_port)))?
        .map_err(|e| MeshError::RemoteError(format!("Read response failed: {}", e)))?;

    let header_end = raw_resp
        .windows(4)
        .position(|w| w == b"\r\n\r\n")
        .ok_or_else(|| MeshError::RemoteError("Malformed HTTP response".to_string()))?;

    let headers_str = String::from_utf8_lossy(&raw_resp[..header_end]);
    let status_line = headers_str.lines().next().unwrap_or("");
    let status_code: u16 = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(500);

    let raw_body = &raw_resp[header_end + 4..];
    let is_chunked = headers_str
        .lines()
        .any(|l| l.to_ascii_lowercase().starts_with("transfer-encoding:") && l.to_ascii_lowercase().contains("chunked"));

    let body_bytes = if is_chunked {
        decode_chunked(raw_body)
    } else {
        raw_body.to_vec()
    };

    Ok((status_code, body_bytes))
}

fn decode_chunked(input: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut pos = 0;
    while pos < input.len() {
        let line_end = match input[pos..].windows(2).position(|w| w == b"\r\n") {
            Some(rel) => pos + rel,
            None => break,
        };
        let size_str = String::from_utf8_lossy(&input[pos..line_end]);
        let size_hex = size_str.split(';').next().unwrap_or("").trim();
        let chunk_len = match usize::from_str_radix(size_hex, 16) {
            Ok(0) | Err(_) => break,
            Ok(n) => n,
        };
        let data_start = line_end + 2;
        let data_end = (data_start + chunk_len).min(input.len());
        out.extend_from_slice(&input[data_start..data_end]);
        pos = (data_end + 2).min(input.len());
    }
    out
}

#[derive(Clone)]
pub struct MeshManager {
    base_dir: PathBuf,
    remote_urls: Vec<Option<String>>,
    nodes: Arc<RwLock<Vec<NodeInfo>>>,
    online_since: Arc<RwLock<Vec<Option<Instant>>>>,
    auto_heal: Arc<AtomicBool>,
}

impl MeshManager {
    pub fn new<P: AsRef<Path>>(base_dir: P) -> Self {
        Self::with_remote_urls(base_dir, parse_remote_urls_from_env())
    }

    pub fn with_remote_urls<P: AsRef<Path>>(base_dir: P, mut remote_urls: Vec<Option<String>>) -> Self {
        remote_urls.resize(TOTAL_NODES, None);
        let base_path = base_dir.as_ref().to_path_buf();
        let mut node_list = Vec::with_capacity(TOTAL_NODES);
        let mut uptime_list = Vec::with_capacity(TOTAL_NODES);
        let now = Instant::now();

        for id in 1..=TOTAL_NODES {
            let node_dir = base_path.join(format!("node_{:02}", id));
            let _ = fs::create_dir_all(&node_dir);

            let xor_dist = format!("0x{:04X}", (id * 0x1337) ^ 0xA5A5);
            let address = match &remote_urls[id - 1] {
                Some(url) => url
                    .strip_prefix("http://")
                    .or_else(|| url.strip_prefix("https://"))
                    .unwrap_or(url)
                    .to_string(),
                None => format!("127.0.0.1:{}", 9000 + id),
            };

            node_list.push(NodeInfo {
                node_id: id,
                name: format!("NIGHTHAWK-NODE-{:02}", id),
                address,
                status: NodeStatus::Online,
                shard_id: Some(id - 1),
                uptime_secs: 0,
                bytes_transferred: 0,
                xor_distance: xor_dist,
            });
            uptime_list.push(Some(now));
        }

        Self {
            base_dir: base_path,
            remote_urls,
            nodes: Arc::new(RwLock::new(node_list)),
            online_since: Arc::new(RwLock::new(uptime_list)),
            auto_heal: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn remote_url(&self, node_id: usize) -> Option<&str> {
        self.remote_urls
            .get(node_id.saturating_sub(1))
            .and_then(|opt| opt.as_deref())
    }

    pub fn node_dir(&self, node_id: usize) -> PathBuf {
        self.base_dir.join(format!("node_{:02}", node_id))
    }

    pub fn shard_file_path(&self, node_id: usize, shard_id: usize) -> PathBuf {
        self.node_dir(node_id).join(format!("shard_{:02}.shard", shard_id))
    }

    pub async fn get_nodes(&self) -> Vec<NodeInfo> {
        let mut list = self.nodes.read().await.clone();
        let uptimes = self.online_since.read().await;

        for node in list.iter_mut() {
            let idx = node.node_id.saturating_sub(1);
            if node.status == NodeStatus::Online || node.status == NodeStatus::Degraded {
                node.uptime_secs = uptimes
                    .get(idx)
                    .and_then(|opt| *opt)
                    .map(|t| t.elapsed().as_secs())
                    .unwrap_or(0);
            } else {
                node.uptime_secs = 0;
            }
        }
        list
    }

    pub async fn get_node(&self, node_id: usize) -> Result<NodeInfo, MeshError> {
        let nodes = self.nodes.read().await;
        let mut node = nodes
            .iter()
            .find(|n| n.node_id == node_id)
            .cloned()
            .ok_or(MeshError::NodeNotFound(node_id))?;

        let uptimes = self.online_since.read().await;
        let idx = node_id.saturating_sub(1);
        if node.status == NodeStatus::Online || node.status == NodeStatus::Degraded {
            node.uptime_secs = uptimes
                .get(idx)
                .and_then(|opt| *opt)
                .map(|t| t.elapsed().as_secs())
                .unwrap_or(0);
        } else {
            node.uptime_secs = 0;
        }

        Ok(node)
    }

    pub async fn get_active_count(&self) -> usize {
        let nodes = self.nodes.read().await;
        nodes
            .iter()
            .filter(|n| n.status != NodeStatus::Offline)
            .count()
    }

    pub async fn write_shard(
        &self,
        node_id: usize,
        shard_id: usize,
        bytes: &[u8],
        impairment: &NetworkImpairment,
    ) -> Result<DropletProgress, MeshError> {
        // 1. Brief read lock to validate node existence and status
        let (target_dir, shard_path, remote) = {
            let nodes = self.nodes.read().await;
            let node = nodes
                .iter()
                .find(|n| n.node_id == node_id)
                .ok_or(MeshError::NodeNotFound(node_id))?;

            if node.status == NodeStatus::Offline {
                return Err(MeshError::NodeUnavailable(node_id));
            }

            (
                self.node_dir(node_id),
                self.shard_file_path(node_id, shard_id),
                self.remote_url(node_id).map(|s| s.to_string()),
            )
        };

        // 2. Simulated network latency sleep outside of any lock
        if impairment.latency_ms > 0 {
            tokio::time::sleep(Duration::from_millis(impairment.latency_ms)).await;
        }

        // 3. Simulate fountain droplet packet transfer
        let droplet_stats = simulate_droplet_transfer(impairment.packet_loss_pct, bytes.len());

        // 4. Write to remote LAN worker OR local filesystem outside locks
        if let Some(url) = remote {
            let (status, resp) =
                remote_http_call("PUT", &url, &format!("/shard/{}", shard_id), Some(bytes)).await?;
            if status == 503 {
                return Err(MeshError::NodeUnavailable(node_id));
            }
            if status >= 400 {
                return Err(MeshError::RemoteError(format!(
                    "PUT /shard/{} returned {}: {}",
                    shard_id,
                    status,
                    String::from_utf8_lossy(&resp)
                )));
            }
        } else {
            fs::create_dir_all(&target_dir)?;
            fs::write(&shard_path, bytes)?;
        }

        // 5. Brief write lock only to record bytes transferred and shard mapping
        {
            let mut nodes = self.nodes.write().await;
            if let Some(node) = nodes.iter_mut().find(|n| n.node_id == node_id) {
                if node.status == NodeStatus::Offline {
                    return Err(MeshError::NodeUnavailable(node_id));
                }
                node.bytes_transferred += bytes.len() as u64;
                node.shard_id = Some(shard_id);
            }
        }

        Ok(droplet_stats)
    }

    pub async fn read_shard(
        &self,
        node_id: usize,
        shard_id: usize,
        impairment: &NetworkImpairment,
    ) -> Result<(Vec<u8>, DropletProgress), MeshError> {
        let (shard_path, remote) = {
            let nodes = self.nodes.read().await;
            let node = nodes
                .iter()
                .find(|n| n.node_id == node_id)
                .ok_or(MeshError::NodeNotFound(node_id))?;

            if node.status == NodeStatus::Offline {
                return Err(MeshError::NodeUnavailable(node_id));
            }

            (
                self.shard_file_path(node_id, shard_id),
                self.remote_url(node_id).map(|s| s.to_string()),
            )
        };

        if impairment.latency_ms > 0 {
            tokio::time::sleep(Duration::from_millis(impairment.latency_ms)).await;
        }

        let bytes = if let Some(url) = remote {
            let (status, resp) =
                remote_http_call("GET", &url, &format!("/shard/{}", shard_id), None).await?;
            if status == 503 {
                return Err(MeshError::NodeUnavailable(node_id));
            }
            if status == 404 {
                return Err(MeshError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("Shard file {} not found on remote node {}", shard_id, node_id),
                )));
            }
            if status >= 400 {
                return Err(MeshError::RemoteError(format!(
                    "GET /shard/{} returned {}",
                    shard_id, status
                )));
            }
            resp
        } else {
            if !shard_path.exists() {
                return Err(MeshError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("Shard file {} not found on node {}", shard_id, node_id),
                )));
            }
            fs::read(&shard_path)?
        };

        let droplet_stats = simulate_droplet_transfer(impairment.packet_loss_pct, bytes.len());

        {
            let mut nodes = self.nodes.write().await;
            if let Some(node) = nodes.iter_mut().find(|n| n.node_id == node_id) {
                node.bytes_transferred += bytes.len() as u64;
            }
        }

        Ok((bytes, droplet_stats))
    }

    /// Corrupts physical `.shard` file either via remote LAN worker or local disk.
    pub async fn corrupt_node_shard(&self, node_id: usize, shard_id: usize) -> Result<(), String> {
        if let Some(url) = self.remote_url(node_id).map(|s| s.to_string()) {
            let (status, resp) =
                remote_http_call("POST", &url, &format!("/corrupt/{}", shard_id), None)
                    .await
                    .map_err(|e| e.to_string())?;
            if status >= 400 {
                return Err(format!(
                    "Remote corrupt failed ({}): {}",
                    status,
                    String::from_utf8_lossy(&resp)
                ));
            }
            return Ok(());
        }

        let shard_path = self.shard_file_path(node_id, shard_id);
        if !shard_path.exists() {
            return Err(format!("Shard file for node {} does not exist", node_id));
        }
        corrupt_shard_file_on_disk(&shard_path)
    }

    /// Inspects live disk `.shard` bytes (first 64 bytes hex preview + Blake3 hash) locally or via LAN worker.
    pub async fn inspect_node(&self, node_id: usize) -> Result<NodeInspectResponse, MeshError> {
        let shard_id = {
            let nodes = self.nodes.read().await;
            let node = nodes
                .iter()
                .find(|n| n.node_id == node_id)
                .ok_or(MeshError::NodeNotFound(node_id))?;
            node.shard_id.unwrap_or(node_id.saturating_sub(1))
        };

        if let Some(url) = self.remote_url(node_id).map(|s| s.to_string()) {
            let (status, resp) =
                remote_http_call("GET", &url, &format!("/hex/{}", shard_id), None).await?;
            if status >= 400 {
                return Err(MeshError::RemoteError(format!(
                    "Remote GET /hex/{} returned {}",
                    shard_id, status
                )));
            }
            let parsed: NodeInspectResponse = serde_json::from_slice(&resp)
                .map_err(|e| MeshError::RemoteError(format!("Invalid inspect JSON: {}", e)))?;
            return Ok(parsed);
        }

        let path = self.shard_file_path(node_id, shard_id);
        let path_str = path.to_string_lossy().to_string();

        if !path.exists() {
            return Ok(NodeInspectResponse {
                node_id,
                file_path: path_str,
                exists_on_disk: false,
                size_bytes: 0,
                hex_preview: String::new(),
                blake3_hash: String::new(),
            });
        }

        let bytes = fs::read(&path)?;
        let hex_preview = format_hex_preview(&bytes, 64);
        let blake3_hash = hash_bytes(&bytes);

        Ok(NodeInspectResponse {
            node_id,
            file_path: path_str,
            exists_on_disk: true,
            size_bytes: bytes.len(),
            hex_preview,
            blake3_hash,
        })
    }

    pub async fn kill_nodes(
        &self,
        count: usize,
        random: bool,
        specific_ids: Option<Vec<usize>>,
    ) -> (Vec<usize>, usize) {
        let (killed, active) = {
            let mut nodes = self.nodes.write().await;
            let mut uptimes = self.online_since.write().await;
            let mut killed = Vec::new();

            if let Some(ids) = specific_ids {
                for id in ids {
                    if let Some(node) = nodes.iter_mut().find(|n| n.node_id == id) {
                        if node.status != NodeStatus::Offline {
                            node.status = NodeStatus::Offline;
                            if let Some(slot) = uptimes.get_mut(id.saturating_sub(1)) {
                                *slot = None;
                            }
                            killed.push(id);
                        }
                    }
                }
            } else if random {
                let mut online_ids: Vec<usize> = nodes
                    .iter()
                    .filter(|n| n.status != NodeStatus::Offline)
                    .map(|n| n.node_id)
                    .collect();
                let seed = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_nanos() as u64)
                    .unwrap_or(0)
                    ^ (count as u64)
                    ^ 0xDEADBEEF;
                let mut rng = StdRng::seed_from_u64(seed);
                online_ids.shuffle(&mut rng);

                for id in online_ids.into_iter().take(count) {
                    if let Some(node) = nodes.iter_mut().find(|n| n.node_id == id) {
                        node.status = NodeStatus::Offline;
                        if let Some(slot) = uptimes.get_mut(id.saturating_sub(1)) {
                            *slot = None;
                        }
                        killed.push(id);
                    }
                }
            } else {
                for node in nodes
                    .iter_mut()
                    .filter(|n| n.status != NodeStatus::Offline)
                    .take(count)
                {
                    node.status = NodeStatus::Offline;
                    let id = node.node_id;
                    if let Some(slot) = uptimes.get_mut(id.saturating_sub(1)) {
                        *slot = None;
                    }
                    killed.push(id);
                }
            }

            let active = nodes
                .iter()
                .filter(|n| n.status != NodeStatus::Offline)
                .count();
            (killed, active)
        };

        // Notify any remote LAN workers
        for id in &killed {
            if let Some(url) = self.remote_url(*id).map(|s| s.to_string()) {
                let _ = remote_http_call("POST", &url, "/kill", None).await;
            }
        }

        (killed, active)
    }

    pub async fn mark_node_degraded(&self, node_id: usize) -> Result<(), MeshError> {
        let mut nodes = self.nodes.write().await;
        let node = nodes
            .iter_mut()
            .find(|n| n.node_id == node_id)
            .ok_or(MeshError::NodeNotFound(node_id))?;
        node.status = NodeStatus::Degraded;
        Ok(())
    }

    pub async fn revive_node(&self, node_id: usize) -> Result<usize, MeshError> {
        let active = {
            let mut nodes = self.nodes.write().await;
            let mut uptimes = self.online_since.write().await;

            let node = nodes
                .iter_mut()
                .find(|n| n.node_id == node_id)
                .ok_or(MeshError::NodeNotFound(node_id))?;

            node.status = NodeStatus::Online;
            if let Some(slot) = uptimes.get_mut(node_id.saturating_sub(1)) {
                *slot = Some(Instant::now());
            }

            nodes
                .iter()
                .filter(|n| n.status != NodeStatus::Offline)
                .count()
        };

        if let Some(url) = self.remote_url(node_id).map(|s| s.to_string()) {
            let _ = remote_http_call("POST", &url, "/revive", None).await;
        }

        Ok(active)
    }

    pub async fn revive_nodes(&self, node_ids: &[usize]) -> usize {
        let active = {
            let mut nodes = self.nodes.write().await;
            let mut uptimes = self.online_since.write().await;
            let now = Instant::now();

            for id in node_ids {
                if let Some(node) = nodes.iter_mut().find(|n| n.node_id == *id) {
                    node.status = NodeStatus::Online;
                    if let Some(slot) = uptimes.get_mut(id.saturating_sub(1)) {
                        *slot = Some(now);
                    }
                }
            }

            nodes
                .iter()
                .filter(|n| n.status != NodeStatus::Offline)
                .count()
        };

        for id in node_ids {
            if let Some(url) = self.remote_url(*id).map(|s| s.to_string()) {
                let _ = remote_http_call("POST", &url, "/revive", None).await;
            }
        }

        active
    }

    pub async fn revive_all_nodes(&self) -> usize {
        let len = {
            let mut nodes = self.nodes.write().await;
            let mut uptimes = self.online_since.write().await;
            let now = Instant::now();

            for (i, node) in nodes.iter_mut().enumerate() {
                node.status = NodeStatus::Online;
                if let Some(slot) = uptimes.get_mut(i) {
                    *slot = Some(now);
                }
            }
            nodes.len()
        };

        for id in 1..=TOTAL_NODES {
            if let Some(url) = self.remote_url(id).map(|s| s.to_string()) {
                let _ = remote_http_call("POST", &url, "/revive", None).await;
            }
        }

        len
    }

    pub async fn set_nodes_recovering(&self, node_ids: &[usize]) {
        let mut nodes = self.nodes.write().await;
        for id in node_ids {
            if let Some(node) = nodes.iter_mut().find(|n| n.node_id == *id) {
                node.status = NodeStatus::Recovering;
            }
        }
    }

    pub async fn wipe_all_storage(&self) -> Result<(), std::io::Error> {
        for id in 1..=TOTAL_NODES {
            if let Some(url) = self.remote_url(id).map(|s| s.to_string()) {
                let _ = remote_http_call("POST", &url, "/wipe", None).await;
            }
            let dir = self.node_dir(id);
            if dir.exists() {
                for entry in fs::read_dir(&dir)? {
                    let entry = entry?;
                    if entry.path().extension().and_then(|s| s.to_str()) == Some("shard") {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }

        let now = Instant::now();
        let mut nodes = self.nodes.write().await;
        let mut uptimes = self.online_since.write().await;

        for (i, node) in nodes.iter_mut().enumerate() {
            node.status = NodeStatus::Online;
            node.bytes_transferred = 0;
            node.shard_id = Some(node.node_id - 1);
            if let Some(slot) = uptimes.get_mut(i) {
                *slot = Some(now);
            }
        }

        Ok(())
    }

    pub fn set_auto_heal(&self, enabled: bool) {
        self.auto_heal.store(enabled, Ordering::SeqCst);
    }

    pub fn is_auto_heal(&self) -> bool {
        self.auto_heal.load(Ordering::SeqCst)
    }

    pub async fn check_mesh_health(&self) -> Vec<usize> {
        let nodes = self.nodes.read().await;
        nodes
            .iter()
            .filter(|n| n.status != NodeStatus::Online)
            .map(|n| n.node_id)
            .collect()
    }

    pub fn spawn_self_healing_watcher<F, Fut>(
        &self,
        interval: Duration,
        heal_callback: F,
    ) -> tokio::task::JoinHandle<()>
    where
        F: Fn() -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send + 'static,
    {
        let mesh = self.clone();
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            loop {
                ticker.tick().await;
                if mesh.is_auto_heal() {
                    let unhealthy = mesh.check_mesh_health().await;
                    if !unhealthy.is_empty() {
                        heal_callback().await;
                    }
                }
            }
        })
    }
}

/// Models simplified fountain-droplet forward error correction.
pub fn simulate_droplet_transfer(packet_loss_pct: f64, payload_size: usize) -> DropletProgress {
    let base_packets = (payload_size / 65536).clamp(10, 50);
    let loss_ratio = (packet_loss_pct / 100.0).clamp(0.0, 1.0);
    let max_droplets = base_packets * 8;

    let mut rng = StdRng::seed_from_u64(
        (payload_size as u64) ^ ((packet_loss_pct * 1000.0) as u64) ^ 0xCAFEBABE,
    );

    let mut sent_droplets = 0;
    let mut received_droplets = 0;
    let mut lost_droplets = 0;

    while received_droplets < base_packets && sent_droplets < max_droplets {
        sent_droplets += 1;
        if loss_ratio > 0.0 && rng.gen_bool(loss_ratio) {
            lost_droplets += 1;
        } else {
            received_droplets += 1;
        }
    }

    let decoded = received_droplets >= base_packets;

    DropletProgress {
        packet_loss_pct,
        sent_droplets,
        lost_droplets,
        received_droplets,
        decoded,
    }
}
