# Project NIGHTHAWK - Local Multi-Service Launcher (Windows PowerShell)
# IEEE BMSIT and M Winter of Projects 2026 (Track: COMSOC-SW-02)
# Team StrawHats

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   PROJECT NIGHTHAWK - WAR-ROOM OPERATIONS SYSTEM" -ForegroundColor White
Write-Host "   IEEE BMSIT and M Winter of Projects 2026 (COMSOC-SW-02)" -ForegroundColor White
Write-Host "   Team StrawHats: Aditya, Bhuvanesh, Sneha, Nidhi" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Set Rust toolchain and runtime DLLs in PATH
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$selfContained = "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained"
$gnuBin = "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin"
$binDir = (Resolve-Path (Join-Path $PSScriptRoot "..\bin")).Path
$pathParts = @($binDir, $selfContained, $gnuBin, $cargoBin) | Where-Object { Test-Path $_ }
$env:PATH = ($pathParts -join ";") + ";$env:PATH"

# 1. Initialize local data directories
$DataDir = Join-Path $PSScriptRoot "..\data"
if (-not (Test-Path $DataDir)) {
    Write-Host "[*] Initializing local storage directories..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}
1..12 | ForEach-Object {
    $nodeDir = Join-Path $DataDir ("node_{0:D2}" -f $_)
    if (-not (Test-Path $nodeDir)) {
        New-Item -ItemType Directory -Path $nodeDir -Force | Out-Null
    }
}

# 2. Check and install frontend dependencies if needed
$UIPath = (Resolve-Path (Join-Path $PSScriptRoot "..\war-room-ui")).Path
if (-not (Test-Path (Join-Path $UIPath "node_modules"))) {
    Write-Host "[*] Installing War-Room UI dependencies..." -ForegroundColor Yellow
    Push-Location $UIPath
    & npm.cmd install
    Pop-Location
}

# 3. Start Rust Axum Gateway
Write-Host "[+] Launching Axum Gateway (http://localhost:8080)..." -ForegroundColor Green
$gatewayExe = Join-Path $PSScriptRoot "..\target\release\gateway.exe"
if (Test-Path $gatewayExe) {
    $gatewayJob = Start-Process -FilePath $gatewayExe -PassThru -NoNewWindow
} else {
    $gatewayJob = Start-Process -FilePath "cargo" -ArgumentList "run", "--release", "-p", "gateway" -PassThru -NoNewWindow
}

# 4. Start Vite Frontend
Write-Host "[+] Launching War-Room Operations Dashboard (http://localhost:5173)..." -ForegroundColor Green
Push-Location $UIPath
$uiJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -PassThru -NoNewWindow
Pop-Location

Write-Host "`n[+] NIGHTHAWK System is LIVE!" -ForegroundColor Cyan
Write-Host "    - Gateway and REST/WS API : http://localhost:8080" -ForegroundColor White
Write-Host "    - War-Room Dashboard      : http://localhost:5173" -ForegroundColor White
Write-Host "    - Telemetry Stream         : ws://localhost:8080/ws/telemetry`n" -ForegroundColor White
Write-Host "Press Ctrl+C to shutdown all services." -ForegroundColor DarkGray

try {
    Wait-Process -Id $gatewayJob.Id
} finally {
    Write-Host "`n[*] Terminating NIGHTHAWK services..." -ForegroundColor Yellow
    Stop-Process -Id $gatewayJob.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $uiJob.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[+] Shutdown clean." -ForegroundColor Green
}
