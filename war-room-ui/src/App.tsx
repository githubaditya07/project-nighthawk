import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowDownRight,
  Wind,
  Radar,
  Cpu,
  RefreshCw,
  UploadCloud,
  Download,
  Zap,
} from 'lucide-react';
import { SystemSnapshot, NodeInfo, TelemetryEvent, DropletStats } from './types';
import { AtmosphericStage } from './components/AtmosphericStage';
import { EditorialNav } from './components/EditorialNav';
import { ChaosConsole, ChaosLogItem } from './components/ChaosConsole';
import { IntegrityMonitor } from './components/IntegrityMonitor';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { NodeDrawer } from './components/NodeDrawer';
import {
  ensureAmbientBed,
  playTactileClick,
  playNavWhoosh,
  playThunderStrike,
  playBitRotGlitch,
  playHealChime,
} from './utils/soundEngine';

const API_BASE = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws/telemetry';

const NODE_STATUS_UI = {
  Online: { hex: '#7A9E7E', bg: '#EAF2EA', border: '#B4CDB6', label: 'Healthy' },
  Degraded: { hex: '#C8853A', bg: '#FBF2E8', border: '#E8C89A', label: 'Degraded' },
  Offline: { hex: '#B5363A', bg: '#FAEAEA', border: '#E8AAAC', label: 'Offline' },
  Recovering: { hex: '#4D8FB8', bg: '#EAF3F9', border: '#B8D4E8', label: 'Recovering' },
};

const RevealWords: React.FC<{ text: string; className?: string; as?: 'h2' | 'h3' }> = ({
  text,
  className = '',
  as = 'h2',
}) => {
  const words = text.trim().split(/\s+/);
  const Tag = as;
  return (
    <Tag className={className}>
      {words.map((w, idx) => (
        <React.Fragment key={idx}>
          <span className="char-reveal-word">
            <span
              className="char-reveal-inner"
              style={{ transitionDelay: `${idx * 45}ms` }}
            >
              {w}
            </span>
          </span>
          {idx < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </Tag>
  );
};

export const App: React.FC = () => {
  const [state, setState] = useState<SystemSnapshot | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [logs, setLogs] = useState<ChaosLogItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [rejectedShardAlert, setRejectedShardAlert] = useState<string | null>(null);
  const [lastRecoveryMs, setLastRecoveryMs] = useState<number>(0);
  const [dropletStats, setDropletStats] = useState<DropletStats | null>(null);
  const [inspectRefreshKey, setInspectRefreshKey] = useState<number>(0);

  // Atmospheric UI state
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [swoopTrigger, setSwoopTrigger] = useState(0);
  const [lightningTrigger, setLightningTrigger] = useState(0);
  const [healingTrigger, setHealingTrigger] = useState<{ key: number; targetIndices: number[] }>({
    key: 0,
    targetIndices: [],
  });
  const [altitudePct, setAltitudePct] = useState(100);
  const [activeChapter, setActiveChapter] = useState('flight-story');
  const [toast, setToast] = useState<{ message: string; color: string; visible: boolean }>({
    message: 'System ready.',
    color: '#7A9E7E',
    visible: false,
  });
  const toastTimerRef = useRef<number | null>(null);

  const [countupVals, setCountupVals] = useState({ overhead: '1.50×', survival: '100%', loss: '40%' });
  const countupsDoneRef = useRef(false);

  const showToast = (message: string, color = '#7A9E7E') => {
    setToast({ message, color, visible: true });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
  };

  // Fetch initial state snapshot
  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state`);
      if (res.ok) {
        const data: SystemSnapshot = await res.json();
        setState(data);
        setSelectedNode((prev) =>
          prev ? data.nodes.find((n) => n.node_id === prev.node_id) || null : null
        );
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
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

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

  const addLog = (log: ChaosLogItem) => {
    setLogs((prev) => [log, ...prev.slice(0, 49)]);
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
        setInspectRefreshKey((k) => k + 1);
        break;

      case 'NodeStatusChanged':
        fetchState();
        setInspectRefreshKey((k) => k + 1);
        break;

      case 'CorruptedShardRejected':
        setRejectedShardAlert(
          `Node ${event.payload.node_id} (Shard ${event.payload.shard_id}) failed Blake3 hash check. Expected: ${event.payload.expected_hash.slice(0, 10)}... Actual: ${event.payload.actual_hash.slice(0, 10)}...`
        );
        fetchState();
        setInspectRefreshKey((k) => k + 1);
        break;

      case 'ReconstructionStarted':
        break;

      case 'IntegrityVerified':
        setLastRecoveryMs(Number(event.payload.reconstruction_ms));
        fetchState();
        break;

      case 'ShardRegenerated':
        setHealingTrigger((prev) => ({
          key: prev.key + 1,
          targetIndices: [event.payload.target_node_id - 1],
        }));
        setInspectRefreshKey((k) => k + 1);
        break;

      case 'RedundancyRestored':
        setRejectedShardAlert(null);
        setLastRecoveryMs(Number(event.payload.healing_ms));
        fetchState();
        setInspectRefreshKey((k) => k + 1);
        break;

      case 'DropletProgress':
        setDropletStats(event.payload);
        break;

      case 'SystemReset':
        setRejectedShardAlert(null);
        setLastRecoveryMs(0);
        setDropletStats(null);
        setSelectedNode(null);
        fetchState();
        setInspectRefreshKey((k) => k + 1);
        break;

      default:
        fetchState();
        break;
    }
  };

  useEffect(() => {
    if (!state) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.14 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));

    const chapterIds = ['flight-story', 'topology-lab', 'architecture', 'benchmarks'];
    const onScroll = () => {
      const mid = window.scrollY + window.innerHeight * 0.42;
      let active = chapterIds[0];
      chapterIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= mid) active = id;
      });
      setActiveChapter(active);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const benchSection = document.getElementById('benchmarks');
    let benchObs: IntersectionObserver | null = null;
    if (benchSection) {
      benchObs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !countupsDoneRef.current) {
            countupsDoneRef.current = true;
            const start = performance.now();
            const dur = 1100;
            const tick = (now: number) => {
              const prog = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - prog, 3);
              setCountupVals({
                overhead: `${(1.5 * eased).toFixed(2)}×`,
                survival: `${Math.round(100 * eased)}%`,
                loss: `${Math.round(40 * eased)}%`,
              });
              if (prog < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        },
        { threshold: 0.25 }
      );
      benchObs.observe(benchSection);
    }

    const startAmbient = () => ensureAmbientBed(sfxEnabled, weatherEnabled);
    window.addEventListener('pointerdown', startAmbient, { once: true });

    return () => {
      observer.disconnect();
      benchObs?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', startAmbient);
    };
  }, [Boolean(state)]);

  useEffect(() => {
    ensureAmbientBed(sfxEnabled, weatherEnabled);
  }, [sfxEnabled, weatherEnabled]);

  // 1. Upload File
  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchState();
        setInspectRefreshKey((k) => k + 1);
        playHealChime(2, weatherEnabled);
        showToast(`Encoded "${file.name}" across 12 RS(8,4) shards.`, '#7A9E7E');
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Generate and Upload synthetic test payload
  const handleGenerateAndUpload = async (sizeMb: number) => {
    setIsUploading(true);
    playTactileClick();
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
  const handleKillNodes = async (count: number, random: boolean, nodeIds?: number[]) => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/chaos/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, random, node_ids: nodeIds }),
      });
      await fetchState();
      setInspectRefreshKey((k) => k + 1);
      setLightningTrigger((k) => k + 1);
      playThunderStrike(weatherEnabled);
      showToast(`Simulated ${count}-node failure. Data remains 100% intact.`, '#B5363A');
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
      setInspectRefreshKey((k) => k + 1);
      playBitRotGlitch();
      showToast(`Injected bit-rot on Node N-${String(nodeId).padStart(2, '0')}.`, '#C8853A');
    } catch (e) {
      console.error('Corrupt shard failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4b. Judge Chaos Roulette
  const handleChaosRoulette = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/chaos/roulette`, { method: 'POST' });
      await fetchState();
      setInspectRefreshKey((k) => k + 1);
      setLightningTrigger((k) => k + 1);
      playThunderStrike(weatherEnabled);
      if (res.ok) {
        const data = await res.json();
        showToast(
          `CHAOS ROULETTE: Killed [${data.killed_nodes.join(',')}], corrupted N-${data.corrupted_node_id ?? '—'}, 35% loss!`,
          '#B5363A'
        );
      }
    } catch (e) {
      console.error('Chaos roulette failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Reconstruct
  const handleReconstruct = async () => {
    setIsProcessing(true);
    playTactileClick();
    try {
      await fetch(`${API_BASE}/api/reconstruct`, { method: 'POST' });
      await fetchState();
      playHealChime(3, weatherEnabled);
      showToast('RS(8,4) GF(2⁸) reconstruction & Blake3 check complete.', '#4D8FB8');
    } catch (e) {
      console.error('Reconstruction failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Self Heal
  const handleSelfHeal = async () => {
    setIsProcessing(true);
    setSwoopTrigger((k) => k + 1);
    const affectedIndices = (state?.nodes || [])
      .map((n, idx) => (n.status !== 'Online' ? idx : -1))
      .filter((idx) => idx !== -1);

    try {
      await fetch(`${API_BASE}/api/heal`, { method: 'POST' });
      setHealingTrigger((prev) => ({
        key: prev.key + 1,
        targetIndices: affectedIndices.length ? affectedIndices : [0, 1, 2, 3],
      }));
      affectedIndices.forEach((_, idx) => {
        setTimeout(() => playHealChime(idx, weatherEnabled), (idx + 1) * 180);
      });
      if (affectedIndices.length === 0) playHealChime(0, weatherEnabled);
      await fetchState();
      setInspectRefreshKey((k) => k + 1);
      showToast('Mesh autonomously healed back to 12/12!', '#7A9E7E');
    } catch (e) {
      console.error('Self-healing failed:', e);
    } finally {
      setIsProcessing(false);
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
    playTactileClick();
    window.open(`${API_BASE}/api/download`, '_blank');
  };

  // 9. Export Benchmark CSV
  const handleExportCsv = () => {
    playTactileClick();
    window.open(`${API_BASE}/api/benchmarks/export`, '_blank');
  };

  // 10. System Reset
  const handleReset = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/system/reset`, { method: 'POST' });
      await fetchState();
      setInspectRefreshKey((k) => k + 1);
      playTactileClick();
      showToast('System reset to clean 12/12 state.', '#4D8FB8');
    } catch (e) {
      console.error('Reset failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center">
        <div className="grain-overlay" />
        <div className="w-10 h-10 rounded-full border-2 border-[#4D8FB8] border-t-transparent animate-spin mb-4" />
        <div className="font-serif-editorial text-2xl text-[#1A1A1A]">
          Connecting to Project NIGHTHAWK Mesh...
        </div>
        <div className="font-mono-tech text-xs text-[#6B6B6B] mt-2">
          Listening on http://localhost:8080
        </div>
      </div>
    );
  }

  const activeCount = state.active_nodes;
  const offlineCount = 12 - activeCount;
  const corruptedCount = state.nodes.filter((n) => n.status === 'Degraded').length;
  const degradedOrOffline = offlineCount + corruptedCount;

  const badgeText = `${activeCount} / 12 ${
    offlineCount === 0 && corruptedCount === 0
      ? 'Healthy'
      : offlineCount <= 4
      ? 'Recoverable'
      : 'Critical'
  }`;

  const selectedShard = state.manifest?.shards.find(
    (s) => s.node_id === selectedNode?.node_id
  );

  return (
    <div className="relative min-h-screen">
      {/* Full-Viewport Cinematic 3D & Weather Stage */}
      <AtmosphericStage
        nodes={state.nodes}
        weatherEnabled={weatherEnabled}
        swoopTrigger={swoopTrigger}
        lightningTrigger={lightningTrigger}
        healingTrigger={healingTrigger}
        onSelectNodeIndex={(idx) => {
          if (state.nodes[idx]) setSelectedNode(state.nodes[idx]);
        }}
        onAltitudeChange={setAltitudePct}
      />

      {/* Editorial Chapter Rail */}
      <aside
        id="chapter-rail"
        className="hidden lg:flex flex-col items-end gap-3.5"
        aria-label="Section navigation"
      >
        {[
          { id: 'flight-story', label: '01 Dive' },
          { id: 'topology-lab', label: '02 Mesh' },
          { id: 'architecture', label: '03 RS(8,4)' },
          { id: 'benchmarks', label: '04 Benchmarks' },
        ].map((ch) => (
          <a
            key={ch.id}
            href={`#${ch.id}`}
            data-chapter={ch.id}
            onClick={() => playNavWhoosh()}
            className={`chapter-item group flex items-center gap-2.5 text-[11px] font-mono-tech text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors ${
              activeChapter === ch.id ? 'active' : ''
            }`}
          >
            <span className="chapter-label opacity-70 group-hover:opacity-100 transition-opacity">
              {ch.label}
            </span>
            <span className="chapter-dot w-2 h-1.5 rounded-full bg-[#D4D0CA]" />
          </a>
        ))}
      </aside>

      {/* Node Inspector Drawer with Live Hex X-Ray */}
      <NodeDrawer
        node={selectedNode}
        shard={selectedShard}
        apiBase={API_BASE}
        refreshTrigger={inspectRefreshKey}
        onClose={() => {
          playTactileClick();
          setSelectedNode(null);
        }}
        onCorruptNode={(id) => handleCorruptShard(id)}
        onKillNode={(id) => handleKillNodes(1, false, [id])}
        onHealMesh={handleSelfHeal}
      />

      {/* Toast Banner (Bottom-Right) */}
      <div
        id="toast-banner"
        className={`fixed bottom-6 right-6 z-50 bg-[#FFFFFF] border border-[#E8E4DC] shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-[#1A1A1A] pointer-events-none ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
        }`}
      >
        <span
          id="toast-dot"
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: toast.color }}
        />
        <span id="toast-text" className="font-medium">
          {toast.message}
        </span>
      </div>

      {/* Fixed Top Navigation */}
      <EditorialNav
        weatherEnabled={weatherEnabled}
        sfxEnabled={sfxEnabled}
        onToggleWeather={() => {
          const next = !weatherEnabled;
          setWeatherEnabled(next);
          playTactileClick();
          if (next) setLightningTrigger((k) => k + 1);
          showToast(next ? 'Rain & lightning atmosphere enabled.' : 'Clear sky mode enabled.', '#4D8FB8');
        }}
        onToggleSfx={() => {
          const next = !sfxEnabled;
          setSfxEnabled(next);
          if (next) playTactileClick();
          showToast(next ? 'Interactive Web Audio SFX enabled.' : 'Sound effects muted.', next ? '#7A9E7E' : '#6B6B6B');
        }}
        onCinematicDive={() => {
          setSwoopTrigger((k) => k + 1);
          document.getElementById('topology-lab')?.scrollIntoView({ behavior: 'smooth' });
          playNavWhoosh();
          showToast('Diving into the 12-Node Topology War-Room.', '#4D8FB8');
        }}
      />

      {/* MAIN CONTENT LAYER */}
      <main className="content-layer">
        {/* SECTION 1: HERO */}
        <section
          id="hero"
          className="min-h-screen flex flex-col justify-between pt-28 pb-12 px-5 sm:px-8 lg:pr-14 max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
            <div className="lg:col-span-7 space-y-6">
              <div className="load-stagger stagger-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF7F2]/90 border border-[#E8E4DC] text-xs font-mono-tech uppercase tracking-wider text-[#6B6B6B]">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    offlineCount === 0 ? 'bg-[#7A9E7E]' : offlineCount <= 4 ? 'bg-[#C8853A]' : 'bg-[#B5363A]'
                  }`}
                />
                <span>COMSOC-SW-02 &middot; 12-Node Self-Healing Mesh</span>
              </div>

              <h1 className="load-stagger stagger-2 font-serif-editorial text-5xl sm:text-7xl lg:text-[5.25rem] leading-[0.98] text-[#1A1A1A]">
                When nodes fall,
                <br />
                <span className="italic text-[#4D8FB8]">the hawk dives</span> to heal.
              </h1>

              <p className="load-stagger stagger-3 text-base sm:text-lg text-[#2D2D2D] max-w-xl leading-relaxed">
                Project <strong>NIGHTHAWK</strong> is an autonomous distributed storage mesh powered by
                Reed-Solomon{' '}
                <span className="font-mono-tech text-sm bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E8E4DC]">
                  RS(8,4)
                </span>{' '}
                erasure coding and Blake3 Merkle verification — surviving up to 4 simultaneous node
                kills without losing a single byte.
              </p>

              <div className="load-stagger stagger-4 flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#topology-lab"
                  onClick={() => playNavWhoosh()}
                  className="px-6 py-3 rounded-full bg-[#1A1A1A] text-[#FAF7F2] text-sm font-medium hover:bg-[#2D2D2D] transition-all flex items-center gap-2 shadow-sm"
                >
                  <span>Trigger Chaos Simulation</span>
                  <ArrowDownRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSwoopTrigger((k) => k + 1);
                    playNavWhoosh();
                    showToast('Hawk swoop trajectory replayed.', '#4D8FB8');
                  }}
                  className="px-6 py-3 rounded-full bg-[#FAF7F2]/90 border border-[#D4D0CA] text-[#1A1A1A] text-sm font-medium hover:border-[#7BAFD4] hover:bg-[#FFFFFF] transition-all flex items-center gap-2"
                >
                  <Wind className="w-4 h-4 text-[#C8907A]" />
                  <span>Replay Hawk Swoop</span>
                </button>
              </div>
            </div>

            {/* Right column: live flight telemetry card */}
            <div className="lg:col-span-5 flex lg:justify-end lg:pt-28">
              <div className="load-stagger stagger-5 editorial-card rounded-2xl p-6 w-full max-w-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3">
                  <span className="text-xs font-mono-tech uppercase tracking-wider text-[#6B6B6B]">
                    Live Mesh Telemetry
                  </span>
                  <span
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor:
                        offlineCount === 0 ? '#EAF2EA' : offlineCount <= 4 ? '#FBF2E8' : '#FAEAEA',
                      color:
                        offlineCount === 0 ? '#7A9E7E' : offlineCount <= 4 ? '#C8853A' : '#B5363A',
                      borderColor:
                        offlineCount === 0 ? '#B4CDB6' : offlineCount <= 4 ? '#E8C89A' : '#E8AAAC',
                    }}
                  >
                    {badgeText}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#6B6B6B]">Erasure Scheme</div>
                    <div className="text-xl font-semibold text-[#1A1A1A] mt-0.5">RS(8,4)</div>
                    <div className="text-[11px] font-mono-tech text-[#4D8FB8]">GF(2⁸) &middot; 1.50×</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B6B6B]">Fault Tolerance</div>
                    <div className="text-xl font-semibold text-[#1A1A1A] mt-0.5">4 Nodes</div>
                    <div className="text-[11px] font-mono-tech text-[#C8907A]">Simultaneous Kill</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B6B6B]">Integrity Hash</div>
                    <div className="text-xl font-semibold text-[#1A1A1A] mt-0.5">Blake3</div>
                    <div className="text-[11px] font-mono-tech text-[#6B6B6B]">
                      {lastRecoveryMs > 0 ? `Recovered ${lastRecoveryMs}ms` : 'Merkle Root'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B6B6B]">Eval Payload</div>
                    <div className="text-xl font-semibold text-[#1A1A1A] mt-0.5">
                      {state.manifest
                        ? `${(state.manifest.original_size / (1024 * 1024)).toFixed(1)} MB`
                        : '50 MB'}
                    </div>
                    <div className="text-[11px] font-mono-tech text-[#7A9E7E]">
                      {state.integrity_verified === true
                        ? 'Bit-Exact Verified'
                        : 'Zero-Loss Ready'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono-tech text-[#6B6B6B] pt-8 border-t border-[#E8E4DC]/70">
            <span>SCROLL TO WATCH THE HAWK DIVE INTO THE MESH</span>
            <span id="scroll-pct-label">{String(altitudePct).padStart(2, '0')}% ALTITUDE</span>
          </div>
        </section>

        {/* KINETIC EDITORIAL MARQUEE */}
        <div className="border-y border-[#E8E4DC] bg-[#FAF7F2]/85 backdrop-blur-sm py-3.5 overflow-hidden">
          <div className="marquee-track text-xs font-mono-tech uppercase tracking-[0.2em] text-[#6B6B6B] gap-10">
            {[0, 1].map((dup) => (
              <span key={dup} className="flex items-center gap-10 px-5">
                <span>Reed-Solomon RS(8,4)</span>
                <span className="text-[#7BAFD4]">•</span>
                <span>12-Node Autonomous Mesh</span>
                <span className="text-[#C8907A]">•</span>
                <span>Blake3 Byte-Level Integrity</span>
                <span className="text-[#7A9E7E]">•</span>
                <span>Fountain-Droplet 40% Loss Resilience</span>
                <span className="text-[#7BAFD4]">•</span>
                <span>Zero-Downtime Shard Regeneration</span>
                <span className="text-[#C8907A]">•</span>
              </span>
            ))}
          </div>
        </div>

        {/* SECTION 2: THE SWOOPING HAWK NARRATIVE */}
        <section id="flight-story" className="py-24 sm:py-32 px-5 sm:px-8 max-w-7xl mx-auto">
          <div className="max-w-3xl mb-16 reveal-on-scroll">
            <span className="text-xs font-mono-tech uppercase tracking-widest text-[#4D8FB8]">
              01 / The Autonomous Dive
            </span>
            <RevealWords
              text="Precision surveillance meets instant shard recovery."
              className="font-serif-editorial text-4xl sm:text-6xl text-[#1A1A1A] mt-3 leading-[1.05]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="editorial-card rounded-2xl p-7 reveal-on-scroll">
              <div className="w-10 h-10 rounded-xl bg-[#EAF2EA] border border-[#B4CDB6] flex items-center justify-center text-[#7A9E7E] mb-5">
                <Radar className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono-tech text-[#6B6B6B] mb-1">STAGE 01 &middot; DETECT</div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Continuous Mesh Heartbeat</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Every node in the 12-peer ring reports shard health and Blake3 digests. The moment a
                peer drops or disk-level bit rot is detected, it shifts from{' '}
                <span className="text-[#7A9E7E] font-medium">Sage</span> to{' '}
                <span className="text-[#B5363A] font-medium">Cherry</span>.
              </p>
            </div>

            <div
              className="editorial-card rounded-2xl p-7 reveal-on-scroll"
              style={{ transitionDelay: '100ms' }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#FBF2E8] border border-[#E8C89A] flex items-center justify-center text-[#C8853A] mb-5">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono-tech text-[#6B6B6B] mb-1">STAGE 02 &middot; RECONSTRUCT</div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">GF(2⁸) Galois Reconstruction</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Using any 8 of the 12 shards (8 data + 4 parity), the core Rust codec reconstructs
                missing blocks mathematically — even under 20–40% fountain-droplet packet loss.
              </p>
            </div>

            <div
              className="editorial-card rounded-2xl p-7 reveal-on-scroll"
              style={{ transitionDelay: '200ms' }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#B8D4E8]/40 border border-[#7BAFD4] flex items-center justify-center text-[#4D8FB8] mb-5">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono-tech text-[#6B6B6B] mb-1">STAGE 03 &middot; REGENERATE</div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Autonomous 12/12 Healing</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Regenerated shards are written back to peer storage and verified against the Merkle
                root, restoring full 12/12 redundancy with zero manual intervention.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: INTERACTIVE 3D TOPOLOGY WAR-ROOM */}
        <section
          id="topology-lab"
          className="py-24 sm:py-32 px-5 sm:px-8 bg-[#FAF7F2]/80 border-y border-[#E8E4DC]"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 reveal-on-scroll">
              <div>
                <span className="text-xs font-mono-tech uppercase tracking-widest text-[#C8907A]">
                  02 / Live 3D Topology War-Room
                </span>
                <RevealWords
                  text="Break the mesh. Watch it heal."
                  className="font-serif-editorial text-4xl sm:text-6xl text-[#1A1A1A] mt-2"
                />
              </div>
              <p className="text-sm text-[#6B6B6B] max-w-md">
                Interact with the 12-node ring floating in the 3D scene. Upload real images, videos,
                or binary files, trigger Chaos Roulette, and inspect live disk hex dumps.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: File Upload + ChaosConsole */}
              <div className="lg:col-span-5 space-y-6">
                {/* Real File Ingestion & Recovery Card */}
                <div className="editorial-card rounded-2xl p-6 space-y-4 reveal-on-scroll">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2 text-sm">
                      <UploadCloud className="w-4 h-4 text-[#4D8FB8]" />
                      <span>Payload Ingestion &amp; Recovery</span>
                    </h3>
                    <span className="font-mono-tech text-[11px] px-2.5 py-0.5 rounded-full bg-[#F5F0E8] border border-[#E8E4DC] text-[#6B6B6B]">
                      Up to 50 MB
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="flex-1 min-w-[140px] cursor-pointer px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#FFFFFF] border border-dashed border-[#D4D0CA] hover:border-[#4D8FB8] text-xs font-medium text-[#1A1A1A] transition-all flex items-center justify-center gap-2">
                      <UploadCloud className="w-3.5 h-3.5 text-[#4D8FB8]" />
                      <span>{isUploading ? 'Encoding...' : 'Choose File / Media'}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadFile(e.target.files[0]);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => handleGenerateAndUpload(10)}
                      className="px-3 py-2.5 rounded-xl bg-[#B8D4E8]/35 hover:bg-[#B8D4E8]/60 border border-[#7BAFD4] text-[#4D8FB8] text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" /> 10MB Test
                    </button>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => handleGenerateAndUpload(50)}
                      className="px-3 py-2.5 rounded-xl bg-[#E8C4B4]/35 hover:bg-[#E8C4B4]/60 border border-[#C8907A] text-[#A87060] text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" /> 50MB Stress
                    </button>
                  </div>

                  {state.manifest && (
                    <div className="bg-[#F5F0E8] border border-[#E8E4DC] rounded-xl p-3 text-xs space-y-1.5 font-mono-tech">
                      <div className="flex justify-between text-[#1A1A1A] font-medium">
                        <span className="truncate max-w-[180px]">{state.manifest.filename}</span>
                        <span>{(state.manifest.original_size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <div className="text-[10px] text-[#6B6B6B] truncate" title={state.manifest.original_blake3}>
                        Blake3: {state.manifest.original_blake3}
                      </div>
                      <div className="text-[10px] text-[#4D8FB8] truncate" title={state.manifest.merkle_root}>
                        Merkle: {state.manifest.merkle_root}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleReconstruct}
                      disabled={isProcessing || !state.manifest}
                      className="px-3 py-2.5 rounded-xl bg-[#4D8FB8] hover:bg-[#7BAFD4] text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-45"
                    >
                      <Cpu className="w-3.5 h-3.5" /> Reconstruct File
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!state.can_download}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                        state.can_download
                          ? 'bg-[#7A9E7E] hover:bg-[#6A8E6E] text-white'
                          : 'bg-[#F5F0E8] border border-[#E8E4DC] text-[#6B6B6B] cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Exact
                    </button>
                  </div>
                </div>

                {/* Modular ChaosConsole with Judge Chaos Roulette */}
                <ChaosConsole
                  nodes={state.nodes}
                  onKillNodes={(count, random) => handleKillNodes(count, random)}
                  onCorruptShard={handleCorruptShard}
                  onChaosRoulette={handleChaosRoulette}
                  onSelfHeal={handleSelfHeal}
                  onUpdateNetwork={handleUpdateNetwork}
                  onReset={handleReset}
                  currentLossPct={state.impairment.packet_loss_pct}
                  currentLatencyMs={state.impairment.latency_ms}
                  dropletStats={dropletStats}
                  activeNodes={state.active_nodes}
                  isProcessing={isProcessing}
                  logs={logs}
                  onClearLogs={() => setLogs([])}
                />
              </div>

              {/* Right Column: 12-Node Ring Status + Shard Matrix + IntegrityMonitor (with Media Preview) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="editorial-card rounded-2xl p-6 sm:p-7 reveal-on-scroll">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <h3 className="font-semibold text-[#1A1A1A]">12-Node Ring Status</h3>
                      <p className="text-xs text-[#6B6B6B]">
                        Click any node to open the Live Disk &amp; Hex X-Ray Inspector drawer.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7A9E7E]" />
                        Healthy
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C8853A]" />
                        Degraded
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#B5363A]" />
                        Offline
                      </span>
                    </div>
                  </div>

                  {/* 12 Node Pills Grid */}
                  <div id="nodes-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {state.nodes.map((n) => {
                      const c = NODE_STATUS_UI[n.status];
                      const role = n.node_id <= 8 ? `Data-${n.node_id}` : `Parity-${n.node_id - 8}`;
                      const isSelected = selectedNode?.node_id === n.node_id;
                      return (
                        <button
                          key={n.node_id}
                          type="button"
                          onClick={() => {
                            playTactileClick();
                            setSelectedNode(n);
                          }}
                          className={`node-pill text-left p-3.5 rounded-xl border flex flex-col gap-1 cursor-pointer hover:scale-[1.02] ${
                            isSelected ? 'ring-2 ring-[#1A1A1A]/30' : ''
                          }`}
                          style={{ backgroundColor: c.bg, borderColor: c.border }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono-tech text-xs font-semibold text-[#1A1A1A]">
                              N-{String(n.node_id).padStart(2, '0')}
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: c.hex }}
                            />
                          </div>
                          <div className="text-xs font-medium" style={{ color: c.hex }}>
                            {c.label}
                          </div>
                          <div className="text-[11px] font-mono-tech text-[#6B6B6B]">{role}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Shard Matrix Bar */}
                  <div className="mt-5 pt-4 border-t border-[#E8E4DC]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-mono-tech uppercase tracking-wider text-[#6B6B6B]">
                        {state.manifest
                          ? `${(state.manifest.original_size / (1024 * 1024)).toFixed(1)} MB Payload`
                          : '50 MB Eval Capacity'}{' '}
                        &middot; 8 Data + 4 Parity Matrix
                      </span>
                      <span
                        id="shard-matrix-summary"
                        className="text-xs font-medium"
                        style={{
                          color:
                            degradedOrOffline === 0
                              ? '#7A9E7E'
                              : activeCount >= 8
                              ? '#C8853A'
                              : '#B5363A',
                        }}
                      >
                        {degradedOrOffline === 0
                          ? '12 of 12 shards active — full redundancy'
                          : activeCount >= 8
                          ? `${activeCount} of 12 shards active — reconstruction guaranteed`
                          : `${activeCount} of 12 shards active — below RS(8,4) quorum`}
                      </span>
                    </div>

                    <div id="shard-matrix-bar" className="grid grid-cols-12 gap-1.5">
                      {state.nodes.map((n, idx) => {
                        const c = NODE_STATUS_UI[n.status];
                        const isParity = idx >= 8;
                        return (
                          <div
                            key={n.node_id}
                            onClick={() => {
                              playTactileClick();
                              setSelectedNode(n);
                            }}
                            title={`${isParity ? `Parity-${idx - 7}` : `Data-${idx + 1}`} (${c.label})`}
                            className="h-7 rounded-md border flex items-center justify-center font-mono-tech text-[10px] font-medium transition-all duration-500 cursor-pointer hover:scale-105"
                            style={{
                              backgroundColor: c.bg,
                              borderColor: c.border,
                              color: c.hex,
                            }}
                          >
                            {isParity ? `P${idx - 7}` : `D${idx + 1}`}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#6B6B6B] mt-1.5">
                      <span>D1–D8 &middot; DATA SHARDS</span>
                      <span>P1–P4 &middot; PARITY SHARDS</span>
                    </div>
                  </div>
                </div>

                {/* Modular IntegrityMonitor with In-Browser Media Preview */}
                <IntegrityMonitor
                  originalHash={state.manifest?.original_blake3 || null}
                  reconstructedHash={state.reconstructed_blake3}
                  matched={state.integrity_verified}
                  canDownload={state.can_download}
                  filename={state.manifest?.filename || null}
                  apiBase={API_BASE}
                  reconstructionMs={lastRecoveryMs}
                  healingMs={state.benchmarks[state.benchmarks.length - 1]?.healing_ms || 0}
                  rejectedShardAlert={rejectedShardAlert}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: FROZEN ARCHITECTURE & ENGINEERING SPECS */}
        <section id="architecture" className="py-24 sm:py-32 px-5 sm:px-8 max-w-7xl mx-auto">
          <div className="max-w-3xl mb-14 reveal-on-scroll">
            <span className="text-xs font-mono-tech uppercase tracking-widest text-[#4D8FB8]">
              03 / System Architecture
            </span>
            <RevealWords
              text="Built in Rust & TypeScript for deterministic speed."
              className="font-serif-editorial text-4xl sm:text-6xl text-[#1A1A1A] mt-3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="editorial-card rounded-2xl p-6 reveal-on-scroll">
              <div className="text-xs font-mono-tech text-[#4D8FB8] mb-2">01 &middot; CORE CODEC</div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Reed-Solomon RS(8,4)</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Splits payloads up to 50 MB into 8 data shards + 4 parity shards over{' '}
                <span className="font-mono-tech text-xs">GF(2⁸)</span> with only 1.50× storage
                overhead.
              </p>
            </div>

            <div
              className="editorial-card rounded-2xl p-6 reveal-on-scroll"
              style={{ transitionDelay: '80ms' }}
            >
              <div className="text-xs font-mono-tech text-[#7A9E7E] mb-2">02 &middot; INTEGRITY</div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Blake3 + Merkle Tree</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Every incoming and outgoing shard is hashed with Blake3 and anchored to a Merkle root
                to reject silent bit-level corruption instantly.
              </p>
            </div>

            <div
              className="editorial-card rounded-2xl p-6 reveal-on-scroll"
              style={{ transitionDelay: '160ms' }}
            >
              <div className="text-xs font-mono-tech text-[#C8853A] mb-2">03 &middot; TRANSPORT</div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">XOR LT Fountain Droplets</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Simulates harsh 20–40% packet-loss channels using lightweight XOR fountain-droplet
                encoding and multi-laptop LAN HTTP workers.
              </p>
            </div>

            <div
              className="editorial-card rounded-2xl p-6 reveal-on-scroll"
              style={{ transitionDelay: '240ms' }}
            >
              <div className="text-xs font-mono-tech text-[#C8907A] mb-2">04 &middot; OBSERVABILITY</div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">War-Room &amp; Chaos</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">
                Real-time React + Three.js UI with Judge Chaos Roulette, Live Disk Hex X-Ray, and
                1-click full system reset.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: 5-METRIC BENCHMARKING & SCALE CALCULATOR */}
        <section
          id="benchmarks"
          className="py-24 sm:py-28 px-5 sm:px-8 bg-[#FAF7F2]/85 border-t border-[#E8E4DC]"
        >
          <BenchmarkPanel
            benchmarks={state.benchmarks}
            onExportCsv={handleExportCsv}
            countupVals={countupVals}
          />
        </section>

        <footer className="py-10 px-5 sm:px-8 border-t border-[#E8E4DC] bg-[#F5F0E8] text-xs text-[#6B6B6B]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>Project NIGHTHAWK — Autonomous Self-Healing Storage Mesh</span>
            <span className="font-mono-tech">RS(8,4) &middot; Blake3 &middot; 12-Node Topology</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
