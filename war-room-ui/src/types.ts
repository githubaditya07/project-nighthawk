export type NodeStatus = 'Online' | 'Offline' | 'Degraded' | 'Recovering';

export type ShardKind = 'Data' | 'Parity';

export interface ShardMeta {
  shard_id: number;
  kind: ShardKind;
  size_bytes: number;
  blake3_hash: string;
  node_id: number;
  is_corrupt: boolean;
}

export interface NodeInfo {
  node_id: number;
  name: string;
  address: string;
  status: NodeStatus;
  shard_id: number | null;
  uptime_secs: number;
  bytes_transferred: number;
  xor_distance: string;
}

export interface FileManifest {
  file_id: string;
  filename: string;
  original_size: number;
  original_blake3: string;
  merkle_root: string;
  storage_overhead: number;
  shards: ShardMeta[];
}

export interface NetworkImpairment {
  packet_loss_pct: number;
  latency_ms: number;
}

export interface BenchmarkRun {
  run_id: number;
  timestamp: string;
  scenario: string;
  file_size_bytes: number;
  storage_overhead: number;
  encode_ms: number;
  detection_ms: number;
  reconstruction_ms: number;
  healing_ms: number;
  packet_loss_pct: number;
  bandwidth_efficiency: number;
  fault_tolerance: string;
  integrity_verified: boolean;
}

export interface SystemSnapshot {
  nodes: NodeInfo[];
  manifest: FileManifest | null;
  impairment: NetworkImpairment;
  active_nodes: number;
  redundancy_level: string;
  benchmarks: BenchmarkRun[];
  reconstructed_blake3: string | null;
  integrity_verified: boolean | null;
  can_download: boolean;
}

export interface DropletStats {
  packet_loss_pct: number;
  sent_droplets: number;
  lost_droplets: number;
  received_droplets: number;
  decoded: boolean;
}

export type TelemetryEvent =
  | { type: 'Log'; payload: { timestamp: string; level: string; code: string; message: string } }
  | { type: 'FileEncoded'; payload: { manifest: FileManifest; encode_ms: number } }
  | { type: 'ShardDistributed'; payload: { shard_id: number; node_id: number; size_bytes: number } }
  | { type: 'NodeStatusChanged'; payload: { node_id: number; status: NodeStatus; active_nodes: number } }
  | { type: 'RedundancyDegraded'; payload: { surviving_shards: number; required_shards: number } }
  | { type: 'CorruptedShardRejected'; payload: { node_id: number; shard_id: number; expected_hash: string; actual_hash: string } }
  | { type: 'ReconstructionStarted'; payload: { surviving_shard_ids: number[] } }
  | { type: 'IntegrityVerified'; payload: { original_blake3: string; reconstructed_blake3: string; matched: boolean; reconstruction_ms: number } }
  | { type: 'ShardRegenerated'; payload: { shard_id: number; target_node_id: number } }
  | { type: 'RedundancyRestored'; payload: { active_nodes: number; healing_ms: number } }
  | { type: 'DropletProgress'; payload: DropletStats }
  | { type: 'MetricsUpdate'; payload: { benchmark: BenchmarkRun } }
  | { type: 'SystemReset'; payload: Record<string, never> };
