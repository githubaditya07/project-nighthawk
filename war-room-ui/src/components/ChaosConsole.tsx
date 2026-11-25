import React, { useState } from 'react';
import { Skull, Bomb, ShieldAlert, Cpu, RefreshCw, Zap, Sliders } from 'lucide-react';
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
    <div className="editorial-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-xs font-sans font-semibold text-cherry uppercase tracking-widest flex items-center gap-2">
          <Skull className="w-4 h-4 text-cherry" /> Chaos Fault Injection Lab
        </h3>
        <span className="text-[11px] font-mono text-mid-grey bg-beige-light px-2.5 py-0.5 rounded-full border border-border">
          Tolerates 4 / 12
        </span>
      </div>

      {/* 1. Node Failure Injection Buttons */}
      <div>
        <label className="text-xs font-sans text-dark-grey block mb-2.5 font-medium">
          Simulate Node Crash Failures
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => onKillNodes(1, false)}
            disabled={isProcessing || activeNodes <= 8}
            className="flex items-center justify-center gap-1.5 bg-cherry-bg hover:bg-cherry text-cherry hover:text-white border border-cherry-light hover:border-cherry rounded-xl py-2 font-mono text-[11px] font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
          >
            <Bomb className="w-3.5 h-3.5" /> Kill 1
          </button>
          <button
            onClick={() => onKillNodes(2, false)}
            disabled={isProcessing || activeNodes <= 8}
            className="flex items-center justify-center gap-1.5 bg-cherry-bg hover:bg-cherry text-cherry hover:text-white border border-cherry-light hover:border-cherry rounded-xl py-2 font-mono text-[11px] font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
          >
            <Bomb className="w-3.5 h-3.5" /> Kill 2
          </button>
          <button
            onClick={() => onKillNodes(4, false)}
            disabled={isProcessing || activeNodes < 12}
            className="flex items-center justify-center gap-1.5 bg-cherry hover:bg-cherry/90 text-white border border-cherry rounded-xl py-2 font-mono text-[11px] font-semibold transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-40"
          >
            <Skull className="w-3.5 h-3.5" /> Kill 4
          </button>
          <button
            onClick={() => onKillNodes(1, true)}
            disabled={isProcessing || activeNodes <= 8}
            className="flex items-center justify-center gap-1.5 bg-amber-bg hover:bg-amber text-amber hover:text-white border border-amber-light hover:border-amber rounded-xl py-2 font-mono text-[11px] font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" /> Random
          </button>
        </div>
      </div>

      {/* 2. Physical Bit-Rot Corruption */}
      <div className="bg-beige-light p-4 rounded-xl border border-border">
        <label className="text-xs font-sans text-dark-grey block mb-2.5 font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber" /> Physical Shard Disk Bit-Rot Injection
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedNodeToCorrupt}
            onChange={(e) => setSelectedNodeToCorrupt(Number(e.target.value))}
            className="bg-white text-charcoal font-mono text-xs border border-border rounded-xl px-3 py-2 outline-none focus:border-powder-blue-dark transition-colors"
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
            className="flex-1 bg-amber-bg hover:bg-amber text-amber hover:text-white border border-amber-light hover:border-amber rounded-xl py-2 px-3 font-sans text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
          >
            Corrupt Shard (Flip 16 Bytes)
          </button>
        </div>
      </div>

      {/* 3. Core Action Triggers: Reconstruct vs Self-Heal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          onClick={onReconstruct}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 bg-powder-blue-dark hover:bg-powder-blue text-white rounded-xl py-3 px-4 font-sans text-xs font-semibold tracking-wide shadow-sm transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          <Cpu className="w-4 h-4" />
          Reconstruct File (8-of-12)
        </button>

        <button
          onClick={onSelfHeal}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 bg-sage hover:bg-sage/90 text-white rounded-xl py-3 px-4 font-sans text-xs font-semibold tracking-wide shadow-sm transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Self-Heal Mesh (12/12)
        </button>
      </div>

      {/* 4. Network Impairment & Fountain Droplet Bar */}
      <div className="bg-beige-light p-4 rounded-xl border border-border space-y-3.5 text-xs">
        <div className="flex items-center justify-between text-charcoal font-medium">
          <span className="flex items-center gap-2 font-sans">
            <Sliders className="w-4 h-4 text-powder-blue-dark" /> Network Impairment Simulation
          </span>
          <span className="text-[10px] font-mono text-mid-grey bg-white px-2 py-0.5 rounded-full border border-border">
            P1 Prototype
          </span>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-mid-grey font-sans">Packet Loss Rate</span>
              <span className="text-amber font-mono font-semibold">{lossSlider}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={lossSlider}
              onChange={(e) => handleNetworkChange(Number(e.target.value), latencySlider)}
              className="w-full accent-amber cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-mid-grey font-sans">Simulated Latency</span>
              <span className="text-dusty-pink-dark font-mono font-semibold">{latencySlider} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="25"
              value={latencySlider}
              onChange={(e) => handleNetworkChange(lossSlider, Number(e.target.value))}
              className="w-full accent-dusty-pink-dark cursor-pointer"
            />
          </div>
        </div>

        {/* Live Droplet Transfer Stats */}
        {dropletStats && (
          <div className="mt-3 pt-3 border-t border-border text-[11px]">
            <div className="flex justify-between mb-2">
              <span className="text-mid-grey font-sans">Fountain Droplet Recovery</span>
              <span className="text-sage font-mono font-semibold">
                {dropletStats.decoded ? 'DECODED (Overcame Loss)' : 'PENDING'}
              </span>
            </div>
            <div className="w-full bg-white border border-border rounded-full h-2.5 overflow-hidden flex">
              <div
                style={{
                  width: `${(dropletStats.received_droplets / dropletStats.sent_droplets) * 100}%`,
                }}
                className="bg-sage h-full transition-all duration-500"
                title="Received Droplets"
              />
              <div
                style={{
                  width: `${(dropletStats.lost_droplets / dropletStats.sent_droplets) * 100}%`,
                }}
                className="bg-cherry h-full transition-all duration-500"
                title="Lost Droplets"
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-mono text-mid-grey">
              <span>Sent: {dropletStats.sent_droplets}</span>
              <span className="text-sage font-medium">Received: {dropletStats.received_droplets}</span>
              <span className="text-cherry font-medium">Lost: {dropletStats.lost_droplets}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
