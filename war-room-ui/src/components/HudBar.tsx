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

  const integrityVerified = state.integrity_verified;

  return (
    <header className="border-b border-border px-6 py-3.5 sticky top-0 z-40 bg-white/85 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-[1640px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Editorial Brand Masthead */}
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-beige-light border border-border flex items-center justify-center text-powder-blue-dark shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-serif tracking-tight text-charcoal flex items-center gap-2.5">
                Project Nighthawk
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-powder-blue-light/40 text-powder-blue-dark border border-powder-blue-light">
                  RS(8,4)
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-mid-grey font-sans tracking-wide">
              IEEE BMSIT&M Winter of Projects 2026 &middot; Track{' '}
              <span className="font-mono text-dark-grey font-medium">COMSOC-SW-02</span>
            </p>
          </div>
        </div>

        {/* Telemetry HUD Chips */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Active Nodes */}
          <div className="bg-beige-light border border-border rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 node-transition">
            <div
              className={`w-2.5 h-2.5 rounded-full node-transition ${
                isHealthy
                  ? 'bg-sage'
                  : isDegraded
                  ? 'bg-amber'
                  : 'bg-cherry animate-pulse'
              }`}
            />
            <div>
              <div className="text-[10px] text-mid-grey uppercase font-sans font-medium tracking-wider">
                Active Nodes
              </div>
              <div className="text-sm font-semibold font-mono text-charcoal leading-tight">
                <span
                  className={
                    isHealthy ? 'text-sage' : isDegraded ? 'text-amber' : 'text-cherry'
                  }
                >
                  {state.active_nodes}
                </span>
                <span className="text-mid-grey/70">/12</span>
              </div>
            </div>
          </div>

          {/* Redundancy Status */}
          <div className="bg-beige-light border border-border rounded-xl px-3.5 py-1.5 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-powder-blue-dark" />
            <div>
              <div className="text-[10px] text-mid-grey uppercase font-sans font-medium tracking-wider">
                Redundancy
              </div>
              <div className="text-sm font-semibold font-mono text-charcoal leading-tight">
                1.50x <span className="text-powder-blue-dark">RS(8,4)</span>
              </div>
            </div>
          </div>

          {/* Recovery Latency */}
          <div className="bg-beige-light border border-border rounded-xl px-3.5 py-1.5 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-dusty-pink-dark" />
            <div>
              <div className="text-[10px] text-mid-grey uppercase font-sans font-medium tracking-wider">
                Recovery
              </div>
              <div className="text-sm font-semibold font-mono text-dark-grey leading-tight">
                {lastRecoveryMs > 0 ? `${lastRecoveryMs} ms` : '—'}
              </div>
            </div>
          </div>

          {/* Packet Loss */}
          <div className="bg-beige-light border border-border rounded-xl px-3.5 py-1.5 flex items-center gap-2.5">
            <Wifi
              className={`w-4 h-4 node-transition ${
                state.impairment.packet_loss_pct > 0 ? 'text-amber' : 'text-mid-grey'
              }`}
            />
            <div>
              <div className="text-[10px] text-mid-grey uppercase font-sans font-medium tracking-wider">
                Packet Loss
              </div>
              <div className="text-sm font-semibold font-mono text-charcoal leading-tight">
                {state.impairment.packet_loss_pct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Integrity Badge */}
          <div
            className={`border rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 node-transition ${
              integrityVerified === true
                ? 'bg-sage-bg border-sage-light'
                : integrityVerified === false
                ? 'bg-cherry-bg border-cherry-light'
                : 'bg-beige-light border-border'
            }`}
          >
            {integrityVerified === true ? (
              <ShieldCheck className="w-4 h-4 text-sage" />
            ) : integrityVerified === false ? (
              <ShieldAlert className="w-4 h-4 text-cherry" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-mid-grey" />
            )}
            <div>
              <div className="text-[10px] text-mid-grey uppercase font-sans font-medium tracking-wider">
                Integrity
              </div>
              <div className="text-sm font-semibold font-mono leading-tight">
                {integrityVerified === true ? (
                  <span className="text-sage font-bold">VERIFIED</span>
                ) : integrityVerified === false ? (
                  <span className="text-cherry font-bold">TAMPERED</span>
                ) : (
                  <span className="text-mid-grey">STANDBY</span>
                )}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-2 bg-cherry-bg hover:bg-cherry text-cherry hover:text-white border border-cherry-light hover:border-cherry rounded-xl px-4 py-2 font-sans text-xs font-semibold tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50"
            title="Reset network to clean factory state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Network
          </button>
        </div>
      </div>
    </header>
  );
};
