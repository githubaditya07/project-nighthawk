# Project NIGHTHAWK — Architectural Rules & Coding Standards
**IEEE BMSIT&M Winter of Projects 2026 (Track: COMSOC-SW-02)**  
**Team StrawHats:** Aditya Kumar Gupta, Bhuvanesh D, Sneha Kumar Shah, Nidhi Teresa Paul

---

## 1. Mathematical & Codec Integrity
- **Strict RS(8,4) Configuration:** Coding configuration is strictly Reed-Solomon RS(8,4) over the Galois Field $\text{GF}(2^8)$ ($k=8$ data shards, $m=4$ parity shards, $n=12$ total shards). Never use or substitute with RS(4,2), RS(16,4), or naive replication.
- **No Mocking Rule:** Never mock Reed-Solomon polynomial math, Blake3 cryptographic hashing, shard disk writes/reads, or disk-level byte corruption. All operations must operate on real byte buffers and actual `.shard` files on disk (up to 50 MB payloads).
- **Exact Recovery:** When file length is not a clean multiple of 8, the codec must pad data shards with zeros during encoding and truncate to `original_size` upon reconstruction to guarantee bit-exact identity.

## 2. Architectural Boundaries & Layering
To maintain absolute production clarity for IEEE evaluation, components are stratified into 3 clearly marked tiers:
- **P0 Core (Production-Grade Implemented):**
  - RS(8,4) encoding, reconstruction, and in-place shard regeneration via `reed-solomon-erasure`.
  - Cryptographic integrity verification via Blake3 256-bit hashing and binary Blake3 Merkle tree root calculation.
  - 12-node isolated local storage architecture (`./data/node_01/` through `./data/node_12/`) with realistic fault injection and real disk byte flipping.
  - Axum HTTP REST API & high-frequency WebSocket telemetry hub broadcasting typed state events.
  - Cyber-Ops War-Room Command Centre UI (Vite + React + TypeScript + Tailwind CSS) with real-time SVG topology, shard matrix, chaos console, and benchmark visualizations.
- **P1 Prototype Layer (Exhibition Demonstration):**
  - Lightweight local peer registry with simulated XOR distance calculations.
  - Simplified fountain-droplet packet-loss simulation layer demonstrating how coded droplets overcome up to 50% packet drop rates without TCP head-of-line blocking.
- **P2 Future Roadmap (Documented Extensions):**
  - Full RFC 6330 RaptorQ rateless fountain codec implementation.
  - Full Kademlia DHT routing tables with RPC node discovery across wide-area networks.
  - SIMD/AVX2 acceleration for Galois Field arithmetic at 10+ GB/s throughput.

## 3. Contract Immutability
- **SPEC.md & shared/src/lib.rs:** The REST and WebSocket API schemas defined in `SPEC.md` and the Rust models in `shared/src/lib.rs` are frozen contracts. Never alter structure names, field types, or WebSocket tags without cross-team approval.
- **Typed Telemetry Guarantee:** Every single state-changing backend endpoint must emit a typed `TelemetryEvent` across `/ws/telemetry` so the war-room UI remains 100% reactive without polling.

## 4. UI/UX Interaction Standards
- **No Inert Controls:** Every button, slider, and toggle in the dashboard must trigger a real backend state change, an SVG/CSS animation, and an audit log event.
- **Telemetry-Driven State:** The War-Room UI synchronizes with the backend via WebSocket events and state snapshots. Hash comparisons must show live side-by-side verification status with visual indicators for match/mismatch.
