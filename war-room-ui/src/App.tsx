import React, { useState, useEffect } from 'react';
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
import { useScrollReveal } from './hooks/useEditorialMotion';

const API_BASE = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws/telemetry';

const EditorialTitle: React.FC<{ text: string }> = ({ text }) => (
  <span className="inline-block overflow-hidden align-bottom">
    {text.split('').map((char, idx) => (
      <span
        key={idx}
        className="char-reveal"
        style={{ '--char-index': idx } as React.CSSProperties}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ))}
  </span>
);

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

  const shardReveal = useScrollReveal<HTMLDivElement>();
  const integrityReveal = useScrollReveal<HTMLDivElement>();
  const bottomReveal = useScrollReveal<HTMLDivElement>();

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
      <div className="min-h-screen bg-beige flex flex-col items-center justify-center font-sans relative">
        <div className="grain-overlay" />
        <div className="w-11 h-11 rounded-full border-2 border-powder-blue-dark border-t-transparent animate-spin mb-5" />
        <div className="text-charcoal font-serif text-2xl tracking-tight">
          Connecting to Project Nighthawk
        </div>
        <div className="text-mid-grey font-mono text-xs mt-2">
          Listening on http://localhost:8080
        </div>
      </div>
    );
  }

  const selectedShard = state.manifest?.shards.find(
    (s) => s.node_id === selectedNode?.node_id
  );

  return (
    <div className="min-h-screen bg-beige flex flex-col font-sans relative">
      {/* Subtle Paper Grain Overlay */}
      <div className="grain-overlay" />

      {/* Top HUD Bar */}
      <HudBar
        state={state}
        onReset={handleReset}
        isResetting={isResetting}
        lastRecoveryMs={lastRecoveryMs}
      />

      {/* Editorial Hero Masthead */}
      <section className="border-b border-border bg-beige-light/70">
        <div className="max-w-[1640px] mx-auto px-6 py-8 md:py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div
              className="text-[11px] font-mono uppercase tracking-[0.2em] text-dusty-pink-dark mb-2 line-reveal"
              style={{ '--line-delay': 0 } as React.CSSProperties}
            >
              Decentralized Self-Healing Erasure Mesh &middot; Team StrawHats
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-charcoal tracking-tight leading-none">
              <EditorialTitle text="Resilient Storage Architecture" />
            </h2>
            <p
              className="text-sm text-mid-grey mt-3 max-w-2xl leading-relaxed line-reveal"
              style={{ '--line-delay': 3 } as React.CSSProperties}
            >
              Reed-Solomon RS(8,4) over Galois Field GF(2^8) with Blake3 binary Merkle verification — delivering 1.50x storage overhead while withstanding up to four simultaneous node failures.
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-2.5 stagger-entry"
            style={{ '--stagger': 4 } as React.CSSProperties}
          >
            <span className="px-3 py-1.5 rounded-full bg-white border border-border text-xs font-mono text-dark-grey">
              {state.redundancy_level}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-powder-blue-light/30 border border-powder-blue-light text-xs font-mono text-powder-blue-dark">
              50% Storage Savings
            </span>
          </div>
        </div>
      </section>

      {/* Main Editorial Workspace */}
      <main className="flex-1 max-w-[1640px] w-full mx-auto px-4 md:px-6 py-8 space-y-8 relative z-10">
        {/* Top Half: 12-Node Topology Ring + Ingestion File Manager & Chaos Lab */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          {/* Topology Ring SVG (7 cols on XL) */}
          <div
            className="xl:col-span-7 stagger-entry"
            style={{ '--stagger': 1 } as React.CSSProperties}
          >
            <TopologyRing
              nodes={state.nodes}
              selectedNode={selectedNode}
              onSelectNode={(n) => setSelectedNode(n)}
              activeAnimation={activeAnimation}
            />
          </div>

          {/* Controls & File Manager (5 cols on XL) */}
          <div className="xl:col-span-5 space-y-7">
            <div className="stagger-entry" style={{ '--stagger': 2 } as React.CSSProperties}>
              <FileManager
                manifest={state.manifest}
                canDownload={state.can_download}
                onUploadFile={handleUploadFile}
                onGenerateAndUpload={handleGenerateAndUpload}
                onDownload={handleDownload}
                isUploading={isUploading}
              />
            </div>

            <div className="stagger-entry" style={{ '--stagger': 3 } as React.CSSProperties}>
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
        </div>

        {/* Shard Distribution Matrix */}
        <div
          ref={shardReveal.ref}
          className={`reveal-on-scroll ${shardReveal.isVisible ? 'is-visible' : ''}`}
        >
          <ShardMatrix
            shards={state.manifest?.shards || []}
            nodes={state.nodes}
            regeneratedShards={regeneratedShards}
          />
        </div>

        {/* Cryptographic Integrity Monitor */}
        <div
          ref={integrityReveal.ref}
          className={`reveal-on-scroll ${integrityReveal.isVisible ? 'is-visible' : ''}`}
        >
          <IntegrityMonitor
            originalHash={state.manifest?.original_blake3 || null}
            reconstructedHash={state.reconstructed_blake3}
            matched={state.integrity_verified}
            reconstructionMs={lastRecoveryMs}
            healingMs={state.benchmarks[state.benchmarks.length - 1]?.healing_ms || 0}
            rejectedShardAlert={rejectedShardAlert}
          />
        </div>

        {/* Bottom Half: Live Audit Log & Benchmark Panel */}
        <div
          ref={bottomReveal.ref}
          className={`grid grid-cols-1 lg:grid-cols-12 gap-7 reveal-on-scroll ${
            bottomReveal.isVisible ? 'is-visible' : ''
          }`}
        >
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

      {/* Editorial Footer */}
      <footer className="border-t border-border py-5 px-6 text-center text-xs font-sans text-mid-grey bg-beige-light relative z-10">
        Project NIGHTHAWK &middot; IEEE BMSIT&amp;M Winter of Projects 2026 &middot; Track: COMSOC-SW-02 &middot; Team StrawHats (Aditya, Bhuvanesh, Sneha, Nidhi)
      </footer>
    </div>
  );
};

export default App;
