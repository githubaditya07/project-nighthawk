import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import { BenchmarkRun } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

interface BenchmarkPanelProps {
  benchmarks: BenchmarkRun[];
  onExportCsv: () => void;
}

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({ benchmarks, onExportCsv }) => {
  const comparisonData = [
    {
      metric: 'Storage Overhead',
      'NIGHTHAWK RS(8,4)': 1.5,
      '3x Replication Baseline': 3.0,
      unit: 'x',
    },
    {
      metric: 'Storage Savings',
      'NIGHTHAWK RS(8,4)': 50,
      '3x Replication Baseline': 0,
      unit: '%',
    },
    {
      metric: 'Tolerated Node Losses',
      'NIGHTHAWK RS(8,4)': 4,
      '3x Replication Baseline': 2,
      unit: ' nodes',
    },
    {
      metric: 'Fault Tolerance Ratio',
      'NIGHTHAWK RS(8,4)': 33.3,
      '3x Replication Baseline': 66.6,
      unit: '%',
    },
  ];

  const latencyData = benchmarks.map((b, i) => ({
    name: `Run #${b.run_id || i + 1}`,
    Reconstruct: Number(b.reconstruction_ms),
    Encode: Number(b.encode_ms),
    Heal: Number(b.healing_ms),
  }));

  return (
    <div className="editorial-card rounded-2xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <h3 className="text-xs font-sans font-semibold text-charcoal uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-powder-blue-dark" /> 5-Metric Benchmark &amp; 3x Replication Comparison
          </h3>
          <p className="text-[11px] font-sans text-mid-grey mt-0.5">
            Real-world performance evaluated against standard 3x replica storage baseline
          </p>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 bg-beige-light hover:bg-powder-blue-light/30 text-powder-blue-dark border border-border hover:border-powder-blue-light rounded-xl px-3.5 py-2 font-sans text-xs font-semibold transition-all duration-200 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Comparative KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-beige-light p-3.5 rounded-xl border border-border">
          <div className="text-[10px] font-sans text-mid-grey uppercase tracking-wider font-medium">
            Storage Overhead
          </div>
          <div className="text-lg font-mono font-bold text-powder-blue-dark mt-1">1.50x</div>
          <div className="text-[10px] font-sans text-sage font-medium mt-0.5">50% savings vs 3.00x</div>
        </div>

        <div className="bg-beige-light p-3.5 rounded-xl border border-border">
          <div className="text-[10px] font-sans text-mid-grey uppercase tracking-wider font-medium">
            Fault Tolerance
          </div>
          <div className="text-lg font-mono font-bold text-sage mt-1">4 of 12</div>
          <div className="text-[10px] font-sans text-mid-grey mt-0.5">Survives 33.3% loss</div>
        </div>

        <div className="bg-beige-light p-3.5 rounded-xl border border-border">
          <div className="text-[10px] font-sans text-mid-grey uppercase tracking-wider font-medium">
            Integrity Engine
          </div>
          <div className="text-lg font-mono font-bold text-dusty-pink-dark mt-1">Blake3 Merkle</div>
          <div className="text-[10px] font-sans text-mid-grey mt-0.5">Bit rot detection</div>
        </div>

        <div className="bg-beige-light p-3.5 rounded-xl border border-border">
          <div className="text-[10px] font-sans text-mid-grey uppercase tracking-wider font-medium">
            Runs Recorded
          </div>
          <div className="text-lg font-mono font-bold text-charcoal mt-1">{benchmarks.length}</div>
          <div className="text-[10px] font-sans text-mid-grey mt-0.5">Validated benchmarks</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overhead Comparison Bar Chart */}
        <div className="bg-beige-light p-4 rounded-xl border border-border">
          <div className="text-xs font-sans font-semibold text-charcoal mb-3 flex items-center justify-between">
            <span>Storage Efficiency: RS(8,4) vs 3x Baseline</span>
            <span className="text-[10px] text-powder-blue-dark font-mono">1.50x vs 3.00x</span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData.slice(0, 2)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
                <XAxis dataKey="metric" stroke="#6B6B6B" fontSize={11} fontFamily='"JetBrains Mono", monospace' />
                <YAxis stroke="#6B6B6B" fontSize={11} fontFamily='"JetBrains Mono", monospace' />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E4DC',
                    borderRadius: '10px',
                    color: '#1A1A1A',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '11px',
                    boxShadow: '0 8px 20px rgba(26,26,26,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }} />
                <Bar dataKey="NIGHTHAWK RS(8,4)" fill="#7BAFD4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="3x Replication Baseline" fill="#C8907A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency History Line Chart */}
        <div className="bg-beige-light p-4 rounded-xl border border-border">
          <div className="text-xs font-sans font-semibold text-charcoal mb-3 flex items-center justify-between">
            <span>Processing Latency History (ms)</span>
            <span className="text-[10px] text-dusty-pink-dark font-mono">Real I/O &amp; Math</span>
          </div>
          <div className="h-52 w-full">
            {latencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
                  <XAxis dataKey="name" stroke="#6B6B6B" fontSize={11} fontFamily='"JetBrains Mono", monospace' />
                  <YAxis stroke="#6B6B6B" fontSize={11} fontFamily='"JetBrains Mono", monospace' />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E8E4DC',
                      borderRadius: '10px',
                      color: '#1A1A1A',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '11px',
                      boxShadow: '0 8px 20px rgba(26,26,26,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }} />
                  <Line type="monotone" dataKey="Encode" stroke="#4D8FB8" strokeWidth={2.25} dot={{ r: 3.5, fill: '#4D8FB8' }} />
                  <Line type="monotone" dataKey="Reconstruct" stroke="#7A9E7E" strokeWidth={2.25} dot={{ r: 3.5, fill: '#7A9E7E' }} />
                  <Line type="monotone" dataKey="Heal" stroke="#C8907A" strokeWidth={2.25} dot={{ r: 3.5, fill: '#C8907A' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-sans text-xs text-mid-grey italic text-center px-6">
                Upload a file and run Reconstruct / Self-Heal to visualize measured latencies.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
