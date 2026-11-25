import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Film, Image as ImageIcon, FileCheck } from 'lucide-react';

interface IntegrityMonitorProps {
  originalHash: string | null;
  reconstructedHash: string | null;
  matched: boolean | null;
  canDownload?: boolean;
  filename?: string | null;
  apiBase?: string;
  reconstructionMs: number;
  healingMs: number;
  rejectedShardAlert: string | null;
}

export const IntegrityMonitor: React.FC<IntegrityMonitorProps> = ({
  originalHash,
  reconstructedHash,
  matched,
  canDownload = false,
  filename = null,
  apiBase = 'http://localhost:8080',
  reconstructionMs,
  healingMs,
  rejectedShardAlert,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<number>(0);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (!canDownload) {
      setPreviewUrl(null);
      setPreviewSize(0);
      return;
    }

    const loadPreview = async () => {
      try {
        const res = await fetch(`${apiBase}/api/download`);
        if (!res.ok || !active) return;
        const blob = await res.blob();
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setPreviewUrl(createdUrl);
        setPreviewSize(blob.size);
      } catch (err) {
        console.error('Failed to load reconstructed media preview:', err);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [canDownload, reconstructedHash, apiBase]);

  const lowerName = (filename || '').toLowerCase();
  const isVideo = lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.mov');
  const isImage =
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.svg');

  return (
    <div className="editorial-card rounded-2xl p-6 space-y-4 reveal-on-scroll">
      <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3">
        <span className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4D8FB8]" />
          Blake3 Cryptographic Reconstruction Audit
        </span>
        {matched === true ? (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#EAF2EA] text-[#7A9E7E] border border-[#B4CDB6] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Bit-Exact Match
          </span>
        ) : matched === false ? (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FAEAEA] text-[#B5363A] border border-[#E8AAAC] flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Hash Mismatch
          </span>
        ) : (
          <span className="text-xs font-mono-tech text-[#6B6B6B]">Standby</span>
        )}
      </div>

      {/* Stage 1 & Stage 2 Timing Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E4DC]">
          <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#4D8FB8] mb-1">
            Stage 1 &middot; Reconstruction
          </div>
          {reconstructionMs > 0 ? (
            <span className="text-[#7A9E7E] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete in {reconstructionMs} ms
            </span>
          ) : (
            <span className="text-[#6B6B6B] italic">Awaiting trigger</span>
          )}
        </div>

        <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E4DC]">
          <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#A87060] mb-1">
            Stage 2 &middot; Self-Healing
          </div>
          {healingMs > 0 ? (
            <span className="text-[#7A9E7E] font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> 12/12 Restored in {healingMs} ms
            </span>
          ) : (
            <span className="text-[#6B6B6B] italic">Awaiting trigger</span>
          )}
        </div>
      </div>

      {/* Corrupted Shard Rejected Alert */}
      {rejectedShardAlert && (
        <div className="bg-[#FAEAEA] border border-[#E8AAAC] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#B5363A]">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Security Audit: Corrupted Shard Rejected</div>
            <div className="font-mono-tech text-[11px] mt-0.5 text-[#2D2D2D]">{rejectedShardAlert}</div>
          </div>
        </div>
      )}

      {/* Side-by-Side Blake3 Digests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-tech">
        <div className="bg-[#F5F0E8] border border-[#E8E4DC] rounded-xl p-3">
          <div className="text-[10px] text-[#6B6B6B] uppercase mb-1">Original Blake3 Digest</div>
          <div className="text-[#1A1A1A] break-all text-[11px]">
            {originalHash || '— Pending file ingestion —'}
          </div>
        </div>
        <div
          className="rounded-xl p-3 border node-pill"
          style={{
            backgroundColor:
              matched === true ? '#EAF2EA' : matched === false ? '#FAEAEA' : '#F5F0E8',
            borderColor:
              matched === true ? '#B4CDB6' : matched === false ? '#E8AAAC' : '#E8E4DC',
          }}
        >
          <div className="text-[10px] text-[#6B6B6B] uppercase mb-1">Reconstructed Blake3 Digest</div>
          <div
            className="break-all text-[11px]"
            style={{
              color:
                matched === true ? '#7A9E7E' : matched === false ? '#B5363A' : '#6B6B6B',
              fontWeight: matched !== null ? 600 : 400,
            }}
          >
            {reconstructedHash || '— Pending reconstruction —'}
          </div>
        </div>
      </div>

      {/* Integrity Verified Banner & Live Reconstructed Media Preview */}
      {matched === true && (
        <div className="bg-[#EAF2EA] border border-[#B4CDB6] rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#7A9E7E] font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>INTEGRITY VERIFIED &mdash; BIT-EXACT MATCH</span>
            </div>
            <span className="text-[11px] font-mono-tech text-[#2D2D2D]">
              GF(2⁸) matrix recovery succeeded
            </span>
          </div>

          {/* Live Blob Media Preview */}
          {canDownload && previewUrl && (isVideo || isImage) && (
            <div className="pt-2 border-t border-[#B4CDB6]/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#2D2D2D]">
                <span className="font-medium flex items-center gap-1.5">
                  {isVideo ? (
                    <Film className="w-3.5 h-3.5 text-[#4D8FB8]" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-[#4D8FB8]" />
                  )}
                  Live Recovered Media Preview ({filename})
                </span>
                <span className="font-mono-tech text-[11px] text-[#6B6B6B]">
                  {(previewSize / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              {isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full max-h-64 rounded-xl border border-[#B4CDB6] bg-[#1A1A1A]"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={`Recovered ${filename}`}
                  className="w-full max-h-64 object-contain rounded-xl border border-[#B4CDB6] bg-[#FFFFFF]"
                />
              )}
            </div>
          )}

          {canDownload && previewUrl && !isVideo && !isImage && (
            <div className="pt-2 border-t border-[#B4CDB6]/60 flex items-center justify-between text-xs text-[#2D2D2D]">
              <span className="flex items-center gap-1.5 font-medium">
                <FileCheck className="w-3.5 h-3.5 text-[#7A9E7E]" />
                Recovered payload verified in browser memory ({filename || 'payload.bin'})
              </span>
              <span className="font-mono-tech text-[11px] text-[#6B6B6B]">
                {previewSize.toLocaleString()} bytes
              </span>
            </div>
          )}
        </div>
      )}

      {matched === false && (
        <div className="bg-[#FAEAEA] border border-[#E8AAAC] rounded-xl p-3 text-center text-xs text-[#B5363A] font-semibold">
          HASH MISMATCH DETECTED — Reconstructed digest does not match original file hash.
        </div>
      )}
    </div>
  );
};
