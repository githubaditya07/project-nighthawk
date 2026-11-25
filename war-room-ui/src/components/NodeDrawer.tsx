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
    <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-full bg-white/95 backdrop-blur-xl border-l border-border p-6 flex flex-col justify-between shadow-editorial-hover drawer-enter overflow-y-auto editorial-scroll">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-beige-light border border-border">
              <Server className="w-4 h-4 text-powder-blue-dark" />
            </div>
            <h2 className="text-xl font-serif text-charcoal tracking-tight">{node.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-mid-grey hover:text-charcoal p-1.5 rounded-lg hover:bg-beige-light transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="mt-4 flex items-center justify-between bg-beige-light p-3.5 rounded-xl border border-border">
          <span className="text-xs font-sans font-medium text-mid-grey">Node Status</span>
          <span
            className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border node-transition ${
              node.status === 'Online'
                ? 'bg-powder-blue-light/35 text-powder-blue-dark border-powder-blue-light'
                : node.status === 'Offline'
                ? 'bg-cherry-bg text-cherry border-cherry-light'
                : node.status === 'Degraded'
                ? 'bg-amber-bg text-amber border-amber-light'
                : 'bg-sage-bg text-sage border-sage-light'
            }`}
          >
            {node.status}
          </span>
        </div>

        {/* Node Properties Grid */}
        <div className="mt-4 space-y-1 text-xs">
          <div className="flex justify-between py-2.5 border-b border-border">
            <span className="text-mid-grey font-sans flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-powder-blue-dark" /> Address
            </span>
            <span className="text-charcoal font-mono font-semibold">{node.address}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-border">
            <span className="text-mid-grey font-sans flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-dusty-pink-dark" /> XOR Distance
            </span>
            <span className="text-dusty-pink-dark font-mono font-semibold">{node.xor_distance}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-border">
            <span className="text-mid-grey font-sans flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sage" /> Uptime
            </span>
            <span className="text-charcoal font-mono font-medium">{node.uptime_secs}s</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-border">
            <span className="text-mid-grey font-sans flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-powder-blue-dark" /> Transferred
            </span>
            <span className="text-charcoal font-mono font-medium">
              {(node.bytes_transferred / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>

          {/* Shard Details */}
          <div className="mt-5 pt-2">
            <div className="flex items-center gap-1.5 text-charcoal font-sans font-semibold mb-2.5">
              <HardDrive className="w-4 h-4 text-powder-blue-dark" /> Stored Shard Metadata
            </div>
            {shard ? (
              <div className="bg-beige-light p-4 rounded-xl border border-border space-y-2.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-mid-grey font-sans">Shard ID</span>
                  <span
                    className={`font-semibold ${
                      shard.kind === 'Data' ? 'text-powder-blue-dark' : 'text-dusty-pink-dark'
                    }`}
                  >
                    {shard.kind === 'Data'
                      ? `D${shard.shard_id} (Data)`
                      : `P${shard.shard_id - 8} (Parity)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mid-grey font-sans">Size</span>
                  <span className="text-charcoal font-medium">
                    {(shard.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mid-grey font-sans">Integrity</span>
                  <span className={shard.is_corrupt ? 'text-amber font-bold' : 'text-sage font-bold'}>
                    {shard.is_corrupt ? 'BIT ROT / CORRUPT' : 'VALID'}
                  </span>
                </div>
                <div>
                  <span className="text-mid-grey font-sans text-[11px] block mb-1">
                    Blake3 Checksum
                  </span>
                  <div className="bg-white p-2 rounded-lg font-mono text-[10px] text-powder-blue-dark break-all border border-border">
                    {shard.blake3_hash}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-mid-grey italic p-4 bg-beige-light rounded-xl border border-border font-sans">
                No shard currently assigned to this node.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons for this specific node */}
      <div className="pt-5 mt-5 border-t border-border flex flex-col gap-2.5">
        <button
          onClick={() => onCorruptNode(node.node_id)}
          disabled={node.status === 'Offline'}
          className="w-full bg-amber-bg hover:bg-amber text-amber hover:text-white border border-amber-light hover:border-amber rounded-xl py-2.5 font-sans text-xs font-semibold transition-all duration-200 disabled:opacity-40"
        >
          Corrupt Shard (Flip 16 Bytes)
        </button>
        <button
          onClick={() => onKillNode(node.node_id)}
          disabled={node.status === 'Offline'}
          className="w-full bg-cherry-bg hover:bg-cherry text-cherry hover:text-white border border-cherry-light hover:border-cherry rounded-xl py-2.5 font-sans text-xs font-semibold transition-all duration-200 disabled:opacity-40"
        >
          {node.status === 'Offline' ? 'Node is Offline' : 'Kill This Node (Simulate Crash)'}
        </button>
      </div>
    </div>
  );
};
