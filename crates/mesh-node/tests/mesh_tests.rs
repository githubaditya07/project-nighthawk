use mesh_node::{simulate_droplet_transfer, MeshManager};
use shared::{NetworkImpairment, NodeStatus};

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

        // Node 1 is offline now: reading must fail with NodeOffline
        let read_err = mesh.read_shard(1, 0, &impairment).await;
        assert!(read_err.is_err());

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
fn test_droplet_transfer_simulation() {
    // 0% loss
    let stats_0 = simulate_droplet_transfer(0.0, 1048576);
    assert_eq!(stats_0.lost_droplets, 0);
    assert!(stats_0.decoded);

    // 25% loss with fountain coding redundancy
    let stats_25 = simulate_droplet_transfer(25.0, 1048576);
    assert!(stats_25.sent_droplets > stats_0.sent_droplets);
    assert!(stats_25.decoded);
}
