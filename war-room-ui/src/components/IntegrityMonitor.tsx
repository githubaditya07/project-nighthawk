import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

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
    <div className="editorial-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-xs font-sans font-semibold text-charcoal uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-powder-blue-dark" /> Cryptographic Integrity &amp; Recovery Monitor
        </h3>
        <span className="text-[11px] font-mono font-medium text-sage bg-sage-bg px-2.5 py-0.5 rounded-full border border-sage-light">
          Blake3 256-Bit
        </span>
      </div>

      {/* Two Distinct Stages Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-beige-light p-4 rounded-xl border border-border">
          <div className="text-[10px] font-sans uppercase tracking-wider text-powder-blue-dark font-semibold mb-1.5">
            Stage 1 &middot; File Reconstruction
          </div>
          <div className="text-xs font-mono text-dark-grey">
            {reconstructionMs > 0 ? (
              <span className="text-sage font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Complete in {reconstructionMs} ms
              </span>
            ) : (
              <span className="text-mid-grey italic font-sans">Awaiting trigger</span>
            )}
          </div>
        </div>

        <div className="bg-beige-light p-4 rounded-xl border border-border">
          <div className="text-[10px] font-sans uppercase tracking-wider text-dusty-pink-dark font-semibold mb-1.5">
            Stage 2 &middot; Network Self-Healing
          </div>
          <div className="text-xs font-mono text-dark-grey">
            {healingMs > 0 ? (
              <span className="text-sage font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> 12/12 Restored in {healingMs} ms
              </span>
            ) : (
              <span className="text-mid-grey italic font-sans">Awaiting trigger</span>
            )}
          </div>
        </div>
      </div>

      {/* Cherry Alert: Corrupted Shard Rejected Card */}
      {rejectedShardAlert && (
        <div className="bg-cherry-bg border border-cherry-light rounded-xl p-4 flex items-start gap-3 node-transition">
          <ShieldAlert className="w-5 h-5 text-cherry shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="text-cherry font-sans font-bold uppercase tracking-wide">
              Security Audit: Corrupted Shard Rejected
            </div>
            <div className="text-dark-grey font-mono text-[11px] mt-1">{rejectedShardAlert}</div>
            <div className="text-cherry/80 font-sans text-[11px] mt-1">
              Tampered shard excluded from Reed-Solomon interpolation pool.
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Hash Comparison */}
      <div className="bg-beige-light rounded-xl p-4 border border-border space-y-3 text-xs">
        <div>
          <span className="text-mid-grey font-sans text-[11px] font-medium block mb-1.5">
            Original Blake3 Digest
          </span>
          <div className="bg-white p-2.5 rounded-lg text-[11px] text-powder-blue-dark break-all border border-border font-mono">
            {originalHash || '— Pending File Ingestion —'}
          </div>
        </div>

        <div>
          <span className="text-mid-grey font-sans text-[11px] font-medium block mb-1.5">
            Reconstructed Blake3 Digest
          </span>
          <div
            className={`p-2.5 rounded-lg text-[11px] break-all border font-mono node-transition ${
              matched === true
                ? 'bg-sage-bg text-sage border-sage-light font-semibold'
                : matched === false
                ? 'bg-cherry-bg text-cherry border-cherry-light font-semibold'
                : 'bg-white text-mid-grey border-border'
            }`}
          >
            {reconstructedHash || '— Pending Reconstruction (Trigger 8-of-12) —'}
          </div>
        </div>
      </div>

      {/* Verification Status Banner */}
      {matched === true && (
        <div className="bg-sage-bg border border-sage-light rounded-xl p-4 text-center node-transition">
          <div className="flex items-center justify-center gap-2 text-sage font-sans font-bold text-sm tracking-wide">
            <CheckCircle2 className="w-5 h-5" />
            INTEGRITY VERIFIED &mdash; BIT-EXACT MATCH
          </div>
          <p className="text-xs font-sans text-dark-grey/80 mt-1">
            Galois Field GF(2^8) matrix inversion recovered 100% of payload bits despite offline nodes &amp; disk bit rot.
          </p>
        </div>
      )}

      {matched === false && (
        <div className="bg-cherry-bg border border-cherry-light rounded-xl p-4 text-center node-transition">
          <div className="flex items-center justify-center gap-2 text-cherry font-sans font-bold text-sm tracking-wide">
            <AlertTriangle className="w-5 h-5" />
            HASH MISMATCH DETECTED
          </div>
          <p className="text-xs font-sans text-dark-grey/80 mt-1">
            Data integrity compromised. Reconstructed digest does not match original file hash.
          </p>
        </div>
      )}
    </div>
  );
};
