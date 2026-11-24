use reed_solomon_erasure::galois_8::ReedSolomon;
use thiserror::Error;

pub const DATA_SHARDS: usize = 8;
pub const PARITY_SHARDS: usize = 4;
pub const TOTAL_SHARDS: usize = 12;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CodecError {
    #[error("Empty file payload")]
    EmptyPayload,
    #[error("Invalid shard count: expected {expected}, got {got}")]
    InvalidShardCount { expected: usize, got: usize },
    #[error("Insufficient redundancy: {available} shards available, but {required} required")]
    InsufficientRedundancy { available: usize, required: usize },
    #[error("Reed-Solomon codec error: {0}")]
    RsError(String),
}

/// Encodes file_bytes using Reed-Solomon RS(8,4).
/// Returns a tuple of (12 shards, shard_len).
pub fn encode_rs84(file_bytes: &[u8]) -> Result<(Vec<Vec<u8>>, usize), CodecError> {
    if file_bytes.is_empty() {
        return Err(CodecError::EmptyPayload);
    }

    let shard_len = file_bytes.len().div_ceil(DATA_SHARDS).max(1);
    let mut shards: Vec<Vec<u8>> = Vec::with_capacity(TOTAL_SHARDS);

    for i in 0..DATA_SHARDS {
        let start = i * shard_len;
        let mut shard = vec![0u8; shard_len];
        if start < file_bytes.len() {
            let end = (start + shard_len).min(file_bytes.len());
            let slice = &file_bytes[start..end];
            shard[..slice.len()].copy_from_slice(slice);
        }
        shards.push(shard);
    }

    for _ in 0..PARITY_SHARDS {
        shards.push(vec![0u8; shard_len]);
    }

    let rs = ReedSolomon::new(DATA_SHARDS, PARITY_SHARDS)
        .map_err(|e| CodecError::RsError(e.to_string()))?;

    rs.encode(&mut shards)
        .map_err(|e| CodecError::RsError(e.to_string()))?;

    Ok((shards, shard_len))
}

/// Reconstructs the original file and regenerates all missing shards in-place.
/// Expects `shards` to have length 12, with at least 8 `Some(shard)`.
pub fn reconstruct_and_regenerate(
    shards: &mut Vec<Option<Vec<u8>>>,
    original_size: usize,
) -> Result<Vec<u8>, CodecError> {
    if shards.len() != TOTAL_SHARDS {
        return Err(CodecError::InvalidShardCount {
            expected: TOTAL_SHARDS,
            got: shards.len(),
        });
    }

    let available = shards.iter().filter(|s| s.is_some()).count();
    if available < DATA_SHARDS {
        return Err(CodecError::InsufficientRedundancy {
            available,
            required: DATA_SHARDS,
        });
    }

    let rs = ReedSolomon::new(DATA_SHARDS, PARITY_SHARDS)
        .map_err(|e| CodecError::RsError(e.to_string()))?;

    rs.reconstruct(shards)
        .map_err(|e| CodecError::RsError(e.to_string()))?;

    // Concatenate shards 0..DATA_SHARDS
    let mut recovered = Vec::with_capacity(DATA_SHARDS * shards[0].as_ref().unwrap().len());
    for shard in shards.iter().take(DATA_SHARDS) {
        if let Some(s) = shard {
            recovered.extend_from_slice(s);
        } else {
            return Err(CodecError::RsError(
                "Data shard missing after reconstruction".to_string(),
            ));
        }
    }

    recovered.truncate(original_size);
    Ok(recovered)
}
