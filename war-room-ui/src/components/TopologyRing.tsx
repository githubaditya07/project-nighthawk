import React from 'react';
import { NodeInfo, NodeStatus } from '../types';
import { Shield, Server } from 'lucide-react';

interface TopologyRingProps {
  nodes: NodeInfo[];
  selectedNode: NodeInfo | null;
  onSelectNode: (node: NodeInfo) => void;
  activeAnimation: 'idle' | 'distributing' | 'reconstructing' | 'healing';
}

export const TopologyRing: React.FC<TopologyRingProps> = ({
  nodes,
  selectedNode,
  onSelectNode,
  activeAnimation,
}) => {
  const size = 520;
  const center = size / 2;
  const radius = 190;

  const getNodeColor = (status: NodeStatus) => {
    switch (status) {
      case 'Online':
        return {
          stroke: '#10B981',
          fill: '#064E3B',
          glow: 'rgba(16, 185, 129, 0.7)',
          text: 'text-emerald-400',
        };
      case 'Offline':
        return {
          stroke: '#EF4444',
          fill: '#7F1D1D',
          glow: 'rgba(239, 68, 68, 0.7)',
          text: 'text-crimson-400',
        };
      case 'Degraded':
        return {
          stroke: '#F59E0B',
          fill: '#78350F',
          glow: 'rgba(245, 158, 11, 0.7)',
          text: 'text-amber-400',
        };
      case 'Recovering':
        return {
          stroke: '#3B82F6',
          fill: '#1E3A8A',
          glow: 'rgba(59, 130, 246, 0.7)',
          text: 'text-blue-400',
        };
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 relative flex flex-col items-center justify-center min-h-[580px]">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
          12-Node Polar Mesh Topology
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 text-[11px] font-mono">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Online</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-crimson-500 inline-block" /> Offline</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Degraded</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Recovering</span>
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#111827" stopOpacity="0.9" />
          </radialGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer and Inner Grid Rings */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#1E293B" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={center} cy={center} r={radius * 0.6} fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 4" />

        {/* Central NIGHTHAWK Coordinator Hub */}
        <g className="cursor-pointer">
          <circle
            cx={center}
            cy={center}
            r={54}
            fill="url(#hubGradient)"
            stroke="#00F0FF"
            strokeWidth="2"
            filter="url(#glow)"
            className="transition-all duration-300"
          />
          <circle cx={center} cy={center} r={46} fill="#090D16" stroke="#00F0FF" strokeWidth="1" strokeDasharray="6 3" className="animate-spin-slow origin-center" />
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            fill="#00F0FF"
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            NIGHTHAWK
          </text>
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="monospace"
          >
            COORDINATOR
          </text>
          <text
            x={center}
            y={center + 26}
            textAnchor="middle"
            fill="#38BDF8"
            fontSize="9"
            fontFamily="monospace"
          >
            RS(8,4) HUB
          </text>
        </g>

        {/* 12 Mesh Nodes & Connectors */}
        {nodes.map((node, index) => {
          // Angle in radians: 12 nodes spaced equally around circle (30 deg each)
          const angle = (index * (360 / 12) - 90) * (Math.PI / 180);
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const isSelected = selectedNode?.node_id === node.node_id;
          const colors = getNodeColor(node.status);

          // Determine animated transfer line
          const isTransferring =
            activeAnimation === 'distributing' ||
            (activeAnimation === 'reconstructing' && node.status === 'Online') ||
            (activeAnimation === 'healing' && (node.status === 'Recovering' || node.status === 'Online'));

          return (
            <g key={node.node_id} onClick={() => onSelectNode(node)} className="cursor-pointer group">
              {/* Connecting Vector Line */}
              <line
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={isTransferring ? '#00F0FF' : node.status === 'Offline' ? '#334155' : colors.stroke}
                strokeWidth={isSelected ? '2.5' : isTransferring ? '2' : '1'}
                strokeDasharray={isTransferring ? '6 4' : 'none'}
                className={isTransferring ? 'animate-dash' : ''}
                opacity={node.status === 'Offline' ? 0.3 : 0.8}
              />

              {/* Node Outer Ring */}
              <circle
                cx={x}
                cy={y}
                r={24}
                fill={colors.fill}
                stroke={isSelected ? '#FFFFFF' : colors.stroke}
                strokeWidth={isSelected ? '3' : '2'}
                filter="url(#glow)"
                className="transition-all duration-300 group-hover:scale-110 origin-center"
              />

              {/* Node Inner Disk */}
              <circle cx={x} cy={y} r={17} fill="#090D16" />

              {/* Node Label (N01 .. N12) */}
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill={colors.stroke}
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                N{node.node_id < 10 ? `0${node.node_id}` : node.node_id}
              </text>

              {/* Shard Label Outside Ring */}
              <text
                x={center + (radius + 32) * Math.cos(angle)}
                y={center + (radius + 32) * Math.sin(angle) + 4}
                textAnchor="middle"
                fill={node.status === 'Offline' ? '#64748B' : '#CBD5E1'}
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
              >
                {node.shard_id !== null ? (node.shard_id < 8 ? `D${node.shard_id}` : `P${node.shard_id - 8}`) : '—'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Animation Status Banner at Bottom */}
      <div className="mt-2 text-center">
        {activeAnimation === 'distributing' && (
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/30 animate-pulse">
            DISPERSING RS(8,4) SHARDS TO 12 NODES...
          </span>
        )}
        {activeAnimation === 'reconstructing' && (
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/30 animate-pulse">
            STREAMING SURVIVING SHARDS TO COORDINATOR (8-of-12)...
          </span>
        )}
        {activeAnimation === 'healing' && (
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded border border-blue-500/30 animate-pulse">
            REGENERATING & RESTORING MISSING SHARDS OUTWARD...
          </span>
        )}
        {activeAnimation === 'idle' && (
          <span className="text-[11px] font-mono text-slate-500">
            Click any node ring to inspect detailed hardware telemetry & Blake3 hashes
          </span>
        )}
      </div>
    </div>
  );
};
