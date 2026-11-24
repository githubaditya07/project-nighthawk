# Team StrawHats — Antigravity Engineering Prompts & Scopes
**IEEE BMSIT&M Winter of Projects 2026 | Track: COMSOC-SW-02**  
**Project:** NIGHTHAWK — Self-Healing Reed-Solomon RS(8,4) Storage Network & War-Room Operations Dashboard  
**Team Members:** Aditya Kumar Gupta (Lead), Bhuvanesh D, Sneha Kumar Shah, Nidhi Teresa Paul

---

## Architecture Ownership Matrix

| Member | Module Directory | Primary Responsibilities | Interface Contract Boundary |
|---|---|---|---|
| **Aditya Kumar Gupta** | `crates/core-codec/`<br>`crates/gateway/` | RS(8,4) matrix codec, Axum REST endpoints, WebSocket telemetry hub | `core_codec::encode_rs84`, `reconstruct_and_regenerate`, `/api/*`, `/ws/telemetry` |
| **Bhuvanesh D** | `crates/mesh-node/`<br>`docker-compose.yml` | 12-node storage mesh, droplet fountain simulator, self-healing scheduler | `MeshManager::write_shard`, `read_shard`, `kill_nodes`, `revive_all_nodes` |
| **Sneha Kumar Shah** | `crates/chaos-crypto/`<br>`scripts/` | Blake3 hashing, binary Merkle tree, byte-level disk corruption, benchmarks | `hash_bytes`, `compute_merkle_root`, `corrupt_shard_file_on_disk`, `export_benchmarks_csv` |
| **Nidhi Teresa Paul** | `war-room-ui/` | Cyber-Ops War-Room dashboard, SVG ring topology, shard matrix, chaos UI | React 19, TypeScript, Tailwind CSS, Lucide icons, Recharts |

---

## 1. Aditya Kumar Gupta — Core Codec & Gateway Hub
**Scope:** `crates/core-codec/`, `crates/gateway/`, `SPEC.md`, `shared/`

### Ready-to-Use Antigravity Prompt:
```markdown
You are working on Project NIGHTHAWK as Aditya Kumar Gupta, Lead Architect.
Your domain is strictly crates/core-codec/ and crates/gateway/.
Tasks:
1. Ensure the Reed-Solomon RS(8,4) implementation over GF(2^8) divides payloads into exactly 8 data shards + 4 parity shards, zero-padding non-divisible byte buffers and truncating upon recovery.
2. In reconstruct_and_regenerate, ensure that when >= 8 surviving shards are provided, all missing shards (both data and parity) are regenerated in-place using rs.reconstruct().
3. Maintain the Axum gateway REST endpoints (POST /api/upload, POST /api/chaos/kill, POST /api/chaos/corrupt, POST /api/reconstruct, POST /api/heal, POST /api/system/reset, GET /api/download, GET /api/state) and ensure every state-changing route broadcasts a typed TelemetryEvent over /ws/telemetry.
4. Support upload payloads up to 50 MB with streaming memory safety.
```

---

## 2. Bhuvanesh D — 12-Node Mesh & Self-Healing Engine
**Scope:** `crates/mesh-node/`, `docker-compose.yml`

### Ready-to-Use Antigravity Prompt:
```markdown
You are working on Project NIGHTHAWK as Bhuvanesh D, Distributed Systems Engineer.
Your domain is strictly crates/mesh-node/ and docker-compose.yml.
Tasks:
1. Maintain MeshManager managing 12 node identities (node_01 through node_12, ports 9001..9012) backed by dedicated storage paths (./data/node_01/ through ./data/node_12/).
2. Enforce node offline semantics: if a node is marked Offline, read_shard and write_shard must return NodeUnavailable errors.
3. Integrate simulate_droplet_transfer to model packet loss (0-50%) and latency (0-500ms) with fountain droplet statistics (sent, received, lost droplets).
4. Implement self-healing state transitions (Offline/Degraded -> Recovering -> Online) and atomic storage purge for 1-click system resets.
```

---

## 3. Sneha Kumar Shah — Chaos Lab & Cryptographic Integrity
**Scope:** `crates/chaos-crypto/`, `scripts/`

### Ready-to-Use Antigravity Prompt:
```markdown
You are working on Project NIGHTHAWK as Sneha Kumar Shah, Cryptography & Chaos Engineer.
Your domain is strictly crates/chaos-crypto/ and scripts/.
Tasks:
1. Implement real Blake3 256-bit hashing (hash_bytes) and binary Merkle tree root construction (compute_merkle_root) over 12 shard hashes.
2. Implement corrupt_shard_file_on_disk: physically open the .shard file on disk, seek to the middle, XOR 16 bytes with 0xFF, and flush to disk to create real bit rot.
3. In verify_shard, re-hash actual file bytes and compare with the expected manifest hash to detect corruptions before reconstruction.
4. Maintain the 5-metric benchmark suite (encoding time, detection latency, reconstruction time, self-healing time, bandwidth efficiency) and CSV export logic.
```

---

## 4. Nidhi Teresa Paul — War-Room Command Centre UI
**Scope:** `war-room-ui/`

### Ready-to-Use Antigravity Prompt:
```markdown
You are working on Project NIGHTHAWK as Nidhi Teresa Paul, Frontend & UX Engineer.
Your domain is strictly war-room-ui/.
Tasks:
1. Build and refine the Cyber-Ops War-Room Command Centre in Vite + React + TypeScript + Tailwind CSS using an obsidian/glass dark theme (#090D16, #111827) with cyan (#00F0FF) accents.
2. Render an interactive 12-node circular SVG topology with animated transfer arcs for shard distribution, reconstruction, and self-healing.
3. Provide an interactive 12-shard status matrix (D0-D7, P0-P3) reflecting real-time shard health (Valid, Offline, Corrupt/Rejected, Regenerated).
4. Connect all buttons to real Axum REST endpoints (Kill 1/2/4 nodes, Corrupt Shard, Reconstruct, Self-Heal, Reset, Download, CSV Export) and keep the UI 100% reactive via the /ws/telemetry WebSocket.
5. Render benchmark comparison charts against 3x replication baseline using Recharts.
```
