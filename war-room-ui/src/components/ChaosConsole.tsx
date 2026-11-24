import React, { useState } from 'react';
import { Skull, Bomb, ShieldAlert, Cpu, RefreshCw, Zap, Sliders, Wifi } from 'lucide-react';
import { DropletStats } from '../types';

interface ChaosConsoleProps {
  onKillNodes: (count: number, random: boolean) => void;
  onCorruptShard: (nodeId: number) => void;
  onReconstruct: () => void;
  onSelfHeal: () => void;
  onUpdateNetwork: (lossPct: number, latencyMs: number) => void;
  currentLossPct: number;
  currentLatencyMs: number;
  dropletStats: DropletStats | null;
  activeNodes: number;
  isProcessing: boolean;
}

export const ChaosConsole: React.FC<ChaosConsoleProps> = ({
  onKillNodes,
  onCorruptShard,
  onReconstruct,
  onSelfHeal,
  onUpdateNetwork,
  currentLossPct,
  currentLatencyMs,
  dropletStats,
  activeNodes,
  isProcessing,
}) => {
  const [selectedNodeToCorrupt, setSelectedNodeToCorrupt] = useState<number>(3);
  const [lossSlider, setLossSlider] = useState<number>(currentLossPct);
  const [latencySlider, setLatencySlider] = useState<number>(currentLatencyMs);

  const handleNetworkChange = (loss: number, latency: number) => {
    setLossSlider(loss);
    setLatencySlider(latency);
    onUpdateNetwork(loss, latency);
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="text-sm font-bold font-mono text-crimson-400 uppercase tracking-wider flex items-center gap-2">
          <Skull className="w-4 h-4 text-crimson-400" /> Chaos Monkey Fault Injection Lab
        </h3>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          Tolerates 4 of 12 Failures
        </span>
      </div>

      {/* 1. Node Failure Injection Buttons */}
      <div>
        <label className="text-xs font-mono text-slate-400 block mb-2 font-semibold">
          Simulate Node Crash Failures:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => onKillNodes(1, false)}
            disabled={isProcessing || activeNodes <= 8}
            className="flex items-center justify-center gap-1.5 bg-crimson-500/10 hover:bg-crimson-500/20 text-crimson-300 border border-crimson-500/30 rounded-lg py-2 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
          >
            <Bomb className="w-3.5 h-3.5" /> KILL 1 NODE
          </button>
          <button
            onClick={() => onKillNodes(2, false)}
            disabled={isProcessing || activeNodes <= 8}
            className="flex items-center justify-center gap-1.5 bg-crimson-500/10 hover:bg-crimson-500/20 text-crimson-300 border border-crimson-500/30 rounded-lg py-2 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
          >
            <Bomb className="w-3.5 h-3.5" /> KILL 2 NODES
          </button>
          <button
            onClick={() => onKillNodes(4, false)}
            disabled={isProcessing || activeNodes < 12}
            className="flex items-center justify-center gap-1.5 bg-crimson-500/20 hover:bg-crimson-500/30 text-crimson-200 border border-crimson-500/50 rounded-lg py-2 font-mono text-xs font-extrabold transition-all shadow-md shadow-crimson-900/30 active:scale-95 disabled:opacity-40"
          >
            <Skull className="w-3.5 h-3.5 text-crimson-400" /> KILL 4 NODES
          </button>
          <button
            onClick={() => onKillNodes(1, true)}
            disabled={isProcessing || activeNodes <= 8}
            className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg py-2 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" /> KILL RANDOM
          </button>
        </div>
      </div>

      {/* 2. Physical Bit-Rot Corruption */}
      <div className="bg-slate-900/70 p-3.5 rounded-lg border border-slate-800">
        <label className="text-xs font-mono text-slate-300 block mb-2 font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" /> Physical Shard Disk Bit-Rot Injection:
        </label>
        <div className="flex gap-2">
          <select
            value={selectedNodeToCorrupt}
            onChange={(e) => setSelectedNodeToCorrupt(Number(e.target.value))}
            className="bg-slate-800 text-white font-mono text-xs border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-amber-400"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Node {i + 1 < 10 ? `0${i + 1}` : i + 1} ({i < 8 ? `Data D${i}` : `Parity P${i - 8}`})
              </option>
            ))}
          </select>
          <button
            onClick={() => onCorruptShard(selectedNodeToCorrupt)}
            disabled={isProcessing}
            className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg py-2 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
          >
            CORRUPT SHARD (FLIP 16 BYTES ON DISK)
          </button>
        </div>
      </div>

      {/* 3. Core Action Triggers: Reconstruct vs Self-Heal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          onClick={onReconstruct}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black rounded-lg py-3 font-mono text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Cpu className="w-4 h-4" />
          RECONSTRUCT FILE (8-OF-12 SURVIVING)
        </button>

        <button
          onClick={onSelfHeal}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg py-3 font-mono text-xs font-extrabold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          SELF-HEAL MESH (RESTORE 12/12)
        </button>
      </div>

      {/* 4. Network Impairment & Fountain Droplet Bar */}
      <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-300 font-bold">
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" /> Network Impairment Simulation
          </span>
          <span className="text-[10px] text-slate-400">P1 Prototype Layer</span>
        </div>

        {/* Sliders */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Packet Loss Rate:</span>
              <span className="text-amber-400 font-bold">{lossSlider}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={lossSlider}
              onChange={(e) => handleNetworkChange(Number(e.target.value), latencySlider)}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Simulated Latency:</span>
              <span className="text-purple-400 font-bold">{latencySlider} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="25"
              value={latencySlider}
              onChange={(e) => handleNetworkChange(lossSlider, Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Live Droplet Transfer Stats */}
        {dropletStats && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px]">
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-400">Coded Fountain Droplet Recovery:</span>
              <span className="text-emerald-400 font-bold">
                {dropletStats.decoded ? 'DECODED (Overcame Loss)' : 'PENDING'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
              <div
                style={{
                  width: `${(dropletStats.received_droplets / dropletStats.sent_droplets) * 100}%`,
                }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title="Received Droplets"
              />
              <div
                style={{
                  width: `${(dropletStats.lost_droplets / dropletStats.sent_droplets) * 100}%`,
                }}
                className="bg-crimson-500 h-full transition-all duration-300"
                title="Lost Droplets"
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>Sent: {dropletStats.sent_droplets} droplets</span>
              <span>Received: {dropletStats.received_droplets}</span>
              <span className="text-crimson-400">Lost: {dropletStats.lost_droplets}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
