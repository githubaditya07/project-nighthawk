use blake3::Hasher;
use shared::BenchmarkRun;
use std::fs::OpenOptions;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;

/// Computes the 256-bit Blake3 digest of byte slice, returned as hex string.
pub fn hash_bytes(data: &[u8]) -> String {
    let hash = blake3::hash(data);
    hash.to_hex().to_string()
}

/// Builds a binary Blake3 Merkle tree over the provided shard hashes and returns the root hex string.
pub fn compute_merkle_root(shard_hashes: &[String]) -> String {
    if shard_hashes.is_empty() {
        return blake3::hash(b"").to_hex().to_string();
    }

    // Convert hex hashes to 32-byte arrays
    let mut current_level: Vec<[u8; 32]> = Vec::with_capacity(shard_hashes.len());
    for h in shard_hashes {
        if let Ok(bytes) = hex::decode(h) {
            if bytes.len() == 32 {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&bytes);
                current_level.push(arr);
                continue;
            }
        }
        // Fallback: hash the string itself if not 32 raw bytes
        let digest = blake3::hash(h.as_bytes());
        current_level.push(*digest.as_bytes());
    }

    while current_level.len() > 1 {
        let mut next_level = Vec::with_capacity((current_level.len() + 1) / 2);
        for chunk in current_level.chunks(2) {
            let mut hasher = Hasher::new();
            hasher.update(&chunk[0]);
            if chunk.len() > 1 {
                hasher.update(&chunk[1]);
            } else {
                // If odd number of nodes, pair with itself (Merkle standard)
                hasher.update(&chunk[0]);
            }
            next_level.push(*hasher.finalize().as_bytes());
        }
        current_level = next_level;
    }

    blake3::Hash::from(current_level[0]).to_hex().to_string()
}

/// Re-hashes actual shard data and compares against the expected Blake3 hash.
/// Returns (matches, actual_hash).
pub fn verify_shard(data: &[u8], expected_hash: &str) -> (bool, String) {
    let actual_hash = hash_bytes(data);
    let matches = actual_hash.eq_ignore_ascii_case(expected_hash);
    (matches, actual_hash)
}

/// Returns the first `max_bytes` of a slice formatted as uppercase space-separated hex pairs.
pub fn format_hex_preview(data: &[u8], max_bytes: usize) -> String {
    data.iter()
        .take(max_bytes)
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Mutates the physical .shard file on disk: flips bytes in the header (offset 0)
/// and at the midpoint via XOR 0xFF (bit rot simulation), and flushes to disk.
pub fn corrupt_shard_file_on_disk(path: &Path) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(path)
        .map_err(|e| format!("Failed to open shard file {}: {}", path.display(), e))?;

    let file_len = file
        .metadata()
        .map_err(|e| format!("Failed to read metadata for {}: {}", path.display(), e))?
        .len();

    if file_len == 0 {
        return Err("Cannot corrupt empty shard file".to_string());
    }

    // Mutate header bytes so live 64-byte Hex X-Ray immediately reveals disk bit-rot
    let header_len = 16.min(file_len as usize);
    let mut header_buf = vec![0u8; header_len];
    file.seek(SeekFrom::Start(0))
        .map_err(|e| format!("Seek start failed on {}: {}", path.display(), e))?;
    file.read_exact(&mut header_buf)
        .map_err(|e| format!("Read header failed on {}: {}", path.display(), e))?;
    for b in header_buf.iter_mut() {
        *b ^= 0xFF;
    }
    file.seek(SeekFrom::Start(0))
        .map_err(|e| format!("Seek back to start failed on {}: {}", path.display(), e))?;
    file.write_all(&header_buf)
        .map_err(|e| format!("Write header failed on {}: {}", path.display(), e))?;

    // Also mutate 16 bytes at the midpoint if file is large enough
    let midpoint = file_len / 2;
    if midpoint >= header_len as u64 {
        file.seek(SeekFrom::Start(midpoint))
            .map_err(|e| format!("Seek failed on {}: {}", path.display(), e))?;

        let bytes_to_corrupt = 16.min((file_len - midpoint) as usize).max(1);
        let mut buf = vec![0u8; bytes_to_corrupt];
        file.read_exact(&mut buf)
            .map_err(|e| format!("Read failed on {}: {}", path.display(), e))?;

        for b in buf.iter_mut() {
            *b ^= 0xFF;
        }

        file.seek(SeekFrom::Start(midpoint))
            .map_err(|e| format!("Seek back failed on {}: {}", path.display(), e))?;
        file.write_all(&buf)
            .map_err(|e| format!("Write failed on {}: {}", path.display(), e))?;
    }

    file.sync_all()
        .map_err(|e| format!("Flush failed on {}: {}", path.display(), e))?;

    Ok(())
}

/// Exports recorded benchmark runs into standard CSV string.
pub fn export_benchmarks_csv(runs: &[BenchmarkRun]) -> String {
    let mut csv = String::new();
    csv.push_str("run_id,timestamp,scenario,file_size_bytes,storage_overhead,encode_ms,detection_ms,reconstruction_ms,healing_ms,packet_loss_pct,bandwidth_efficiency,fault_tolerance,integrity_verified\n");
    for run in runs {
        csv.push_str(&format!(
            "{},\"{}\",\"{}\",{},{:.2},{},{},{},{},{:.1},{:.2},\"{}\",{}\n",
            run.run_id,
            run.timestamp,
            run.scenario,
            run.file_size_bytes,
            run.storage_overhead,
            run.encode_ms,
            run.detection_ms,
            run.reconstruction_ms,
            run.healing_ms,
            run.packet_loss_pct,
            run.bandwidth_efficiency,
            run.fault_tolerance,
            run.integrity_verified
        ));
    }
    csv
}

// Minimal internal hex decoder helper to avoid external hex dependency
mod hex {
    pub fn decode(s: &str) -> Result<Vec<u8>, ()> {
        if s.len() % 2 != 0 {
            return Err(());
        }
        let mut bytes = Vec::with_capacity(s.len() / 2);
        for chunk in s.as_bytes().chunks(2) {
            let high = from_hex_digit(chunk[0]).ok_or(())?;
            let low = from_hex_digit(chunk[1]).ok_or(())?;
            bytes.push((high << 4) | low);
        }
        Ok(bytes)
    }

    fn from_hex_digit(b: u8) -> Option<u8> {
        match b {
            b'0'..=b'9' => Some(b - b'0'),
            b'a'..=b'f' => Some(b - b'a' + 10),
            b'A'..=b'F' => Some(b - b'A' + 10),
            _ => None,
        }
    }
}
