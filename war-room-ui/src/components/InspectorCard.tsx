import React from 'react';
import { X } from 'lucide-react';
import { NodeInfo, ShardMeta } from '../types';

interface InspectorCardProps {
  node: NodeInfo | null;
  shard: ShardMeta | undefined;
  onClose: () => void;
  onCorruptNode: (nodeId: number) => void;
  onHealMesh: () => void;
  onKillSingleNode: (nodeId: number) => void;
}

const STATUS_STYLE = {
  Online: { hex: '#7A9E7E', bg: '#EAF2EA', label: 'Healthy' },
  Degraded: { hex: '#C8853A', bg: '#FBF2E8', label: 'Degraded' },
  Offline: { hex: '#B5363A', bg: '#FAEAEA', label: 'Offline' },
  Recovering: { hex: '#4D8FB8', bg: '#EAF3F9', label: 'Recovering' },
};

export const InspectorCard: React.FC<InspectorCardProps> = ({
  node,
  shard,
  onClose,
  onCorruptNode,
  onHealMesh,
  onKillSingleNode,
}) => {
  const isOpen = node !== null;
  const st = node ? STATUS_STYLE[node.status] : STATUS_STYLE.Online;
  const roleLabel = node
    ? node.node_id <= 8
      ? `Data-${node.node_id}`
      : `Parity-${node.node_id - 8}`
    : '';

  return (
    <div
      id="node-inspector"
      className={`fixed bottom-6 left-6 z-50 w-72 sm:w-80 editorial-card rounded-2xl p-4 shadow-xl ${
        isOpen
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span
            id="insp-dot"
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: st.hex }}
          />
          <span id="insp-title" className="font-mono-tech text-xs font-semibold text-[#1A1A1A]">
            {node ? `Node N-${String(node.node_id).padStart(2, '0')} · ${roleLabel}` : ''}
          </span>
        </div>
        <button
          id="btn-close-inspector"
          type="button"
          onClick={onClose}
          className="text-[#6B6B6B] hover:text-[#1A1A1A] p-1 rounded-lg transition-colors"
          aria-label="Close inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#6B6B6B]">Status</span>
          <span
            id="insp-status"
            className="font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: st.bg, color: st.hex }}
          >
            {st.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#6B6B6B]">Endpoint &amp; Uptime</span>
          <span id="insp-latency" className="font-mono-tech text-[#1A1A1A]">
            {node
              ? node.status === 'Offline'
                ? 'TIMEOUT'
                : `${node.address} · ${node.uptime_secs}s`
              : ''}
          </span>
        </div>
        <div>
          <div className="text-[#6B6B6B] mb-1">Blake3 Shard Digest</div>
          <div
            id="insp-hash"
            className="font-mono-tech text-[10px] bg-[#F5F0E8] border border-[#E8E4DC] rounded-lg px-2.5 py-1.5 text-[#2D2D2D] truncate"
            title={shard?.blake3_hash}
          >
            {node?.status === 'Degraded' || shard?.is_corrupt
              ? 'MISMATCH · BIT-ROT DETECTED'
              : shard
              ? `b3:${shard.blake3_hash}`
              : 'Pending file ingestion'}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#E8E4DC] grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => node && onCorruptNode(node.node_id)}
          disabled={!node || node.status === 'Offline'}
          className="text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#FBF2E8] hover:bg-[#F5E4CF] border border-[#E8C89A] text-[#C8853A] transition-colors disabled:opacity-40"
        >
          Bit-Rot
        </button>
        <button
          type="button"
          onClick={() => node && onKillSingleNode(node.node_id)}
          disabled={!node || node.status === 'Offline'}
          className="text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#FAEAEA] hover:bg-[#F5D8D8] border border-[#E8AAAC] text-[#B5363A] transition-colors disabled:opacity-40"
        >
          Kill Node
        </button>
        <button
          type="button"
          onClick={onHealMesh}
          className="text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#EAF2EA] hover:bg-[#DCEAD8] border border-[#B4CDB6] text-[#7A9E7E] transition-colors"
        >
          Heal Mesh
        </button>
      </div>
    </div>
  );
};
