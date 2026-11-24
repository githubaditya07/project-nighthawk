#!/usr/bin/env python3
"""
Project NIGHTHAWK — Deterministic Test Payload Generator
IEEE BMSIT&M Winter of Projects 2026 (Track: COMSOC-SW-02)
Team StrawHats
"""

import sys
import os
import argparse

def generate_file(filename: str, size_mb: float):
    target_bytes = int(size_mb * 1024 * 1024)
    chunk_size = 1024 * 1024  # 1 MB chunk
    print(f"[NIGHTHAWK] Generating {filename} ({size_mb} MB = {target_bytes:,} bytes)...")

    # Deterministic pattern: sequential 4-byte counter + repeating ASCII
    written = 0
    with open(filename, "wb") as f:
        counter = 0
        while written < target_bytes:
            remaining = target_bytes - written
            current_chunk_size = min(chunk_size, remaining)
            
            # Fill chunk with repeating pattern based on block index
            chunk = bytearray(current_chunk_size)
            for i in range(0, current_chunk_size, 4):
                val = (counter + (i // 4)) & 0xFFFFFFFF
                slice_len = min(4, current_chunk_size - i)
                chunk[i : i + slice_len] = val.to_bytes(4, byteorder="big")[:slice_len]
            
            f.write(chunk)
            written += current_chunk_size
            counter += current_chunk_size // 4
            
    actual_size = os.path.getsize(filename)
    print(f"[NIGHTHAWK] Successfully generated {filename} ({actual_size:,} bytes).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate deterministic test payload for Project NIGHTHAWK")
    parser.add_argument("-o", "--output", default="test_50mb.bin", help="Output file path (default: test_50mb.bin)")
    parser.add_argument("-s", "--size", type=float, default=50.0, help="Size in MB (default: 50.0)")
    args = parser.parse_args()

    generate_file(args.output, args.size)
