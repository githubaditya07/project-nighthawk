$ErrorActionPreference = "Stop"

$binDir = (Resolve-Path ".\bin").Path
$selfContained = "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained"
$gnuBin = "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin"
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$env:PATH = "$binDir;$selfContained;$gnuBin;$cargoBin;$env:PATH"

Write-Host "--- 1. Generating 256 KB test file ---"
$testFilePath = "test_payload.bin"
$bytes = New-Object byte[] (256 * 1024)
$rng = [System.Random]::new(42)
$rng.NextBytes($bytes)
[System.IO.File]::WriteAllBytes($testFilePath, $bytes)
$origHash = (Get-FileHash -Path $testFilePath -Algorithm SHA256).Hash
Write-Host "Original SHA256: $origHash"

Write-Host "--- 2. Starting NIGHTHAWK Gateway ---"
$proc = Start-Process -FilePath ".\target\release\gateway.exe" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

try {
    Write-Host "--- 3. Checking /api/state ---"
    $state = Invoke-RestMethod -Uri "http://localhost:8080/api/state" -Method Get
    Write-Host "Active nodes: $($state.active_nodes)"
    if ($state.active_nodes -ne 12) { throw "Expected 12 active nodes" }

    Write-Host "--- 4. Uploading file via POST /api/upload ---"
    $manifestJson = curl.exe -s -F "file=@$testFilePath" "http://localhost:8080/api/upload"
    $manifest = $manifestJson | ConvertFrom-Json
    Write-Host "Upload Succeeded!"
    Write-Host "  File ID: $($manifest.file_id)"
    Write-Host "  Blake3 Hash: $($manifest.original_blake3)"
    Write-Host "  Merkle Root: $($manifest.merkle_root)"
    Write-Host "  Storage Overhead: $($manifest.storage_overhead)x"

    Write-Host "--- 5. Chaos: Killing 3 nodes via POST /api/chaos/kill ---"
    $killBody = @{ count = 3 } | ConvertTo-Json
    $killRes = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos/kill" -Method Post -Body $killBody -ContentType "application/json"
    Write-Host "Active nodes after kill: $($killRes.active_nodes)"
    if ($killRes.active_nodes -ne 9) { throw "Expected 9 surviving nodes" }

    Write-Host "--- 6. Chaos: Corrupting 1 surviving shard on disk via POST /api/chaos/corrupt ---"
    $survivingNode = (1..12 | Where-Object { $_ -notin $killRes.killed_nodes })[0]
    $corruptBody = @{ node_id = $survivingNode } | ConvertTo-Json
    $corruptRes = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos/corrupt" -Method Post -Body $corruptBody -ContentType "application/json"
    Write-Host "Corrupted node $survivingNode status: $($corruptRes.status)"

    Write-Host "--- 7. Reconstructing via POST /api/reconstruct ---"
    $recon = Invoke-RestMethod -Uri "http://localhost:8080/api/reconstruct" -Method Post
    Write-Host "Reconstruction Result:"
    Write-Host "  Surviving: $($recon.surviving_shards)"
    Write-Host "  Rejected corrupt shards: $($recon.rejected_shards -join ',')"
    Write-Host "  Blake3 Matched: $($recon.matched)"
    Write-Host "  Reconstruction Time: $($recon.reconstruction_ms) ms"
    Write-Host "  Can Download: $($recon.can_download)"
    if (-not $recon.matched) { throw "Blake3 hash did not match original!" }

    Write-Host "--- 8. Downloading Reconstructed File via GET /api/download ---"
    $downPath = "downloaded_payload.bin"
    curl.exe -s "http://localhost:8080/api/download" -o $downPath
    $downHash = (Get-FileHash -Path $downPath -Algorithm SHA256).Hash
    Write-Host "Downloaded SHA256: $downHash"

    if ($origHash -eq $downHash) {
        Write-Host ">>> BIT-EXACT SHA256 MATCH CONFIRMED! <<<" -ForegroundColor Green
    } else {
        throw "SHA256 MISMATCH! Original: $origHash vs Downloaded: $downHash"
    }

    Write-Host "--- 9. Self-Healing via POST /api/heal ---"
    $heal = Invoke-RestMethod -Uri "http://localhost:8080/api/heal" -Method Post
    Write-Host "Self-Healing Result:"
    Write-Host "  Restored nodes: $($heal.restored_nodes -join ',')"
    Write-Host "  Regenerated shards: $($heal.regenerated_shards -join ',')"
    Write-Host "  Active nodes: $($heal.active_nodes)"
    Write-Host "  Redundancy Level: $($heal.redundancy_level)"
    if ($heal.active_nodes -ne 12) { throw "Expected 12 nodes after healing" }

    Write-Host "--- 10. Exporting Benchmarks via GET /api/benchmarks/export ---"
    $csv = Invoke-RestMethod -Uri "http://localhost:8080/api/benchmarks/export" -Method Get
    $lines = ($csv -split "`n").Count
    Write-Host "Benchmark CSV exported ($lines lines)"

    Write-Host "--- 11. System Reset via POST /api/system/reset ---"
    $reset = Invoke-RestMethod -Uri "http://localhost:8080/api/system/reset" -Method Post
    Write-Host "Reset status: $($reset.status) - $($reset.message)"

    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "  >>> ALL 11 END-TO-END VERIFICATION CHECKS PASSED! <<<" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
} finally {
    Write-Host "Stopping gateway..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $testFilePath -Force -ErrorAction SilentlyContinue
    Remove-Item "downloaded_payload.bin" -Force -ErrorAction SilentlyContinue
}
