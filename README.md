# Project NIGHTHAWK 🦅
### Decentralized, Self-Healing Reed-Solomon RS(8,4) Storage Network & War-Room Operations Dashboard
**IEEE BMSIT&M Winter of Projects 2026 — Track: COMSOC-SW-02**  
**Developed by Team StrawHats**

[![Rust](https://img.shields.io/badge/Rust-1.100.0-orange.svg?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Axum](https://img.shields.io/badge/Axum-0.8-black.svg?logo=rust&logoColor=white)](https://github.com/tokio-rs/axum)
[![Reed-Solomon](https://img.shields.io/badge/RS(8,4)-GF(2^8)-brightgreen.svg)]()
[![Blake3](https://img.shields.io/badge/Blake3-Cryptographic%20Integrity-blueviolet.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Executive Summary & Problem Statement

Modern enterprise distributed storage systems (e.g., Ceph, HDFS, Google Colossus) face a punishing trade-off between **fault tolerance** and **storage efficiency**:
- Traditional **$3\times$ replication** requires a massive **$3.00\times$ storage overhead** (300 MB stored for every 100 MB of data), placing unsustainable burdens on datacenters and edge nodes.
- When nodes crash or physical disk sectors silently corrupt (bit rot), manual data reconciliation causes high recovery latency and severe network saturation.

**Project NIGHTHAWK** addresses this crisis by deploying a decentralized **Reed-Solomon $\text{RS}(8,4)$ erasure coding architecture** over the Galois Field $\text{GF}(2^8)$ combined with real-time **Blake3 cryptographic Merkle integrity** and a mission-critical **War-Room Operations Dashboard**:
- **Storage Overhead:** Reduced from $3.00\times$ down to **$1.50\times$** ($50\%$ savings over $3\times$ replication).
- **Resilience:** Any $4$ out of $12$ nodes can fail simultaneously or experience physical bit rot without data loss.
- **Self-Healing:** In-place mathematical polynomial interpolation regenerates missing/corrupt shards dynamically and writes verified blocks back to healthy nodes.
- **End-to-End Authenticity:** Shard-level Blake3 checksums and binary Merkle trees detect and reject compromised shards before reconstruction.

---

## 🏛️ System Architecture

```
                                      +---------------------------------------------+
                                      |     NIGHTHAWK WAR-ROOM OPERATIONS DASHBOARD  |
                                      |  (Vite + React 19 + TypeScript + Tailwind)  |
                                      +---------------------------------------------+
                                              |                             ^
                                  HTTP REST   |                             | WebSocket
                                  Requests    v                             | Telemetry Stream
                               +-----------------------------------------------+
                               |            AXUM HIGH-THROUGHPUT GATEWAY       |
                               |          (Port 8080 - 100MB+ Streaming)       |
                               +-----------------------------------------------+
                                              |                     |
                      +-----------------------+                     +-----------------------+
                      |                                                                     |
                      v                                                                     v
       +-------------------------------+                                     +-------------------------------+
       |       CORE CODEC CRATE        |                                     |       CHAOS & CRYPTO LAB      |
       |  - Reed-Solomon RS(8,4)       |                                     |  - Blake3 256-bit Hashing     |
       |  - k=8 Data, m=4 Parity       |                                     |  - Binary Merkle Tree Root    |
       |  - Zero-padded Byte Slicing   |                                     |  - Real Disk Byte Corruption  |
       |  - In-place Regeneration      |                                     |  - Benchmark & CSV Export     |
       +-------------------------------+                                     +-------------------------------+
                      |                                                                     |
                      +-----------------------+                     +-----------------------+
                                              |                     |
                                              v                     v
                               +-----------------------------------------------+
                               |             12-NODE STORAGE MESH              |
                               |    - Isolated Storage (./data/node_01..12/)   |
                               |    - Droplet Packet Loss Simulator (0-50%)    |
                               |    - Peer Health & XOR Routing Distance    |
                               +-----------------------------------------------+
                                  |     |     |     |     |     |     |     |
                                 [N1]  [N2]  [N3]  [N4]  ...   [N10] [N11] [N12]
```

---

## 📊 Key Engineering Specifications

| Metric / Dimension | NIGHTHAWK RS(8,4) Implementation | Traditional $3\times$ Replication Baseline | Advantage / Impact |
|---|---|---|---|
| **Total Mesh Nodes** | **12 independent storage nodes** | 3 storage replicas | Scalable distributed peer mesh |
| **Data / Parity Partition** | **$k = 8$ Data Shards, $m = 4$ Parity Shards** | 1 Data, 2 Replicas | Mathematical redundancy over raw copying |
| **Storage Overhead** | **$1.50\times$ (150% of raw payload)** | $3.00\times$ (300% of raw payload) | **$50\%$ storage savings** |
| **Simultaneous Failures Tolerated** | **4 Nodes (any 4 of 12)** | 2 Nodes (2 of 3) | Survives $33.3\%$ network collapse |
| **Integrity Verification** | **Cryptographic Blake3 + Binary Merkle Root** | Basic CRC32 or SHA-256 | Resilient against malicious tampering & bit rot |
| **Disk Operations** | **Real `.shard` files on disk (up to 50 MB)** | Often simulated/in-memory | Production-grade file-system I/O |
| **Max Payload Tested** | **50 MB end-to-end binary payload** | Typically 1 MB toy payloads | True enterprise-scale verification |

---

## 🔍 Implemented vs. Prototype vs. Future Roadmap

To ensure total transparency during IEEE evaluation, NIGHTHAWK classifies its components into 3 explicit tiers:

| Tier | Component | Status | Description |
|---|---|---|---|
| **P0 Core** | **RS(8,4) Codec** | **Fully Implemented** | Full $\text{GF}(2^8)$ Galois Field matrix encoding, decoding, and in-place parity regeneration. |
| **P0 Core** | **Blake3 Merkle Tree** | **Fully Implemented** | Cryptographic verification of all 12 shards and Merkle root calculation. |
| **P0 Core** | **Disk Fault Injection** | **Fully Implemented** | Physical `.shard` byte-flipping on disk (`XOR 0xFF`) and online/offline failure triggers. |
| **P0 Core** | **Axum Gateway** | **Fully Implemented** | 100 MB body limit, REST endpoints, and typed high-frequency `/ws/telemetry` streaming. |
| **P0 Core** | **War-Room UI** | **Fully Implemented** | Dark Cyber-Ops NOC interface with animated SVG ring topology and live event telemetry. |
| **P1 Prototype** | **Peer Registry** | **Prototype Layer** | Lightweight local peer table calculating simulated XOR distance metrics. |
| **P1 Prototype** | **Droplet Transport** | **Prototype Layer** | Simplified fountain-droplet simulator demonstrating coded packet-loss recovery. |
| **P2 Future** | **RaptorQ RFC 6330** | **Future Roadmap** | Full rateless fountain forward error correction for extreme WAN packet loss. |
| **P2 Future** | **Kademlia DHT** | **Future Roadmap** | Complete decentralized routing tables with RPC node discovery across WAN. |
| **P2 Future** | **SIMD / AVX2** | **Future Roadmap** | Hardware-accelerated Galois Field matrix multiplication for 10+ GB/s throughput. |

---

## 👥 Team StrawHats & Ownership Matrix

| Member | Primary Role | Code Boundaries | Key Contributions |
|---|---|---|---|
| **Aditya Kumar Gupta** | Lead Architect & Backend Engineer | `crates/core-codec/`<br>`crates/gateway/`<br>`SPEC.md`<br>`shared/` | Reed-Solomon RS(8,4) implementation, Axum REST API, WebSocket telemetry router, system integration. |
| **Bhuvanesh D** | Distributed Systems Engineer | `crates/mesh-node/`<br>`docker-compose.yml` | 12-node storage mesh manager, file I/O layer, droplet packet-loss simulator, node lifecycles. |
| **Sneha Kumar Shah** | Cryptography & Chaos Engineer | `crates/chaos-crypto/`<br>`scripts/` | Blake3 hash verification, binary Merkle tree engine, physical disk corruption injection, 5-metric benchmark suite. |
| **Nidhi Teresa Paul** | Frontend & UI/UX Engineer | `war-room-ui/` | Cyber-Ops War-Room dashboard, interactive SVG node topology, shard status matrix, chaos console, Recharts visualizations. |

---

## ⚡ Quickstart Guide

### Prerequisites
- **Rust Toolchain:** 1.80+ (MSVC or GNU)
- **Node.js:** v18+ and `npm`
- **Python:** 3.10+ (for test payload generator)

### 1. Automated One-Command Launch

#### On Windows (PowerShell):
```powershell
.\scripts\start.ps1
```

#### On Linux / macOS (Bash):
```bash
chmod +x ./scripts/start.sh
./scripts/start.sh
```

The script automatically initializes the `./data/node_01`..`./data/node_12` storage directories, installs UI dependencies, starts the Axum Gateway on `http://localhost:8080`, and opens the War-Room UI on `http://localhost:5173`.

---

## 🚀 The 7-Step Live Exhibition Demo Guide

Follow these steps for a live judge walkthrough:

1. **Step 1: Network Baseline Check**
   - Open `http://localhost:5173`.
   - Observe the **Top Performance HUD**: `12/12 Nodes Online`, `1.50x RS(8,4)`, `Integrity: STANDBY`.
   - View the **Circular SVG Topology**: all 12 nodes glowing vibrant green.

2. **Step 2: File Ingestion & RS(8,4) Dispersion**
   - Click **"Generate & Upload 10MB Test Payload"** (or upload your own PDF/video up to 50 MB).
   - Watch the animated cyan transfer arcs distribute shards $D_0 \dots D_7$ and $P_0 \dots P_3$ across nodes $1 \dots 12$.
   - Inspect the **12-Shard Distribution Matrix**: all 12 shards show `VALID` with distinct Blake3 hashes and the calculated Merkle root.

3. **Step 3: Extreme Chaos Injection (Kill 4 Nodes)**
   - In the **Chaos Monkey Console**, click **`KILL 4 NODES`**.
   - Notice nodes $1, 2, 3, 4$ instantly turn **Crimson Red (`OFFLINE`)** in the SVG ring.
   - The HUD warns: `Redundancy: Critical (8/12 surviving - Minimum Threshold)`.

4. **Step 4: Silent Bit Rot Injection (Corrupt Shard)**
   - Select Node 6 in the dropdown and click **`CORRUPT SHARD (FLIP BYTES)`**.
   - This physically opens `./data/node_06/*.shard` on disk and flips 16 bytes with `0xFF`.
   - Node 6 transitions to **Amber (`DEGRADED`)**.

5. **Step 5: Cryptographic Reconstruction & Tamper Rejection**
   - Click **`RECONSTRUCT FILE (8-of-12)`**.
   - The backend reads shards from online nodes and computes Blake3 hashes.
   - A bright red alert banner appears: **`CORRUPTED SHARD REJECTED: Node 6 failed hash check`**.
   - NIGHTHAWK discards the corrupted shard, utilizes the remaining 8 valid shards, and performs Galois Field reconstruction.
   - The **Original Blake3** and **Reconstructed Blake3** hashes match bit-for-bit: **`INTEGRITY VERIFIED — BIT-EXACT MATCH`**.

6. **Step 6: Autonomous Self-Healing (Restore 12/12)**
   - Click **`SELF-HEAL MESH (RESTORE 12/12)`**.
   - The RS(8,4) engine interpolates the missing and corrupted shards in-place.
   - Fresh, mathematically verified shards are written to disk.
   - All 12 nodes turn glowing green (`Online`), and the HUD confirms `Redundancy: Optimal (12/12)`.

7. **Step 7: Verification Download & Benchmark Evaluation**
   - Click **`DOWNLOAD RECOVERED FILE`** to save and open the bit-exact recovered file.
   - Scroll to the **Benchmark Panel** to review measured encoding, reconstruction, and healing latencies alongside the $50\%$ storage savings chart.
   - Click **`EXPORT CSV`** to download the complete benchmark dataset.
   - Click **`RESET NETWORK`** to wipe storage cleanly for the next evaluation.
