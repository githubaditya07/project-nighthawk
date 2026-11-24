use core_codec::{encode_rs84, reconstruct_and_regenerate, CodecError};
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;

#[test]
fn test_nondivisible_size_recovery() {
    let mut rng = StdRng::seed_from_u64(42);
    let size = 100_003;
    let mut original_data = vec![0u8; size];
    rng.fill(&mut original_data[..]);

    let (shards, shard_len) = encode_rs84(&original_data).expect("Encoding failed");
    assert_eq!(shards.len(), 12);
    assert_eq!(shard_len, size.div_ceil(8));

    // Convert to Option<Vec<u8>>
    let mut shard_options: Vec<Option<Vec<u8>>> = shards.into_iter().map(Some).collect();

    // Reconstruct without loss
    let recovered = reconstruct_and_regenerate(&mut shard_options, size).expect("Reconstruction failed");
    assert_eq!(recovered, original_data);
}

#[test]
fn test_drop_4_data_shards() {
    let mut rng = StdRng::seed_from_u64(1337);
    let size = 65_536;
    let mut original_data = vec![0u8; size];
    rng.fill(&mut original_data[..]);

    let (shards, _) = encode_rs84(&original_data).expect("Encoding failed");
    let original_shards = shards.clone();

    // Drop 4 data shards: 0, 1, 2, 3
    let mut shard_options: Vec<Option<Vec<u8>>> = shards.into_iter().map(Some).collect();
    shard_options[0] = None;
    shard_options[1] = None;
    shard_options[2] = None;
    shard_options[3] = None;

    let recovered = reconstruct_and_regenerate(&mut shard_options, size)
        .expect("Reconstruction with 4 dropped data shards failed");
    assert_eq!(recovered, original_data);

    // Verify shards 0..3 were regenerated in-place
    for i in 0..4 {
        assert_eq!(shard_options[i].as_ref().unwrap(), &original_shards[i]);
    }
}

#[test]
fn test_drop_2_data_and_2_parity_shards() {
    let mut rng = StdRng::seed_from_u64(9999);
    let size = 50_000;
    let mut original_data = vec![0u8; size];
    rng.fill(&mut original_data[..]);

    let (shards, _) = encode_rs84(&original_data).expect("Encoding failed");
    let original_shards = shards.clone();

    // Drop 2 data [1, 5] and 2 parity [8, 11]
    let mut shard_options: Vec<Option<Vec<u8>>> = shards.into_iter().map(Some).collect();
    shard_options[1] = None;
    shard_options[5] = None;
    shard_options[8] = None;
    shard_options[11] = None;

    let recovered = reconstruct_and_regenerate(&mut shard_options, size)
        .expect("Reconstruction with 2 data + 2 parity dropped failed");
    assert_eq!(recovered, original_data);

    // Verify regenerated shards match originals
    assert_eq!(shard_options[1].as_ref().unwrap(), &original_shards[1]);
    assert_eq!(shard_options[5].as_ref().unwrap(), &original_shards[5]);
    assert_eq!(shard_options[8].as_ref().unwrap(), &original_shards[8]);
    assert_eq!(shard_options[11].as_ref().unwrap(), &original_shards[11]);
}

#[test]
fn test_drop_5_shards_fails_insufficient_redundancy() {
    let mut rng = StdRng::seed_from_u64(777);
    let size = 10_000;
    let mut original_data = vec![0u8; size];
    rng.fill(&mut original_data[..]);

    let (shards, _) = encode_rs84(&original_data).expect("Encoding failed");

    // Drop 5 shards [0, 1, 2, 3, 4] -> only 7 remain
    let mut shard_options: Vec<Option<Vec<u8>>> = shards.into_iter().map(Some).collect();
    shard_options[0] = None;
    shard_options[1] = None;
    shard_options[2] = None;
    shard_options[3] = None;
    shard_options[4] = None;

    let result = reconstruct_and_regenerate(&mut shard_options, size);
    assert_eq!(
        result,
        Err(CodecError::InsufficientRedundancy {
            available: 7,
            required: 8
        })
    );
}
