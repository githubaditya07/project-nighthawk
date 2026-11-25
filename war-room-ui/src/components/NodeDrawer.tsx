import React, { useEffect, useState } from 'react';
import { NodeInfo, ShardMeta } from '../types';
import { X, Server, HardDrive, Hash, Activity, Clock, ArrowUpDown, FileCode2, RefreshCw } from 'lucide-react';

interface NodeInspectData {
  node_id: number;
  file_path: string;
  exists_on_disk: boolean;
  size_bytes: number;
  hex_preview: string;
  blake3_hash: string;
}

interface NodeDrawerProps {
  node: NodeInfo | null;
  shard: ShardMeta | undefined;
  apiBase?: string;
  refreshTrigger?: number;
  onClose: () => void;
  onKillNode: (nodeId: number) => void;
  onCorruptNode: (nodeId: number) => void;
  onHealMesh?: () => void;
}

const STATUS_STYLE = {
  Online: { hex: '#7A9E7E', bg: '#EAF2EA', border: '#B4CDB6', label: 'Healthy' },
  Degraded: { hex: '#C8853A', bg: '#FBF2E8', border: '#E8C89A', label: 'Degraded' },
  Offline: { hex: '#B5363A', bg: '#FAEAEA', border: '#E8AAAC', label: 'Offline' },
  Recovering: { hex: '#4D8FB8', bg: '#EAF3F9', border: '#B8D4E8', label: 'Recovering' },
};

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  node,
  shard,
  apiBase = 'http://localhost:8080',
  refreshTrigger = 0,
  onClose,
  onKillNode,
  onCorruptNode,
  onHealMesh,
}) => {
  const [inspectData, setInspectData] = useState<NodeInspectData | null>(null);
  const [isInspectLoading, setIsInspectLoading] = useState(false);

  const fetchInspect = async (nodeId: number) => {
    setIsInspectLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/node/${nodeId}/inspect`);
      if (res.ok) {
        const data: NodeInspectData = await res.json();
        setInspectData(data);
      }
    } catch (err) {
      console.error('Failed to inspect node disk:', err);
    } finally {
      setIsInspectLoading(false);
    }
  };

  useEffect(() => {
    if (!node) {
      setInspectData(null);
      return;
    }
    fetchInspect(node.node_id);
  }, [node?.node_id, node?.status, refreshTrigger]);

  if (!node) return null;

  const st = STATUS_STYLE[node.status];
  const diskHashMismatch =
    inspectData?.exists_on_disk &&
    shard?.blake3_hash &&
    inspectData.blake3_hash !== shard.blake3_hash;

  return (
    <div
      id="node-inspector"
      className="fixed inset-y-0 right-0 z-50 w-96 max-w-full bg-[#FFFFFF]/95 backdrop-blur-xl border-l border-[#E8E4DC] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E8E4DC]">
              <Server className="w-4 h-4 text-[#4D8FB8]" />
            </div>
            <h2 className="text-xl font-serif-editorial text-[#1A1A1A] tracking-tight">
              {node.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B6B6B] hover:text-[#1A1A1A] p-1.5 rounded-lg hover:bg-[#FAF7F2] transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="mt-4 flex items-center justify-between bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E4DC]">
          <span className="text-xs font-medium text-[#6B6B6B]">Node Status</span>
          <span
            className="text-xs font-mono-tech font-semibold px-3 py-1 rounded-full border node-pill"
            style={{ backgroundColor: st.bg, color: st.hex, borderColor: st.border }}
          >
            {st.label} ({node.status})
          </span>
        </div>

        {/* Node Properties Grid */}
        <div className="mt-4 space-y-1 text-xs">
          <div className="flex justify-between py-2.5 border-b border-[#E8E4DC]">
            <span className="text-[#6B6B6B] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#4D8FB8]" /> Endpoint Address
            </span>
            <span className="text-[#1A1A1A] font-mono-tech font-semibold">{node.address}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-[#E8E4DC]">
            <span className="text-[#6B6B6B] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#A87060]" /> XOR Distance
            </span>
            <span className="text-[#A87060] font-mono-tech font-semibold">{node.xor_distance}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-[#E8E4DC]">
            <span className="text-[#6B6B6B] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#7A9E7E]" /> Uptime
            </span>
            <span className="text-[#1A1A1A] font-mono-tech font-medium">{node.uptime_secs}s</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-[#E8E4DC]">
            <span className="text-[#6B6B6B] flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#4D8FB8]" /> Transferred
            </span>
            <span className="text-[#1A1A1A] font-mono-tech font-medium">
              {(node.bytes_transferred / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>

          {/* Live Disk & Hex X-Ray Inspector */}
          <div className="mt-5 pt-2">
            <div className="flex items-center justify-between text-[#1A1A1A] font-semibold mb-2.5">
              <span className="flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-[#4D8FB8]" /> Live Disk &amp; Hex X-Ray
              </span>
              <button
                type="button"
                onClick={() => fetchInspect(node.node_id)}
                className="text-[10px] font-mono-tech text-[#4D8FB8] hover:text-[#1A1A1A] flex items-center gap-1"
                title="Refresh live disk bytes"
              >
                <RefreshCw className={`w-3 h-3 ${isInspectLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {inspectData ? (
              <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E4DC] space-y-2.5 font-mono-tech">
                <div>
                  <span className="text-[10px] text-[#6B6B6B] uppercase block mb-0.5">
                    Filesystem Path
                  </span>
                  <div className="text-[11px] text-[#1A1A1A] break-all bg-[#FFFFFF] px-2 py-1 rounded border border-[#E8E4DC]">
                    {inspectData.file_path}
                  </div>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6B6B6B]">Disk Status</span>
                  <span
                    className="font-semibold"
                    style={{ color: inspectData.exists_on_disk ? '#7A9E7E' : '#B5363A' }}
                  >
                    {inspectData.exists_on_disk
                      ? `ON DISK · ${inspectData.size_bytes.toLocaleString()} bytes`
                      : 'NOT FOUND'}
                  </span>
                </div>

                {inspectData.exists_on_disk && (
                  <>
                    <div>
                      <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                        First 64 Bytes (Hex Dump)
                      </span>
                      <div
                        className={`p-2 rounded-lg text-[10px] leading-relaxed break-all border ${
                          diskHashMismatch
                            ? 'bg-[#FAEAEA] border-[#E8AAAC] text-[#B5363A]'
                            : 'bg-[#FFFFFF] border-[#E8E4DC] text-[#2D2D2D]'
                        }`}
                      >
                        {inspectData.hex_preview || '—'}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                        Live Disk Blake3 Digest
                      </span>
                      <div
                        className={`p-2 rounded-lg text-[10px] break-all border ${
                          diskHashMismatch
                            ? 'bg-[#FAEAEA] border-[#E8AAAC] text-[#B5363A] font-semibold'
                            : 'bg-[#EAF2EA] border-[#B4CDB6] text-[#7A9E7E]'
                        }`}
                      >
                        {inspectData.blake3_hash}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-[#6B6B6B] italic p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E8E4DC]">
                Loading disk telemetry...
              </div>
            )}
          </div>

          {/* Expected Manifest Metadata */}
          {shard && (
            <div className="mt-4 pt-2">
              <div className="flex items-center gap-1.5 text-[#1A1A1A] font-semibold mb-2">
                <HardDrive className="w-4 h-4 text-[#A87060]" /> Manifest Metadata
              </div>
              <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E4DC] space-y-2 font-mono-tech">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Shard Slot</span>
                  <span className={shard.kind === 'Data' ? 'text-[#4D8FB8] font-semibold' : 'text-[#A87060] font-semibold'}>
                    {shard.kind === 'Data'
                      ? `D${shard.shard_id + 1} (Data)`
                      : `P${shard.shard_id - 7} (Parity)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Expected Size</span>
                  <span className="text-[#1A1A1A]">{(shard.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                    Expected Manifest Hash
                  </span>
                  <div className="bg-[#FFFFFF] p-2 rounded-lg text-[10px] text-[#4D8FB8] break-all border border-[#E8E4DC]">
                    {shard.blake3_hash}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons for this specific node */}
      <div className="pt-5 mt-5 border-t border-[#E8E4DC] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onCorruptNode(node.node_id)}
          disabled={node.status === 'Offline'}
          className="w-full bg-[#FBF2E8] hover:bg-[#F5E4CF] text-[#C8853A] border border-[#E8C89A] rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-40"
        >
          Corrupt Shard (Flip Bytes on Disk)
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onKillNode(node.node_id)}
            disabled={node.status === 'Offline'}
            className="bg-[#FAEAEA] hover:bg-[#F5D8D8] text-[#B5363A] border border-[#E8AAAC] rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-40"
          >
            {node.status === 'Offline' ? 'Offline' : 'Kill Node'}
          </button>
          {onHealMesh && (
            <button
              type="button"
              onClick={onHealMesh}
              className="bg-[#EAF2EA] hover:bg-[#DCEAD8] text-[#7A9E7E] border border-[#B4CDB6] rounded-xl py-2.5 text-xs font-semibold transition-all"
            >
              Heal Mesh
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
