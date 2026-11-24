import React from 'react';
import { NodeInfo, ShardMeta } from '../types';
import { X, Server, HardDrive, Hash, Activity, Clock, ArrowUpDown } from 'lucide-react';

interface NodeDrawerProps {
  node: NodeInfo | null;
  shard: ShardMeta | undefined;
  onClose: () => void;
  onKillNode: (nodeId: number) => void;
  onCorruptNode: (nodeId: number) => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  node,
  shard,
  onClose,
  onKillNode,
  onCorruptNode,
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-panel/95 backdrop-blur-xl border-l border-cyan-500/30 p-6 flex flex-col justify-between shadow-2xl shadow-black/80 animate-in slide-in-from-right duration-200">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold font-mono text-white">{node.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="mt-4 flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <span className="text-xs font-mono text-slate-400">Node Status</span>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
              node.status === 'Online'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : node.status === 'Offline'
                ? 'bg-crimson-500/20 text-crimson-400 border border-crimson-500/40'
                : node.status === 'Degraded'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            }`}
          >
            {node.status}
          </span>
        </div>

        {/* Node Properties Grid */}
        <div className="mt-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-cyan-400" /> Address:</span>
            <span className="text-white font-semibold">{node.address}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-purple-400" /> XOR Distance:</span>
            <span className="text-purple-300 font-semibold">{node.xor_distance}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> Uptime:</span>
            <span className="text-white">{node.uptime_secs}s</span>
          </div>

          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5"><ArrowUpDown className="w-3.5 h-3.5 text-blue-400" /> Transferred:</span>
            <span className="text-white">{(node.bytes_transferred / (1024 * 1024)).toFixed(2)} MB</span>
          </div>

          {/* Shard Details */}
          <div className="mt-4 pt-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-2">
              <HardDrive className="w-4 h-4 text-cyan-400" /> Stored Shard Metadata
            </div>
            {shard ? (
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shard ID:</span>
                  <span className="text-cyan-400 font-bold">
                    {shard.kind === 'Data' ? `D${shard.shard_id} (Data)` : `P${shard.shard_id - 8} (Parity)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="text-white">{(shard.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Integrity:</span>
                  <span className={shard.is_corrupt ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {shard.is_corrupt ? 'BIT ROT / CORRUPT' : 'VALID'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Blake3 Checksum:</span>
                  <div className="bg-black/60 p-1.5 rounded font-mono text-[10px] text-cyan-300 break-all border border-slate-800">
                    {shard.blake3_hash}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic p-3 bg-slate-900/50 rounded-lg">
                No shard currently assigned to this node.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons for this specific node */}
      <div className="pt-4 border-t border-slate-800 flex flex-col gap-2 font-mono">
        <button
          onClick={() => onCorruptNode(node.node_id)}
          disabled={node.status === 'Offline'}
          className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg py-2 text-xs font-bold transition-all disabled:opacity-40"
        >
          CORRUPT SHARD (FLIP 16 BYTES)
        </button>
        <button
          onClick={() => onKillNode(node.node_id)}
          disabled={node.status === 'Offline'}
          className="w-full bg-crimson-500/20 hover:bg-crimson-500/30 text-crimson-300 border border-crimson-500/40 rounded-lg py-2 text-xs font-bold transition-all disabled:opacity-40"
        >
          {node.status === 'Offline' ? 'NODE IS OFFLINE' : 'KILL THIS NODE (SIMULATE CRASH)'}
        </button>
      </div>
    </div>
  );
};
