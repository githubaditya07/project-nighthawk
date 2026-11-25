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
    <div className="editorial-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b border-border">
        <h3 className="text-xs font-sans font-semibold text-charcoal uppercase tracking-widest flex items-center gap-2">
          <Grid className="w-4 h-4 text-powder-blue-dark" /> 12-Shard Distribution Matrix [RS(8,4)]
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-powder-blue-dark font-semibold">D0–D7: Data</span>
          <span className="text-light-grey">|</span>
          <span className="text-dusty-pink-dark font-semibold">P0–P3: Parity</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, index) => {
          const shard = shards.find((s) => s.shard_id === index);
          const assignedNode = nodes.find((n) => n.node_id === index + 1);
          const isNodeOffline = assignedNode?.status === 'Offline';
          const isCorrupt = shard?.is_corrupt || assignedNode?.status === 'Degraded';
          const isRegenerated = regeneratedShards.includes(index);

          const isData = index < 8;
          const label = isData ? `D${index}` : `P${index - 8}`;

          let badgeColor = 'bg-white text-mid-grey border-border';
          let statusText = 'UNASSIGNED';
          let Icon = AlertCircle;

          if (isNodeOffline) {
            badgeColor = 'bg-cherry-bg text-cherry border-cherry-light';
            statusText = 'OFFLINE';
            Icon = XCircle;
          } else if (isCorrupt) {
            badgeColor = 'bg-amber-bg text-amber border-amber-light';
            statusText = 'CORRUPT';
            Icon = AlertCircle;
          } else if (isRegenerated) {
            badgeColor = 'bg-powder-blue-light/40 text-powder-blue-dark border-powder-blue-light';
            statusText = 'REGENERATED';
            Icon = RefreshCw;
          } else if (shard) {
            badgeColor = 'bg-sage-bg text-sage border-sage-light';
            statusText = 'VALID';
            Icon = ShieldCheck;
          }

          return (
            <div
              key={index}
              className={`rounded-xl p-3 border node-transition hover:-translate-y-0.5 ${
                isNodeOffline
                  ? 'border-cherry-light bg-cherry-bg/50'
                  : isCorrupt
                  ? 'border-amber-light bg-amber-bg/50'
                  : 'border-border bg-beige-light hover:border-powder-blue-light'
              }`}
            >
              {/* Shard Label & Node */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border ${
                    isData
                      ? 'bg-powder-blue-light/30 text-powder-blue-dark border-powder-blue-light'
                      : 'bg-dusty-pink-light/35 text-dusty-pink-dark border-dusty-pink-light'
                  }`}
                >
                  {label}
                </span>
                <span className="text-[10px] font-mono text-mid-grey">
                  Node {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
              </div>

              {/* Live Badge */}
              <div className="mb-2.5">
                <span
                  className={`text-[9.5px] font-mono font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md border node-transition ${badgeColor}`}
                >
                  <Icon className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{statusText}</span>
                </span>
              </div>

              {/* Blake3 Hash snippet */}
              <div className="text-[10px] font-mono text-mid-grey">
                {shard ? (
                  <div>
                    <div className="text-dark-grey font-medium">{(shard.size_bytes / 1024).toFixed(1)} KB</div>
                    <div className="text-mid-grey/80 truncate" title={shard.blake3_hash}>
                      {shard.blake3_hash.slice(0, 12)}...
                    </div>
                  </div>
                ) : (
                  <span className="italic text-mid-grey/60 font-sans">Pending upload</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
