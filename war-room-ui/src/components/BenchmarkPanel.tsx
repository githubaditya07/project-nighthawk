import React from 'react';
import { BarChart3, Download, TrendingUp, ShieldAlert, Award } from 'lucide-react';
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
  // Static comparative data: RS(8,4) vs 3x Replication
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

  // Latency History Chart data from recorded runs
  const latencyData = benchmarks.map((b, i) => ({
    name: `Run #${b.run_id || i + 1}`,
    Reconstruct: Number(b.reconstruction_ms),
    Encode: Number(b.encode_ms),
    Heal: Number(b.healing_ms),
  }));

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> 5-Metric Benchmark & 3x Replication Comparison
          </h3>
          <p className="text-[11px] font-mono text-slate-400">
            Real-world performance evaluated against standard 3x replica storage baseline
          </p>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" /> EXPORT CSV
        </button>
      </div>

      {/* Comparative Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Storage Overhead</div>
          <div className="text-lg font-extrabold text-cyan-400 mt-0.5">1.50x</div>
          <div className="text-[10px] text-emerald-400 font-semibold">50% savings vs 3.00x</div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Fault Tolerance</div>
          <div className="text-lg font-extrabold text-emerald-400 mt-0.5">4 of 12</div>
          <div className="text-[10px] text-slate-400">Survives 33.3% loss</div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Integrity Mechanism</div>
          <div className="text-lg font-extrabold text-purple-400 mt-0.5">Blake3 Merkle</div>
          <div className="text-[10px] text-slate-400">Bit rot detection</div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Total Runs Recorded</div>
          <div className="text-lg font-extrabold text-white mt-0.5">{benchmarks.length}</div>
          <div className="text-[10px] text-slate-400">Validated benchmarks</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overhead Comparison Bar Chart */}
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
          <div className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center justify-between">
            <span>Storage Efficiency: RS(8,4) vs 3x Replication</span>
            <span className="text-[10px] text-cyan-400 font-mono">1.50x vs 3.00x</span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData.slice(0, 2)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="metric" stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', fontFamily: 'monospace', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="NIGHTHAWK RS(8,4)" fill="#00F0FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="3x Replication Baseline" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency History Line Chart */}
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
          <div className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center justify-between">
            <span>Measured Processing Latency History (ms)</span>
            <span className="text-[10px] text-purple-400 font-mono">Real I/O & Math</span>
          </div>
          <div className="h-52 w-full">
            {latencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', fontFamily: 'monospace', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="Encode" stroke="#22D3EE" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Reconstruct" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Heal" stroke="#818CF8" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-mono text-xs text-slate-600 italic">
                Upload a file and run Reconstruct / Self-Heal to graph measured latencies.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
