use chaos_crypto::{compute_merkle_root, corrupt_shard_file_on_disk, export_benchmarks_csv, hash_bytes, verify_shard};
use shared::BenchmarkRun;
use std::fs;

#[test]
fn test_hash_bytes_and_verify() {
    let data = b"NIGHTHAWK_COMSOC_SW_02_STRAWHATS";
    let hash = hash_bytes(data);
    assert_eq!(hash.len(), 64);

    let (valid, actual) = verify_shard(data, &hash);
    assert!(valid);
    assert_eq!(actual, hash);

    let (invalid, _) = verify_shard(b"corrupted", &hash);
    assert!(!invalid);
}

#[test]
fn test_merkle_root_12_hashes() {
    let mut hashes = Vec::new();
    for i in 0..12 {
        let chunk = format!("shard_payload_{}", i);
        hashes.push(hash_bytes(chunk.as_bytes()));
    }

    let root = compute_merkle_root(&hashes);
    assert_eq!(root.len(), 64);

    // Determinism test: same hashes yield identical Merkle root
    let root2 = compute_merkle_root(&hashes);
    assert_eq!(root, root2);
}

#[test]
fn test_physical_disk_corruption() {
    let temp_dir = std::env::temp_dir().join("nighthawk_chaos_test");
    let _ = fs::create_dir_all(&temp_dir);
    let test_file = temp_dir.join("test_node.shard");

    let original_bytes = vec![0xAA; 1024];
    fs::write(&test_file, &original_bytes).expect("Failed to write test shard");

    let original_hash = hash_bytes(&original_bytes);

    corrupt_shard_file_on_disk(&test_file).expect("Corruption function failed");

    let corrupted_bytes = fs::read(&test_file).expect("Failed to read corrupted shard");
    assert_ne!(original_bytes, corrupted_bytes);

    let (valid, corrupted_hash) = verify_shard(&corrupted_bytes, &original_hash);
    assert!(!valid);
    assert_ne!(original_hash, corrupted_hash);

    let _ = fs::remove_file(&test_file);
}

#[test]
fn test_export_benchmarks_csv() {
    let runs = vec![
        BenchmarkRun {
            run_id: 1,
            timestamp: "2026-11-24T17:00:00Z".to_string(),
            scenario: "RS(8,4) 4-Node Failure Recovery".to_string(),
            file_size_bytes: 10_485_760,
            storage_overhead: 1.50,
            encode_ms: 25,
            detection_ms: 10,
            reconstruction_ms: 35,
            healing_ms: 45,
            packet_loss_pct: 10.0,
            bandwidth_efficiency: 92.5,
            fault_tolerance: "4/12 nodes (33.3%)".to_string(),
            integrity_verified: true,
        }
    ];

    let csv = export_benchmarks_csv(&runs);
    assert!(csv.contains("run_id,timestamp,scenario"));
    assert!(csv.contains("RS(8,4) 4-Node Failure Recovery"));
    assert!(csv.contains("1.50"));
}
