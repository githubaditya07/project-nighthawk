import React, { useState } from 'react';
import { Download, HardDrive } from 'lucide-react';
import { BenchmarkRun } from '../types';

interface BenchmarkPanelProps {
  benchmarks: BenchmarkRun[];
  onExportCsv: () => void;
  countupVals?: { overhead: string; survival: string; loss: string };
}

function formatStorageMb(mb: number): string {
  if (mb < 1024) {
    return `${mb.toFixed(mb < 100 ? 0 : 0)} MB`;
  }
  const gb = mb / 1024;
  if (gb < 1024) {
    return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`;
  }
  const tb = gb / 1024;
  if (tb < 1024) {
    return `${tb.toFixed(tb >= 100 ? 0 : 1)} TB`;
  }
  const pb = tb / 1024;
  return `${pb.toFixed(2)} PB`;
}

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({
  benchmarks,
  onExportCsv,
  countupVals = { overhead: '1.50×', survival: '100%', loss: '40%' },
}) => {
  // Logarithmic slider 0..100 mapping smoothly from 50 MB to 1 PB (1,073,741,824 MB)
  const MIN_MB = 50;
  const MAX_MB = 1024 * 1024 * 1024; // 1 PB in MB (1,073,741,824 MB)
  const [sliderPos, setSliderPos] = useState<number>(0);

  const scaleMb = MIN_MB * Math.pow(MAX_MB / MIN_MB, sliderPos / 100);
  const nighthawkMb = scaleMb * 1.5;
  const replica3xMb = scaleMb * 3.0;
  const savedMb = replica3xMb - nighthawkMb;

  const latestBench = benchmarks[benchmarks.length - 1];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      {/* Left Column: Editorial Headline + Count-Up Metrics */}
      <div className="lg:col-span-6 space-y-5 reveal-on-scroll">
        <span className="text-xs font-mono-tech uppercase tracking-widest text-[#4D8FB8]">
          04 / 5-Metric Benchmark Suite
        </span>
        <h2 className="font-serif-editorial text-4xl sm:text-5xl text-[#1A1A1A]">
          Engineered to win under pressure.
        </h2>
        <p className="text-sm sm:text-base text-[#2D2D2D] leading-relaxed">
          Unlike traditional 3× replication (200% overhead), NIGHTHAWK delivers higher fault
          tolerance at half the storage cost — backed by real Rust Galois Field benchmarks from Team
          StrawHats.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E8E4DC]">
            <div className="text-2xl font-serif-editorial text-[#1A1A1A]">
              {countupVals.overhead}
            </div>
            <div className="text-xs text-[#6B6B6B]">Storage Overhead</div>
          </div>
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E8E4DC]">
            <div className="text-2xl font-serif-editorial text-[#7A9E7E]">
              {countupVals.survival}
            </div>
            <div className="text-xs text-[#6B6B6B]">4-Node Survival</div>
          </div>
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E8E4DC]">
            <div className="text-2xl font-serif-editorial text-[#4D8FB8]">
              {countupVals.loss}
            </div>
            <div className="text-xs text-[#6B6B6B]">Packet Loss Tolerance</div>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Scale Calculator & Comparison Card */}
      <div className="lg:col-span-6 editorial-card rounded-2xl p-6 sm:p-8 space-y-5 reveal-on-scroll">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4DC] pb-3">
          <span className="font-semibold text-[#1A1A1A]">
            Storage &amp; Resilience Scale Calculator
          </span>
          <button
            type="button"
            onClick={onExportCsv}
            className="text-xs font-mono-tech text-[#4D8FB8] hover:text-[#1A1A1A] flex items-center gap-1.5 border border-[#E8E4DC] bg-[#FAF7F2] px-3 py-1 rounded-full transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV ({benchmarks.length} runs)
          </button>
        </div>

        {/* Interactive Dataset Scale Slider (50 MB -> 1 PB) */}
        <div className="bg-[#F5F0E8] border border-[#E8E4DC] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#1A1A1A] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#4D8FB8]" />
              Target Dataset Size
            </span>
            <span className="font-mono-tech text-sm font-semibold text-[#1A1A1A] bg-[#FFFFFF] px-2.5 py-0.5 rounded-lg border border-[#E8E4DC]">
              {formatStorageMb(scaleMb)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="w-full accent-[#4D8FB8] cursor-pointer"
            aria-label="Dataset Scale Slider from 50 MB to 1 PB"
          />

          <div className="flex justify-between text-[10px] font-mono-tech text-[#6B6B6B]">
            <span>50 MB</span>
            <span>10 GB</span>
            <span>1 TB</span>
            <span>100 TB</span>
            <span>1.00 PB</span>
          </div>
        </div>

        {/* Comparison Progress Bars dynamically scaled */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-[#1A1A1A]">
                NIGHTHAWK RS(8,4) — 4 Node Failures Tolerated
              </span>
              <span className="font-mono-tech text-[#4D8FB8] font-semibold">
                {formatStorageMb(nighthawkMb)} total (1.50×)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#E8E4DC] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7BAFD4] transition-all duration-500"
                style={{ width: '50%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-[#6B6B6B]">
                Standard 3× Replication — 2 Node Failures Tolerated
              </span>
              <span className="font-mono-tech text-[#C8907A] font-semibold">
                {formatStorageMb(replica3xMb)} total (3.00×)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#E8E4DC] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C8907A] transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Savings Highlight */}
        <div className="flex items-center justify-between bg-[#EAF2EA] border border-[#B4CDB6] rounded-xl px-3.5 py-2 text-xs">
          <span className="text-[#2D2D2D] font-medium">Raw Disk Capacity Saved vs 3× Baseline</span>
          <span className="font-mono-tech font-semibold text-[#7A9E7E]">
            {formatStorageMb(savedMb)} saved (50%)
          </span>
        </div>

        {/* Measured Rust Telemetry from latest run */}
        {latestBench && (
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono-tech">
            <div className="bg-[#F5F0E8] p-2.5 rounded-lg border border-[#E8E4DC]">
              <div className="text-[10px] text-[#6B6B6B]">Encode</div>
              <div className="text-[#1A1A1A] font-semibold">{latestBench.encode_ms} ms</div>
            </div>
            <div className="bg-[#F5F0E8] p-2.5 rounded-lg border border-[#E8E4DC]">
              <div className="text-[10px] text-[#6B6B6B]">Reconstruct</div>
              <div className="text-[#4D8FB8] font-semibold">{latestBench.reconstruction_ms} ms</div>
            </div>
            <div className="bg-[#F5F0E8] p-2.5 rounded-lg border border-[#E8E4DC]">
              <div className="text-[10px] text-[#6B6B6B]">Heal</div>
              <div className="text-[#7A9E7E] font-semibold">{latestBench.healing_ms} ms</div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#E8E4DC] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6B6B]">
          <span>Team StrawHats &middot; IEEE BMSIT&amp;M Winter of Projects 2026</span>
          <span className="font-mono-tech text-[#1A1A1A]">COMSOC-SW-02</span>
        </div>
      </div>
    </div>
  );
};
