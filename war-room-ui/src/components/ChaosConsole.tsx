import React from 'react';
import { Skull, ZapOff, ShieldAlert, Sparkles, Sliders, Dices } from 'lucide-react';
import { DropletStats, NodeInfo } from '../types';
import { DropletCanvas } from './DropletCanvas';

export interface ChaosLogItem {
  id: string;
  timestamp: string;
  level: string;
  code: string;
  message: string;
}

interface ChaosConsoleProps {
  nodes: NodeInfo[];
  onKillNodes: (count: number, random: boolean) => void;
  onCorruptShard: (nodeId: number) => void;
  onChaosRoulette: () => void;
  onSelfHeal: () => void;
  onUpdateNetwork: (lossPct: number, latencyMs: number) => void;
  onReset: () => void;
  currentLossPct: number;
  currentLatencyMs: number;
  dropletStats: DropletStats | null;
  activeNodes: number;
  isProcessing: boolean;
  logs: ChaosLogItem[];
  onClearLogs: () => void;
}

export const ChaosConsole: React.FC<ChaosConsoleProps> = ({
  nodes,
  onKillNodes,
  onCorruptShard,
  onChaosRoulette,
  onSelfHeal,
  onUpdateNetwork,
  onReset,
  currentLossPct,
  currentLatencyMs,
  dropletStats,
  activeNodes,
  isProcessing,
  logs,
  onClearLogs,
}) => {
  const offlineCount = 12 - activeNodes;

  return (
    <div className="editorial-card rounded-2xl p-6 sm:p-7 space-y-5 reveal-on-scroll">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#4D8FB8]" />
          <span>Chaos &amp; Healing Controls</span>
        </h3>
        <span
          id="lab-shard-counter"
          className="font-mono-tech text-xs px-2.5 py-1 rounded-full border"
          style={{
            backgroundColor:
              offlineCount > 4 ? '#FAEAEA' : offlineCount > 0 ? '#FBF2E8' : '#EAF2EA',
            color:
              offlineCount > 4 ? '#B5363A' : offlineCount > 0 ? '#C8853A' : '#7A9E7E',
            borderColor:
              offlineCount > 4 ? '#E8AAAC' : offlineCount > 0 ? '#E8C89A' : '#B4CDB6',
          }}
        >
          {activeNodes} / 12 Shards
        </span>
      </div>

      {/* Prominent Judge Chaos Roulette Stress Trigger */}
      <button
        id="btn-chaos-roulette"
        type="button"
        onClick={onChaosRoulette}
        disabled={isProcessing}
        className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#B5363A] to-[#C8853A] hover:opacity-95 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-45"
      >
        <Dices className="w-4 h-4" />
        <span>JUDGE CHAOS ROULETTE (MAX 4-FAULT STRESS)</span>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          id="btn-kill-2"
          type="button"
          onClick={() => onKillNodes(2, false)}
          disabled={isProcessing || activeNodes <= 8}
          className="px-4 py-3 rounded-xl bg-[#FAEAEA] hover:bg-[#F5D8D8] border border-[#E8AAAC] text-[#B5363A] text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-45"
        >
          <ZapOff className="w-4 h-4" />
          <span>Kill 2 Nodes</span>
        </button>

        <button
          id="btn-kill-4"
          type="button"
          onClick={() => onKillNodes(4, false)}
          disabled={isProcessing || activeNodes < 12}
          className="px-4 py-3 rounded-xl bg-[#FAEAEA] hover:bg-[#F5D8D8] border border-[#E8AAAC] text-[#B5363A] text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-45"
        >
          <Skull className="w-4 h-4" />
          <span>Kill 4 Nodes (Max)</span>
        </button>

        <button
          id="btn-corrupt-bit"
          type="button"
          onClick={() => {
            const online = nodes.filter((n) => n.status === 'Online');
            const target = online.length
              ? online[Math.floor(Math.random() * online.length)]
              : nodes[0];
            if (target) onCorruptShard(target.node_id);
          }}
          disabled={isProcessing}
          className="px-4 py-3 rounded-xl bg-[#FBF2E8] hover:bg-[#F5E4CF] border border-[#E8C89A] text-[#C8853A] text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-45"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bit-Rot (Blake3)</span>
        </button>

        <button
          id="btn-heal-mesh"
          type="button"
          onClick={onSelfHeal}
          disabled={isProcessing}
          className="px-4 py-3 rounded-xl bg-[#EAF2EA] hover:bg-[#DCEAD8] border border-[#B4CDB6] text-[#7A9E7E] text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-45"
        >
          <Sparkles className="w-4 h-4" />
          <span>Auto-Heal to 12/12</span>
        </button>
      </div>

      <div className="pt-2 border-t border-[#E8E4DC] flex items-center justify-between gap-4">
        <div className="text-xs text-[#6B6B6B]">
          Packet Loss Sim:{' '}
          <span className="font-mono-tech font-medium text-[#1A1A1A]">{currentLossPct}%</span>
        </div>
        <input
          id="packet-loss-slider"
          type="range"
          min="0"
          max="40"
          step="5"
          value={currentLossPct}
          onChange={(e) => onUpdateNetwork(Number(e.target.value), currentLatencyMs)}
          className="w-36 accent-[#4D8FB8] cursor-pointer"
        />
        <button
          id="btn-reset-mesh"
          type="button"
          onClick={onReset}
          className="text-xs font-mono-tech uppercase tracking-wider text-[#6B6B6B] hover:text-[#1A1A1A] underline"
        >
          Reset
        </button>
      </div>

      {/* Live Fountain-Droplet Packet Stream Canvas */}
      <DropletCanvas packetLossPct={currentLossPct} dropletStats={dropletStats} />

      {/* Live Event Log */}
      <div className="bg-[#F5F0E8] border border-[#E8E4DC] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[#6B6B6B]">
            War-Room Event Stream
          </span>
          <button
            type="button"
            onClick={onClearLogs}
            className="text-[10px] font-mono-tech text-[#6B6B6B] hover:text-[#1A1A1A] underline"
          >
            Clear
          </button>
        </div>
        <div
          id="event-log"
          className="space-y-1.5 text-xs font-mono-tech text-[#2D2D2D] max-h-36 overflow-y-auto"
        >
          {logs.length === 0 ? (
            <div>
              <span style={{ color: '#7A9E7E', fontWeight: 600 }}>[OK]</span> 12/12 nodes ready
              for RS(8,4) distribution.
            </div>
          ) : (
            logs.slice(0, 12).map((log) => {
              const lvl = log.level.toUpperCase();
              const tagColor =
                lvl === 'ERROR'
                  ? '#B5363A'
                  : lvl === 'WARN'
                  ? '#C8853A'
                  : lvl === 'SUCCESS'
                  ? '#7A9E7E'
                  : '#4D8FB8';
              return (
                <div key={log.id}>
                  <span style={{ color: tagColor, fontWeight: 600 }}>[{log.code || lvl}]</span>{' '}
                  {log.message}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
