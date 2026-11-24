# Project NIGHTHAWK — API & Telemetry Specification
**Version:** 1.0.0 (Frozen Contract)  
**IEEE BMSIT&M Winter of Projects 2026 (Track: COMSOC-SW-02)**  
**Team StrawHats:** Aditya Kumar Gupta, Bhuvanesh D, Sneha Kumar Shah, Nidhi Teresa Paul

---

## 1. REST API Specification

### Base URL: `http://localhost:8080`

### 1.1 `GET /api/state`
Returns the full system state snapshot. Used by the War-Room UI on load and upon reconnection.

**Response `200 OK` (JSON):**
```json
{
  "nodes": [
    {
      "node_id": 1,
      "name": "NIGHTHAWK-NODE-01",
      "address": "127.0.0.1:9001",
      "status": "Online",
      "shard_id": 0,
      "uptime_secs": 1420,
      "bytes_transferred": 1048576,
      "xor_distance": "0x1A4F"
    }
  ],
  "manifest": null,
  "impairment": {
    "packet_loss_pct": 0.0,
    "latency_ms": 0
  },
  "active_nodes": 12,
  "redundancy_level": "Optimal (1.50x RS(8,4))",
  "benchmarks": [],
  "reconstructed_blake3": null,
  "integrity_verified": null,
  "can_download": false
}
```

---

### 1.2 `POST /api/upload`
Uploads a payload (up to 50 MB) via `multipart/form-data` with field name `file`. Computes Blake3 digest, splits using Reed-Solomon RS(8,4) into 8 data shards + 4 parity shards, builds binary Merkle root over 12 shard hashes, and writes shards to `./data/node_01/` through `./data/node_12/`.

**Request:** `multipart/form-data` containing `file: <binary>`

**Response `200 OK` (JSON):**
```json
{
  "file_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "filename": "payload.bin",
  "original_size": 10485760,
  "original_blake3": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  "merkle_root": "a82390fcd620579e00eb49a0b9432f8eb4e95d5b78ff70a92d447a1188540c11",
  "storage_overhead": 1.50,
  "shards": [
    {
      "shard_id": 0,
      "kind": "Data",
      "size_bytes": 1310720,
      "blake3_hash": "2f679...",
      "node_id": 1,
      "is_corrupt": false
    }
  ]
}
```

---

### 1.3 `POST /api/chaos/kill`
Injects simulated node offline failures. Offline nodes reject shard read/write operations.

**Request Body (JSON):**
```json
{
  "count": 4,
  "random": true,
  "node_ids": [1, 2, 3, 4]
}
```

**Response `200 OK` (JSON):**
```json
{
  "status": "success",
  "killed_nodes": [1, 2, 3, 4],
  "active_nodes": 8,
  "redundancy_level": "Critical (Minimum 8 required)"
}
```

---

### 1.4 `POST /api/chaos/corrupt`
Directly mutates the physical `.shard` file on disk inside `./data/node_{node_id}/` by seeking to the midpoint and XORing 16 bytes with `0xFF`. Marks the node as `Degraded`.

**Request Body (JSON):**
```json
{
  "node_id": 3
}
```

**Response `200 OK` (JSON):**
```json
{
  "status": "success",
  "node_id": 3,
  "corrupted_shard_id": 2,
  "message": "Physical disk shard bytes corrupted with bit rot"
}
```

---

### 1.5 `POST /api/chaos/network`
Updates the simulated network impairment applied to transfers.

**Request Body (JSON):**
```json
{
  "packet_loss_pct": 25.0,
  "latency_ms": 120
}
```

**Response `200 OK` (JSON):**
```json
{
  "packet_loss_pct": 25.0,
  "latency_ms": 120
}
```

---

### 1.6 `POST /api/reconstruct`
Reads shards from all online nodes, verifies each shard's Blake3 hash against the manifest, rejects corrupted shards (marking their slots as `None`), and feeds the surviving shards into `reconstruct_and_regenerate()`. Compares reconstructed Blake3 hash with original Blake3 hash.

**Response `200 OK` (JSON):**
```json
{
  "status": "success",
  "surviving_shards": 8,
  "rejected_shards": [2],
  "original_blake3": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  "reconstructed_blake3": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  "matched": true,
  "reconstruction_ms": 32,
  "can_download": true
}
```

---

### 1.7 `POST /api/heal`
Takes the mathematically regenerated shards from RS(8,4), transitions offline and degraded nodes into `Recovering`, writes fresh uncorrupted shards to their storage paths, and restores all nodes to `Online`.

**Response `200 OK` (JSON):**
```json
{
  "status": "success",
  "restored_nodes": [1, 2, 3, 4],
  "regenerated_shards": [0, 1, 2, 3],
  "healing_ms": 48,
  "active_nodes": 12,
  "redundancy_level": "Optimal (1.50x RS(8,4))"
}
```

---

### 1.8 `GET /api/download`
Streams the verified reconstructed file to the client as an attachment.

**Response `200 OK`:**
- Header `Content-Disposition: attachment; filename="<original_filename>"`
- Header `Content-Type: application/octet-stream`
- Body: raw binary file bytes

---

### 1.9 `GET /api/benchmarks/export`
Exports all recorded benchmark runs in CSV format.

**Response `200 OK`:**
- Header `Content-Disposition: attachment; filename="nighthawk_benchmarks.csv"`
- Header `Content-Type: text/csv`
- Body: CSV string

---

### 1.10 `POST /api/system/reset`
Atomic 1-click system wipe. Deletes all shard files from `./data/node_*`, resets node states to `Online`, resets network impairments to 0, clears file manifests and reconstructed caches, and broadcasts `SystemReset`.

**Response `200 OK` (JSON):**
```json
{
  "status": "success",
  "message": "Storage mesh cleanly wiped and reset to factory baseline"
}
```

---

## 2. WebSocket Telemetry Protocol

### Endpoint: `ws://localhost:8080/ws/telemetry`

All frames are JSON objects with a `type` discriminator tag and a `payload` content object:

```json
{
  "type": "<EventType>",
  "payload": { ... }
}
```

### Event Catalog:
1. `Log`: `{ "timestamp": String, "level": String, "code": String, "message": String }`
2. `FileEncoded`: `{ "manifest": FileManifest, "encode_ms": u128 }`
3. `ShardDistributed`: `{ "shard_id": usize, "node_id": usize, "size_bytes": usize }`
4. `NodeStatusChanged`: `{ "node_id": usize, "status": NodeStatus, "active_nodes": usize }`
5. `RedundancyDegraded`: `{ "surviving_shards": usize, "required_shards": usize }`
6. `CorruptedShardRejected`: `{ "node_id": usize, "shard_id": usize, "expected_hash": String, "actual_hash": String }`
7. `ReconstructionStarted`: `{ "surviving_shard_ids": Vec<usize> }`
8. `IntegrityVerified`: `{ "original_blake3": String, "reconstructed_blake3": String, "matched": bool, "reconstruction_ms": u128 }`
9. `ShardRegenerated`: `{ "shard_id": usize, "target_node_id": usize }`
10. `RedundancyRestored`: `{ "active_nodes": usize, "healing_ms": u128 }`
11. `DropletProgress`: `{ "packet_loss_pct": f64, "sent_droplets": usize, "lost_droplets": usize, "received_droplets": usize, "decoded": bool }`
12. `MetricsUpdate`: `{ "benchmark": BenchmarkRun }`
13. `SystemReset`: `{}`
