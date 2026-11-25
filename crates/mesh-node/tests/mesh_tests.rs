use mesh_node::{simulate_droplet_transfer, MeshError, MeshManager};
use shared::{NetworkImpairment, NodeStatus};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

#[test]
fn test_mesh_12_nodes_lifecycle() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime");

    rt.block_on(async {
        let temp_dir = std::env::temp_dir().join("nighthawk_mesh_lifecycle_test");
        let mesh = MeshManager::new(&temp_dir);

        let nodes = mesh.get_nodes().await;
        assert_eq!(nodes.len(), 12);
        assert_eq!(mesh.get_active_count().await, 12);

        let impairment = NetworkImpairment::default();

        // Write shard to node 1
        let data = b"NIGHTHAWK_SHARD_00_BYTES";
        let droplet = mesh.write_shard(1, 0, data, &impairment).await.expect("Write shard failed");
        assert!(droplet.decoded);

        // Read shard from node 1
        let (read_bytes, _) = mesh.read_shard(1, 0, &impairment).await.expect("Read shard failed");
        assert_eq!(read_bytes, data);

        // Kill 4 nodes: 1, 2, 3, 4
        let (killed, active) = mesh.kill_nodes(4, false, Some(vec![1, 2, 3, 4])).await;
        assert_eq!(killed.len(), 4);
        assert_eq!(active, 8);
        assert_eq!(mesh.get_active_count().await, 8);

        // Node 1 is offline now: reading must fail with NodeUnavailable
        let read_err = mesh.read_shard(1, 0, &impairment).await;
        assert!(matches!(read_err, Err(MeshError::NodeUnavailable(1))));

        // Revive all nodes
        let revived = mesh.revive_all_nodes().await;
        assert_eq!(revived, 12);
        assert_eq!(mesh.get_active_count().await, 12);

        // Wipe storage
        mesh.wipe_all_storage().await.expect("Storage wipe failed");
        let nodes_after = mesh.get_nodes().await;
        assert_eq!(nodes_after.iter().filter(|n| n.status == NodeStatus::Online).count(), 12);

        let _ = std::fs::remove_dir_all(&temp_dir);
    });
}

#[test]
fn test_kill_nodes_idempotency() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime");

    rt.block_on(async {
        let temp_dir = std::env::temp_dir().join("nighthawk_mesh_idempotent_kill");
        let mesh = MeshManager::new(&temp_dir);

        // First kill: nodes 1 and 2
        let (killed1, active1) = mesh.kill_nodes(2, false, Some(vec![1, 2])).await;
        assert_eq!(killed1, vec![1, 2]);
        assert_eq!(active1, 10);

        // Second kill with duplicate IDs 1, 2 plus a new node 3
        let (killed2, active2) = mesh.kill_nodes(3, false, Some(vec![1, 2, 3])).await;
        // Nodes 1 and 2 are already offline, so only node 3 should be reported as newly killed
        assert_eq!(killed2, vec![3]);
        assert_eq!(active2, 9);

        let _ = std::fs::remove_dir_all(&temp_dir);
    });
}

#[test]
fn test_per_node_uptime_reset() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime");

    rt.block_on(async {
        let temp_dir = std::env::temp_dir().join("nighthawk_mesh_uptime_test");
        let mesh = MeshManager::new(&temp_dir);

        let node1 = mesh.get_node(1).await.expect("Node 1 should exist");
        assert_eq!(node1.status, NodeStatus::Online);

        // Kill node 1
        mesh.kill_nodes(1, false, Some(vec![1])).await;
        let node1_dead = mesh.get_node(1).await.expect("Node 1 should exist");
        assert_eq!(node1_dead.status, NodeStatus::Offline);
        assert_eq!(node1_dead.uptime_secs, 0, "Offline node must report 0 uptime");

        // Revive node 1
        mesh.revive_node(1).await.expect("Revive node 1 failed");
        let node1_revived = mesh.get_node(1).await.expect("Node 1 should exist");
        assert_eq!(node1_revived.status, NodeStatus::Online);
        assert!(node1_revived.uptime_secs <= 1, "Revived node must start counting uptime fresh from 0");

        let _ = std::fs::remove_dir_all(&temp_dir);
    });
}

#[test]
fn test_droplet_transfer_loss_and_extreme_failure() {
    // 0% loss: all droplets delivered cleanly
    let stats_0 = simulate_droplet_transfer(0.0, 1048576);
    assert_eq!(stats_0.lost_droplets, 0);
    assert!(stats_0.decoded);

    // 40% loss: realistic fountain-coded redundancy succeeds
    let stats_40 = simulate_droplet_transfer(40.0, 1048576);
    assert!(stats_40.lost_droplets > 0);
    assert!(stats_40.sent_droplets > stats_40.received_droplets);
    assert!(stats_40.decoded, "40% loss should successfully decode with fountain redundancy");

    // 98% extreme loss: hits transmission cap and returns decoded: false without hanging
    let stats_extreme = simulate_droplet_transfer(98.0, 1048576);
    assert!(!stats_extreme.decoded, "98% loss must report decoded: false when transmission cap is reached");
    assert!(stats_extreme.sent_droplets >= 80, "Transmission cap should have been reached");
}

#[test]
fn test_background_self_healing_watcher_trigger() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime");

    rt.block_on(async {
        let temp_dir = std::env::temp_dir().join("nighthawk_mesh_watcher_test");
        let mesh = MeshManager::new(&temp_dir);

        // Default: auto_heal is disabled
        assert!(!mesh.is_auto_heal());

        let heal_triggered = Arc::new(AtomicBool::new(false));
        let heal_triggered_clone = heal_triggered.clone();

        let _handle = mesh.spawn_self_healing_watcher(Duration::from_millis(50), move || {
            let triggered = heal_triggered_clone.clone();
            async move {
                triggered.store(true, Ordering::SeqCst);
            }
        });

        // Take node 5 offline
        mesh.kill_nodes(1, false, Some(vec![5])).await;

        // Auto heal is still false, so heal should NOT trigger
        tokio::time::sleep(Duration::from_millis(120)).await;
        assert!(!heal_triggered.load(Ordering::SeqCst), "Watcher must not trigger when auto_heal is false");

        // Enable auto heal
        mesh.set_auto_heal(true);
        assert!(mesh.is_auto_heal());

        // Wait for watcher interval tick
        tokio::time::sleep(Duration::from_millis(150)).await;
        assert!(heal_triggered.load(Ordering::SeqCst), "Watcher must trigger heal callback when auto_heal is true and nodes are offline");

        let _ = std::fs::remove_dir_all(&temp_dir);
    });
}
