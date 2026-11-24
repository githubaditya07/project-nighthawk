import React, { useState, useEffect, useRef } from 'react';
import { HudBar } from './components/HudBar';
import { TopologyRing } from './components/TopologyRing';
import { NodeDrawer } from './components/NodeDrawer';
import { FileManager } from './components/FileManager';
import { ShardMatrix } from './components/ShardMatrix';
import { ChaosConsole } from './components/ChaosConsole';
import { IntegrityMonitor } from './components/IntegrityMonitor';
import { EventTimeline, LogItem } from './components/EventTimeline';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { SystemSnapshot, NodeInfo, TelemetryEvent, DropletStats } from './types';

const API_BASE = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws/telemetry';

export const App: React.FC = () => {
  const [state, setState] = useState<SystemSnapshot | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState<'idle' | 'distributing' | 'reconstructing' | 'healing'>('idle');
  const [regeneratedShards, setRegeneratedShards] = useState<number[]>([]);
  const [rejectedShardAlert, setRejectedShardAlert] = useState<string | null>(null);
  const [lastRecoveryMs, setLastRecoveryMs] = useState<number>(0);
  const [dropletStats, setDropletStats] = useState<DropletStats | null>(null);

  // Fetch initial state snapshot
  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state`);
      if (res.ok) {
        const data: SystemSnapshot = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // WebSocket Live Telemetry Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        addLog({
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          code: 'WS_CONNECTED',
          message: 'Connected to NIGHTHAWK high-throughput telemetry stream on ws://localhost:8080/ws/telemetry',
        });
      };

      ws.onmessage = (event) => {
        try {
          const telemetry: TelemetryEvent = JSON.parse(event.data);
          handleTelemetryEvent(telemetry);
        } catch (e) {
          console.error('Failed to parse telemetry JSON:', e);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  const addLog = (log: LogItem) => {
    setLogs((prev) => [...prev.slice(-150), log]);
  };

  const handleTelemetryEvent = (event: TelemetryEvent) => {
    switch (event.type) {
      case 'Log':
        addLog({
          id: Math.random().toString(),
          timestamp: event.payload.timestamp,
          level: event.payload.level,
          code: event.payload.code,
          message: event.payload.message,
        });
        break;

      case 'FileEncoded':
        fetchState();
        setActiveAnimation('distributing');
        setTimeout(() => setActiveAnimation('idle'), 2500);
        break;

      case 'NodeStatusChanged':
        fetchState();
        break;

      case 'CorruptedShardRejected':
        setRejectedShardAlert(
          `Node ${event.payload.node_id} (Shard ${event.payload.shard_id}) failed Blake3 hash check. Expected: ${event.payload.expected_hash.slice(0, 10)}... Actual: ${event.payload.actual_hash.slice(0, 10)}...`
        );
        fetchState();
        break;

      case 'ReconstructionStarted':
        setActiveAnimation('reconstructing');
        break;

      case 'IntegrityVerified':
        setLastRecoveryMs(Number(event.payload.reconstruction_ms));
        fetchState();
        setTimeout(() => setActiveAnimation('idle'), 2000);
        break;

      case 'ShardRegenerated':
        setRegeneratedShards((prev) => [...prev, event.payload.shard_id]);
        break;

      case 'RedundancyRestored':
        setActiveAnimation('healing');
        setRejectedShardAlert(null);
        setLastRecoveryMs(Number(event.payload.healing_ms));
        fetchState();
        setTimeout(() => setActiveAnimation('idle'), 2500);
        break;

      case 'DropletProgress':
        setDropletStats(event.payload);
        break;

      case 'SystemReset':
        setRegeneratedShards([]);
        setRejectedShardAlert(null);
        setLastRecoveryMs(0);
        setDropletStats(null);
        setSelectedNode(null);
        fetchState();
        break;

      default:
        fetchState();
        break;
    }
  };

  // 1. Upload File
  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setActiveAnimation('distributing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setIsUploading(false);
      setTimeout(() => setActiveAnimation('idle'), 1500);
    }
  };

  // 2. Generate and Upload synthetic test payload
  const handleGenerateAndUpload = async (sizeMb: number) => {
    setIsUploading(true);
    setActiveAnimation('distributing');
    try {
      const totalBytes = Math.floor(sizeMb * 1024 * 1024);
      const buffer = new Uint8Array(totalBytes);
      // Fast deterministic pattern fill
      for (let i = 0; i < totalBytes; i += 4) {
        const val = (i / 4) & 0xff;
        buffer[i] = val;
        buffer[i + 1] = (val + 1) & 0xff;
        buffer[i + 2] = (val + 2) & 0xff;
        buffer[i + 3] = (val + 3) & 0xff;
      }
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const file = new File([blob], `nighthawk_test_${sizeMb}mb.bin`);
      await handleUploadFile(file);
    } catch (e) {
      console.error('Generate payload failed:', e);
      setIsUploading(false);
    }
  };

  // 3. Kill Nodes
  const handleKillNodes = async (count: number, random: boolean) => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/chaos/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, random }),
      });
      await fetchState();
    } catch (e) {
      console.error('Kill nodes failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Corrupt Shard
  const handleCorruptShard = async (nodeId: number) => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/chaos/corrupt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId }),
      });
      await fetchState();
    } catch (e) {
      console.error('Corrupt shard failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Reconstruct
  const handleReconstruct = async () => {
    setIsProcessing(true);
    setActiveAnimation('reconstructing');
    try {
      await fetch(`${API_BASE}/api/reconstruct`, { method: 'POST' });
      await fetchState();
    } catch (e) {
      console.error('Reconstruction failed:', e);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActiveAnimation('idle'), 2000);
    }
  };

  // 6. Self Heal
  const handleSelfHeal = async () => {
    setIsProcessing(true);
    setActiveAnimation('healing');
    try {
      await fetch(`${API_BASE}/api/heal`, { method: 'POST' });
      await fetchState();
    } catch (e) {
      console.error('Self-healing failed:', e);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActiveAnimation('idle'), 2000);
    }
  };

  // 7. Update Network Impairment
  const handleUpdateNetwork = async (packet_loss_pct: number, latency_ms: number) => {
    try {
      await fetch(`${API_BASE}/api/chaos/network`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet_loss_pct, latency_ms }),
      });
      await fetchState();
    } catch (e) {
      console.error('Network update failed:', e);
    }
  };

  // 8. Download Recovered File
  const handleDownload = () => {
    window.open(`${API_BASE}/api/download`, '_blank');
  };

  // 9. Export Benchmark CSV
  const handleExportCsv = () => {
    window.open(`${API_BASE}/api/benchmarks/export`, '_blank');
  };

  // 10. System Reset
  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch(`${API_BASE}/api/system/reset`, { method: 'POST' });
      await fetchState();
    } catch (e) {
      console.error('Reset failed:', e);
    } finally {
      setIsResetting(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center font-mono">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-4" />
        <div className="text-cyan-400 font-bold text-sm tracking-widest uppercase animate-pulse">
          Connecting to Project NIGHTHAWK Gateway...
        </div>
        <div className="text-slate-500 text-xs mt-2">Listening on http://localhost:8080</div>
      </div>
    );
  }

  const selectedShard = state.manifest?.shards.find(
    (s) => s.node_id === selectedNode?.node_id
  );

  return (
    <div className="min-h-screen bg-obsidian flex flex-col font-sans">
      {/* Top HUD Bar */}
      <HudBar
        state={state}
        onReset={handleReset}
        isResetting={isResetting}
        lastRecoveryMs={lastRecoveryMs}
      />

      {/* Main War-Room Grid */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Top Half: 12-Node Topology Ring + Ingestion File Manager & Chaos Lab */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Topology Ring SVG (7 cols on XL) */}
          <div className="xl:col-span-7">
            <TopologyRing
              nodes={state.nodes}
              selectedNode={selectedNode}
              onSelectNode={(n) => setSelectedNode(n)}
              activeAnimation={activeAnimation}
            />
          </div>

          {/* Controls & File Manager (5 cols on XL) */}
          <div className="xl:col-span-5 space-y-6">
            <FileManager
              manifest={state.manifest}
              canDownload={state.can_download}
              onUploadFile={handleUploadFile}
              onGenerateAndUpload={handleGenerateAndUpload}
              onDownload={handleDownload}
              isUploading={isUploading}
            />

            <ChaosConsole
              onKillNodes={handleKillNodes}
              onCorruptShard={handleCorruptShard}
              onReconstruct={handleReconstruct}
              onSelfHeal={handleSelfHeal}
              onUpdateNetwork={handleUpdateNetwork}
              currentLossPct={state.impairment.packet_loss_pct}
              currentLatencyMs={state.impairment.latency_ms}
              dropletStats={dropletStats}
              activeNodes={state.active_nodes}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Shard Distribution Matrix */}
        <ShardMatrix
          shards={state.manifest?.shards || []}
          nodes={state.nodes}
          regeneratedShards={regeneratedShards}
        />

        {/* Cryptographic Integrity Monitor */}
        <IntegrityMonitor
          originalHash={state.manifest?.original_blake3 || null}
          reconstructedHash={state.reconstructed_blake3}
          matched={state.integrity_verified}
          reconstructionMs={lastRecoveryMs}
          healingMs={state.benchmarks[state.benchmarks.length - 1]?.healing_ms || 0}
          rejectedShardAlert={rejectedShardAlert}
        />

        {/* Bottom Half: Live Audit Log & Benchmark Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <EventTimeline logs={logs} onClearLogs={() => setLogs([])} />
          </div>
          <div className="lg:col-span-7">
            <BenchmarkPanel benchmarks={state.benchmarks} onExportCsv={handleExportCsv} />
          </div>
        </div>
      </main>

      {/* Selected Node Inspector Drawer */}
      <NodeDrawer
        node={selectedNode}
        shard={selectedShard}
        onClose={() => setSelectedNode(null)}
        onKillNode={(id) => handleKillNodes(1, false)}
        onCorruptNode={(id) => handleCorruptShard(id)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs font-mono text-slate-500 bg-obsidian">
        Project NIGHTHAWK • IEEE BMSIT&M Winter of Projects 2026 • Track: COMSOC-SW-02 • Team StrawHats (Aditya, Bhuvanesh, Sneha, Nidhi)
      </footer>
    </div>
  );
};
export default App;
