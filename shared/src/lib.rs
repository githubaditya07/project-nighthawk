use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeStatus {
    Online,
    Offline,
    Degraded,
    Recovering,
}

impl Default for NodeStatus {
    fn default() -> Self {
        NodeStatus::Online
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ShardKind {
    Data,
    Parity,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ShardMeta {
    pub shard_id: usize,
    pub kind: ShardKind,
    pub size_bytes: usize,
    pub blake3_hash: String,
    pub node_id: usize,
    pub is_corrupt: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NodeInfo {
    pub node_id: usize,
    pub name: String,
    pub address: String,
    pub status: NodeStatus,
    pub shard_id: Option<usize>,
    pub uptime_secs: u64,
    pub bytes_transferred: u64,
    pub xor_distance: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileManifest {
    pub file_id: String,
    pub filename: String,
    pub original_size: usize,
    pub original_blake3: String,
    pub merkle_root: String,
    pub storage_overhead: f64,
    pub shards: Vec<ShardMeta>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NetworkImpairment {
    pub packet_loss_pct: f64,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DropletProgress {
    pub packet_loss_pct: f64,
    pub sent_droplets: usize,
    pub lost_droplets: usize,
    pub received_droplets: usize,
    pub decoded: bool,
}

impl Default for NetworkImpairment {
    fn default() -> Self {
        Self {
            packet_loss_pct: 0.0,
            latency_ms: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BenchmarkRun {
    pub run_id: usize,
    pub timestamp: String,
    pub scenario: String,
    pub file_size_bytes: usize,
    pub storage_overhead: f64,
    pub encode_ms: u128,
    pub detection_ms: u128,
    pub reconstruction_ms: u128,
    pub healing_ms: u128,
    pub packet_loss_pct: f64,
    pub bandwidth_efficiency: f64,
    pub fault_tolerance: String,
    pub integrity_verified: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SystemSnapshot {
    pub nodes: Vec<NodeInfo>,
    pub manifest: Option<FileManifest>,
    pub impairment: NetworkImpairment,
    pub active_nodes: usize,
    pub redundancy_level: String,
    pub benchmarks: Vec<BenchmarkRun>,
    pub reconstructed_blake3: Option<String>,
    pub integrity_verified: Option<bool>,
    pub can_download: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum TelemetryEvent {
    Log {
        timestamp: String,
        level: String,
        code: String,
        message: String,
    },
    FileEncoded {
        manifest: FileManifest,
        encode_ms: u128,
    },
    ShardDistributed {
        shard_id: usize,
        node_id: usize,
        size_bytes: usize,
    },
    NodeStatusChanged {
        node_id: usize,
        status: NodeStatus,
        active_nodes: usize,
    },
    RedundancyDegraded {
        surviving_shards: usize,
        required_shards: usize,
    },
    CorruptedShardRejected {
        node_id: usize,
        shard_id: usize,
        expected_hash: String,
        actual_hash: String,
    },
    ReconstructionStarted {
        surviving_shard_ids: Vec<usize>,
    },
    IntegrityVerified {
        original_blake3: String,
        reconstructed_blake3: String,
        matched: bool,
        reconstruction_ms: u128,
    },
    ShardRegenerated {
        shard_id: usize,
        target_node_id: usize,
    },
    RedundancyRestored {
        active_nodes: usize,
        healing_ms: u128,
    },
    DropletProgress {
        packet_loss_pct: f64,
        sent_droplets: usize,
        lost_droplets: usize,
        received_droplets: usize,
        decoded: bool,
    },
    MetricsUpdate {
        benchmark: BenchmarkRun,
    },
    SystemReset,
}
