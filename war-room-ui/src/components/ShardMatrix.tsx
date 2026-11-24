import React from 'react';
import { ShardMeta, NodeInfo } from '../types';
import { Grid, ShieldCheck, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface ShardMatrixProps {
  shards: ShardMeta[];
  nodes: NodeInfo[];
  regeneratedShards: number[];
}

export const ShardMatrix: React.FC<ShardMatrixProps> = ({ shards, nodes, regeneratedShards }) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Grid className="w-4 h-4" /> 12-Shard Distribution Matrix [RS(8,4)]
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="text-cyan-400 font-bold">D0–D7: Data</span> |{' '}
          <span className="text-purple-400 font-bold">P0–P3: Parity</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {Array.from({ length: 12 }).map((_, index) => {
          const shard = shards.find((s) => s.shard_id === index);
          const assignedNode = nodes.find((n) => n.node_id === index + 1);
          const isNodeOffline = assignedNode?.status === 'Offline';
          const isCorrupt = shard?.is_corrupt || assignedNode?.status === 'Degraded';
          const isRegenerated = regeneratedShards.includes(index);

          const isData = index < 8;
          const label = isData ? `D${index}` : `P${index - 8}`;

          let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
          let statusText = 'UNASSIGNED';
          let Icon = AlertCircle;

          if (isNodeOffline) {
            badgeColor = 'bg-crimson-500/20 text-crimson-400 border-crimson-500/40';
            statusText = 'OFFLINE';
            Icon = XCircle;
          } else if (isCorrupt) {
            badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
            statusText = 'CORRUPT / REJECTED';
            Icon = AlertCircle;
          } else if (isRegenerated) {
            badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
            statusText = 'REGENERATED';
            Icon = RefreshCw;
          } else if (shard) {
            badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
            statusText = 'VALID';
            Icon = ShieldCheck;
          }

          return (
            <div
              key={index}
              className={`bg-slate-900/90 rounded-lg p-2.5 border transition-all ${
                isNodeOffline
                  ? 'border-crimson-500/40 bg-crimson-950/10'
                  : isCorrupt
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Shard Label & Type */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-mono font-extrabold px-1.5 py-0.5 rounded ${
                    isData
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {label}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Node {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
              </div>

              {/* Live Badge */}
              <div className="mb-2">
                <span
                  className={`text-[9px] font-mono font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border ${badgeColor}`}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span className="truncate">{statusText}</span>
                </span>
              </div>

              {/* Blake3 Hash snippet */}
              <div className="text-[9px] font-mono text-slate-500">
                {shard ? (
                  <div>
                    <div className="text-slate-400">{(shard.size_bytes / 1024).toFixed(1)} KB</div>
                    <div className="text-slate-500 truncate" title={shard.blake3_hash}>
                      {shard.blake3_hash.slice(0, 10)}...
                    </div>
                  </div>
                ) : (
                  <span className="italic text-slate-600">Pending upload</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
