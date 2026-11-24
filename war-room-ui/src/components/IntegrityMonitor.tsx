import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

interface IntegrityMonitorProps {
  originalHash: string | null;
  reconstructedHash: string | null;
  matched: boolean | null;
  reconstructionMs: number;
  healingMs: number;
  rejectedShardAlert: string | null;
}

export const IntegrityMonitor: React.FC<IntegrityMonitorProps> = ({
  originalHash,
  reconstructedHash,
  matched,
  reconstructionMs,
  healingMs,
  rejectedShardAlert,
}) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" /> Cryptographic Integrity & Recovery Monitor
        </h3>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          Blake3 256-Bit
        </span>
      </div>

      {/* Two Distinct Stages Header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1">
            Stage 1: File Reconstruction
          </div>
          <div className="text-xs font-mono text-slate-300">
            {reconstructionMs > 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete in {reconstructionMs} ms
              </span>
            ) : (
              <span className="text-slate-500 italic">Awaiting trigger</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold mb-1">
            Stage 2: Network Self-Healing
          </div>
          <div className="text-xs font-mono text-slate-300">
            {healingMs > 0 ? (
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> 12/12 Restored in {healingMs} ms
              </span>
            ) : (
              <span className="text-slate-500 italic">Awaiting trigger</span>
            )}
          </div>
        </div>
      </div>

      {/* Red Alert: Corrupted Shard Rejected Card */}
      {rejectedShardAlert && (
        <div className="bg-crimson-950/40 border border-crimson-500/50 rounded-lg p-3 flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-crimson-400 shrink-0 mt-0.5" />
          <div className="font-mono text-xs">
            <div className="text-crimson-300 font-extrabold uppercase">
              SECURITY AUDIT: CORRUPTED SHARD REJECTED
            </div>
            <div className="text-slate-300 text-[11px] mt-0.5">{rejectedShardAlert}</div>
            <div className="text-crimson-400/80 text-[10px] mt-1">
              Tampered shard excluded from Reed-Solomon interpolation pool.
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Hash Comparison */}
      <div className="bg-black/60 rounded-lg p-3.5 border border-slate-800 space-y-3 font-mono text-xs">
        <div>
          <span className="text-slate-400 text-[11px] block mb-1">Original Blake3 Digest:</span>
          <div className="bg-slate-900 p-2 rounded text-[11px] text-cyan-300 break-all border border-slate-800 font-mono">
            {originalHash || '— Pending File Ingestion —'}
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[11px] block mb-1">Reconstructed Blake3 Digest:</span>
          <div
            className={`p-2 rounded text-[11px] break-all border font-mono ${
              matched === true
                ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40'
                : matched === false
                ? 'bg-crimson-950/30 text-crimson-300 border-crimson-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {reconstructedHash || '— Pending Reconstruction (Trigger 8-of-12) —'}
          </div>
        </div>
      </div>

      {/* Prominent Verification Banner */}
      {matched === true && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-3 text-center font-mono">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-sm tracking-wider">
            <CheckCircle2 className="w-5 h-5" />
            INTEGRITY VERIFIED — BIT-EXACT MATCH
          </div>
          <p className="text-[10px] text-emerald-300/80 mt-1">
            Galois Field GF(2^8) math recovered 100% of payload bits despite offline nodes & physical disk bit rot.
          </p>
        </div>
      )}

      {matched === false && (
        <div className="bg-crimson-500/10 border border-crimson-500/40 rounded-lg p-3 text-center font-mono">
          <div className="flex items-center justify-center gap-2 text-crimson-400 font-extrabold text-sm tracking-wider">
            <AlertTriangle className="w-5 h-5" />
            HASH MISMATCH DETECTED
          </div>
          <p className="text-[10px] text-crimson-300/80 mt-1">
            Data integrity compromised. Reconstructed digest does not match original file hash.
          </p>
        </div>
      )}
    </div>
  );
};
