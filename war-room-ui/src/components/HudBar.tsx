import React from 'react';
import { Activity, ShieldCheck, ShieldAlert, Cpu, RotateCcw, Wifi, AlertTriangle } from 'lucide-react';
import { SystemSnapshot } from '../types';

interface HudBarProps {
  state: SystemSnapshot;
  onReset: () => void;
  isResetting: boolean;
  lastRecoveryMs: number;
}

export const HudBar: React.FC<HudBarProps> = ({ state, onReset, isResetting, lastRecoveryMs }) => {
  const isHealthy = state.active_nodes === 12;
  const isDegraded = state.active_nodes >= 8 && state.active_nodes < 12;
  const isCritical = state.active_nodes < 8;

  const integrityVerified = state.integrity_verified;

  return (
    <header className="glass-panel border-b border-cyan-500/20 px-6 py-3 sticky top-0 z-40 bg-obsidian/90 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand / Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shadow-lg shadow-cyan-500/10">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-wider text-white font-mono flex items-center gap-2">
                PROJECT NIGHTHAWK <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">RS(8,4)</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              IEEE BMSIT&M Winter of Projects 2026 • Track: <span className="text-cyan-300">COMSOC-SW-02</span>
            </p>
          </div>
        </div>

        {/* Telemetry HUD Cards */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Active Nodes */}
          <div className="bg-panel border border-slate-700/60 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-emerald-500/50 shadow-md animate-pulse' : isDegraded ? 'bg-amber-500 shadow-amber-500/50 shadow-md' : 'bg-crimson-500 shadow-crimson-500/50 shadow-md animate-ping'}`} />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Active Nodes</div>
              <div className="text-sm font-bold font-mono text-white">
                <span className={isHealthy ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-crimson-400'}>
                  {state.active_nodes}
                </span>
                <span className="text-slate-500">/12</span>
              </div>
            </div>
          </div>

          {/* Redundancy Status */}
          <div className="bg-panel border border-slate-700/60 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Redundancy Status</div>
              <div className="text-sm font-bold font-mono text-cyan-300">
                1.50x RS(8,4)
              </div>
            </div>
          </div>

          {/* Recovery Latency */}
          <div className="bg-panel border border-slate-700/60 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Last Recovery Time</div>
              <div className="text-sm font-bold font-mono text-purple-300">
                {lastRecoveryMs > 0 ? `${lastRecoveryMs} ms` : '—'}
              </div>
            </div>
          </div>

          {/* Packet Loss */}
          <div className="bg-panel border border-slate-700/60 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            <Wifi className={`w-4 h-4 ${state.impairment.packet_loss_pct > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Packet Loss</div>
              <div className="text-sm font-bold font-mono text-white">
                {state.impairment.packet_loss_pct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Integrity Badge */}
          <div className="bg-panel border border-slate-700/60 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            {integrityVerified === true ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : integrityVerified === false ? (
              <ShieldAlert className="w-4 h-4 text-crimson-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-slate-500" />
            )}
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Integrity Badge</div>
              <div className="text-sm font-bold font-mono">
                {integrityVerified === true ? (
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">VERIFIED</span>
                ) : integrityVerified === false ? (
                  <span className="text-crimson-400 font-extrabold flex items-center gap-1">TAMPERED</span>
                ) : (
                  <span className="text-slate-400 font-semibold">STANDBY</span>
                )}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-2 bg-crimson-500/20 hover:bg-crimson-500/30 text-crimson-300 border border-crimson-500/40 hover:border-crimson-500 rounded-lg px-4 py-2 font-mono text-xs font-bold transition-all shadow-md shadow-crimson-900/30 active:scale-95 disabled:opacity-50"
            title="Reset network to clean factory state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            RESET NETWORK
          </button>
        </div>
      </div>
    </header>
  );
};
