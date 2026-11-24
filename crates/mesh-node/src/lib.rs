use rand::seq::SliceRandom;
use rand::Rng;
use rand::SeedableRng;
use rand::rngs::StdRng;
use shared::{DropletProgress, NetworkImpairment, NodeInfo, NodeStatus};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;

pub const TOTAL_NODES: usize = 12;

#[derive(Debug, thiserror::Error)]
pub enum MeshError {
    #[error("Node {0} is currently offline")]
    NodeOffline(usize),
    #[error("Node {0} not found")]
    NodeNotFound(usize),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Droplet transfer failed: {0}")]
    DropletFailed(String),
}

#[derive(Clone)]
pub struct MeshManager {
    base_dir: PathBuf,
    nodes: Arc<RwLock<Vec<NodeInfo>>>,
    start_time: Instant,
}

impl MeshManager {
    pub fn new<P: AsRef<Path>>(base_dir: P) -> Self {
        let base_path = base_dir.as_ref().to_path_buf();
        let mut node_list = Vec::with_capacity(TOTAL_NODES);

        for id in 1..=TOTAL_NODES {
            let node_dir = base_path.join(format!("node_{:02}", id));
            let _ = fs::create_dir_all(&node_dir);

            // Deterministic XOR distance metric for Kademlia-inspired routing table
            let xor_dist = format!("0x{:04X}", (id * 0x1337) ^ 0xA5A5);

            node_list.push(NodeInfo {
                node_id: id,
                name: format!("NIGHTHAWK-NODE-{:02}", id),
                address: format!("127.0.0.1:{}", 9000 + id),
                status: NodeStatus::Online,
                shard_id: Some(id - 1),
                uptime_secs: 0,
                bytes_transferred: 0,
                xor_distance: xor_dist,
            });
        }

        Self {
            base_dir: base_path,
            nodes: Arc::new(RwLock::new(node_list)),
            start_time: Instant::now(),
        }
    }

    pub fn node_dir(&self, node_id: usize) -> PathBuf {
        self.base_dir.join(format!("node_{:02}", node_id))
    }

    pub fn shard_file_path(&self, node_id: usize, shard_id: usize) -> PathBuf {
        self.node_dir(node_id).join(format!("shard_{:02}.shard", shard_id))
    }

    pub async fn get_nodes(&self) -> Vec<NodeInfo> {
        let mut list = self.nodes.read().await.clone();
        let elapsed = self.start_time.elapsed().as_secs();
        for node in list.iter_mut() {
            if node.status == NodeStatus::Online || node.status == NodeStatus::Degraded {
                node.uptime_secs = elapsed;
            }
        }
        list
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
        let mut nodes = self.nodes.write().await;
        let node = nodes
            .iter_mut()
            .find(|n| n.node_id == node_id)
            .ok_or(MeshError::NodeNotFound(node_id))?;

        if node.status == NodeStatus::Offline {
            return Err(MeshError::NodeOffline(node_id));
        }

        // Apply latency if configured
        if impairment.latency_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(impairment.latency_ms)).await;
        }

        // Simulate fountain droplet packet transfer
        let droplet_stats = simulate_droplet_transfer(impairment.packet_loss_pct, bytes.len());

        let target_dir = self.node_dir(node_id);
        fs::create_dir_all(&target_dir)?;
        let shard_path = self.shard_file_path(node_id, shard_id);
        fs::write(&shard_path, bytes)?;

        node.bytes_transferred += bytes.len() as u64;
        node.shard_id = Some(shard_id);

        Ok(droplet_stats)
    }

    pub async fn read_shard(
        &self,
        node_id: usize,
        shard_id: usize,
        impairment: &NetworkImpairment,
    ) -> Result<(Vec<u8>, DropletProgress), MeshError> {
        let mut nodes = self.nodes.write().await;
        let node = nodes
            .iter_mut()
            .find(|n| n.node_id == node_id)
            .ok_or(MeshError::NodeNotFound(node_id))?;

        if node.status == NodeStatus::Offline {
            return Err(MeshError::NodeOffline(node_id));
        }

        let shard_path = self.shard_file_path(node_id, shard_id);
        if !shard_path.exists() {
            return Err(MeshError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Shard file {} not found on node {}", shard_id, node_id),
            )));
        }

        if impairment.latency_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(impairment.latency_ms)).await;
        }

        let bytes = fs::read(&shard_path)?;
        let droplet_stats = simulate_droplet_transfer(impairment.packet_loss_pct, bytes.len());

        node.bytes_transferred += bytes.len() as u64;

        Ok((bytes, droplet_stats))
    }

    pub async fn kill_nodes(
        &self,
        count: usize,
        random: bool,
        specific_ids: Option<Vec<usize>>,
    ) -> (Vec<usize>, usize) {
        let mut nodes = self.nodes.write().await;
        let mut killed = Vec::new();

        if let Some(ids) = specific_ids {
            for id in ids {
                if let Some(node) = nodes.iter_mut().find(|n| n.node_id == id) {
                    node.status = NodeStatus::Offline;
                    killed.push(id);
                }
            }
        } else if random {
            let mut online_ids: Vec<usize> = nodes
                .iter()
                .filter(|n| n.status != NodeStatus::Offline)
                .map(|n| n.node_id)
                .collect();
            let mut rng = StdRng::seed_from_u64(count as u64 ^ 0xDEADBEEF);
            online_ids.shuffle(&mut rng);

            for id in online_ids.into_iter().take(count) {
                if let Some(node) = nodes.iter_mut().find(|n| n.node_id == id) {
                    node.status = NodeStatus::Offline;
                    killed.push(id);
                }
            }
        } else {
            // Sequential kill starting from node 1
            for node in nodes
                .iter_mut()
                .filter(|n| n.status != NodeStatus::Offline)
                .take(count)
            {
                node.status = NodeStatus::Offline;
                killed.push(node.node_id);
            }
        }

        let active = nodes
            .iter()
            .filter(|n| n.status != NodeStatus::Offline)
            .count();
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

    pub async fn revive_all_nodes(&self) -> usize {
        let mut nodes = self.nodes.write().await;
        for node in nodes.iter_mut() {
            node.status = NodeStatus::Online;
        }
        nodes.len()
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

        let mut nodes = self.nodes.write().await;
        for node in nodes.iter_mut() {
            node.status = NodeStatus::Online;
            node.bytes_transferred = 0;
            node.shard_id = Some(node.node_id - 1);
        }

        Ok(())
    }
}

/// Models simplified fountain-droplet forward error correction:
/// Splits the payload into $K$ source packets, generates rateless coded droplets,
/// and measures survival against simulated packet loss (up to 50%).
pub fn simulate_droplet_transfer(packet_loss_pct: f64, payload_size: usize) -> DropletProgress {
    let base_packets = (payload_size / 65536).clamp(10, 50);
    let loss_ratio = (packet_loss_pct / 100.0).clamp(0.0, 0.50);

    let mut rng = StdRng::seed_from_u64((payload_size as u64) ^ ((packet_loss_pct * 1000.0) as u64) ^ 0xCAFEBABE);

    // In a rateless fountain code, sender continues transmitting coded droplets until receiver collects base_packets
    let mut sent_droplets = 0;
    let mut received_droplets = 0;
    let mut lost_droplets = 0;

    while received_droplets < base_packets {
        sent_droplets += 1;
        if loss_ratio > 0.0 && rng.gen_bool(loss_ratio) {
            lost_droplets += 1;
        } else {
            received_droplets += 1;
        }
    }

    DropletProgress {
        packet_loss_pct,
        sent_droplets,
        lost_droplets,
        received_droplets,
        decoded: true,
    }
}
