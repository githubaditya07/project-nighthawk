#!/usr/bin/env bash
# Project NIGHTHAWK — Local Multi-Service Launcher (Linux/macOS)
# IEEE BMSIT&M Winter of Projects 2026 (Track: COMSOC-SW-02)
# Team StrawHats

set -e

echo -e "\033[1;36m============================================================\033[0m"
echo -e "\033[1;37m   PROJECT NIGHTHAWK — WAR-ROOM OPERATIONS SYSTEM\033[0m"
echo -e "\033[1;37m   IEEE BMSIT&M Winter of Projects 2026 (COMSOC-SW-02)\033[0m"
echo -e "\033[1;36m   Team StrawHats: Aditya, Bhuvanesh, Sneha, Nidhi\033[0m"
echo -e "\033[1;36m============================================================\033[0m"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Initialize data folders
DATA_DIR="$ROOT_DIR/data"
mkdir -p "$DATA_DIR"
for i in $(seq -w 1 12); do
    mkdir -p "$DATA_DIR/node_$i"
done

# 2. Check and install frontend dependencies if needed
UI_DIR="$ROOT_DIR/war-room-ui"
if [ ! -d "$UI_DIR/node_modules" ]; then
    echo -e "\033[1;33m[*] Installing War-Room UI dependencies...\033[0m"
    cd "$UI_DIR"
    npm install
    cd "$ROOT_DIR"
fi

cleanup() {
    echo -e "\n\033[1;33m[*] Terminating NIGHTHAWK services...\033[0m"
    kill $GATEWAY_PID 2>/dev/null || true
    kill $UI_PID 2>/dev/null || true
    echo -e "\033[1;32m[✓] Shutdown clean.\033[0m"
}
trap cleanup EXIT INT TERM

# 3. Launch Axum Gateway
echo -e "\033[1;32m[+] Launching Axum Gateway (http://localhost:8080)...\033[0m"
cd "$ROOT_DIR"
cargo run --release -p gateway &
GATEWAY_PID=$!

# 4. Launch Vite UI
echo -e "\033[1;32m[+] Launching War-Room Operations Dashboard (http://localhost:5173)...\033[0m"
cd "$UI_DIR"
npm run dev &
UI_PID=$!

echo -e "\n\033[1;36m[✓] NIGHTHAWK System is LIVE!\033[0m"
echo -e "    - Gateway & REST/WS API : http://localhost:8080"
echo -e "    - War-Room Dashboard   : http://localhost:5173"
echo -e "    - Telemetry Stream      : ws://localhost:8080/ws/telemetry\n"

wait $GATEWAY_PID
