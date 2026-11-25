import React from 'react';
import { NodeInfo, NodeStatus } from '../types';
import { useParallax } from '../hooks/useEditorialMotion';

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
  const { offsetY, scale } = useParallax(14);

  const getNodeColor = (status: NodeStatus) => {
    switch (status) {
      case 'Online':
        return {
          stroke: '#4D8FB8',      // --color-powder-blue-dark
          outerFill: '#B8D4E8',   // --color-powder-blue-light
          innerFill: '#FFFFFF',
          labelColor: '#1A1A1A',
        };
      case 'Offline':
        return {
          stroke: '#B5363A',      // --color-cherry
          outerFill: '#E8AAAC',   // --color-cherry-light
          innerFill: '#FAEAEA',   // --color-cherry-bg
          labelColor: '#B5363A',
        };
      case 'Degraded':
        return {
          stroke: '#C8853A',      // --color-amber
          outerFill: '#E8C89A',   // --color-amber-light
          innerFill: '#FBF2E8',   // --color-amber-bg
          labelColor: '#C8853A',
        };
      case 'Recovering':
        return {
          stroke: '#7A9E7E',      // --color-sage
          outerFill: '#B4CDB6',   // --color-sage-light
          innerFill: '#EAF2EA',   // --color-sage-bg
          labelColor: '#7A9E7E',
        };
    }
  };

  return (
    <div className="editorial-card rounded-2xl p-6 relative flex flex-col items-center justify-between min-h-[600px] overflow-hidden">
      {/* Header Row */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border z-10">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-powder-blue-dark" />
          <span className="text-xs font-sans font-semibold text-charcoal uppercase tracking-widest">
            12-Node Polar Mesh Topology
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-3.5 text-[11px] font-sans font-medium text-mid-grey">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-powder-blue-dark inline-block" /> Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sage inline-block" /> Healing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber inline-block" /> Degraded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cherry inline-block" /> Offline
          </span>
        </div>
      </div>

      {/* Parallax Topology Canvas */}
      <div
        className="my-auto py-3 transition-transform duration-150 ease-out will-change-transform"
        style={{ transform: `translateY(${offsetY}px) scale(${scale})` }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible max-w-full h-auto">
          <defs>
            <radialGradient id="editorialHubGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#B8D4E8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0.95" />
            </radialGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1A1A1A" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Outer & Inner Editorial Hairline Grid Rings */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#D4D0CA" strokeWidth="1.25" strokeDasharray="4 4" />
          <circle cx={center} cy={center} r={radius * 0.62} fill="none" stroke="#E8E4DC" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx={center} cy={center} r={radius + 42} fill="none" stroke="#E8E4DC" strokeWidth="0.75" opacity="0.65" />

          {/* Central NIGHTHAWK Coordinator Hub */}
          <g filter="url(#softShadow)">
            <circle
              cx={center}
              cy={center}
              r={58}
              fill="url(#editorialHubGradient)"
              stroke="#7BAFD4"
              strokeWidth="1.75"
              className="node-transition"
            />
            <circle
              cx={center}
              cy={center}
              r={49}
              fill="#FFFFFF"
              stroke="#B8D4E8"
              strokeWidth="1"
              strokeDasharray="5 4"
              className="animate-spin-slow origin-center"
            />
            <text
              x={center}
              y={center - 8}
              textAnchor="middle"
              fill="#1A1A1A"
              fontSize="14"
              fontWeight="600"
              fontFamily='"Instrument Serif", Georgia, serif'
              letterSpacing="0.04em"
            >
              Nighthawk
            </text>
            <text
              x={center}
              y={center + 9}
              textAnchor="middle"
              fill="#6B6B6B"
              fontSize="8.5"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
              letterSpacing="0.14em"
            >
              COORDINATOR
            </text>
            <text
              x={center}
              y={center + 24}
              textAnchor="middle"
              fill="#4D8FB8"
              fontSize="9.5"
              fontWeight="600"
              fontFamily='"JetBrains Mono", monospace'
            >
              RS(8,4) HUB
            </text>
          </g>

          {/* 12 Mesh Nodes & Connectors */}
          {nodes.map((node, index) => {
            const angle = (index * (360 / 12) - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const isSelected = selectedNode?.node_id === node.node_id;
            const colors = getNodeColor(node.status);

            const isTransferring =
              activeAnimation === 'distributing' ||
              (activeAnimation === 'reconstructing' && node.status === 'Online') ||
              (activeAnimation === 'healing' && (node.status === 'Recovering' || node.status === 'Online'));

            const lineStroke = isTransferring
              ? activeAnimation === 'healing' || activeAnimation === 'reconstructing'
                ? '#7A9E7E'
                : '#4D8FB8'
              : node.status === 'Offline'
              ? '#E8E4DC'
              : colors.stroke;

            return (
              <g key={node.node_id} onClick={() => onSelectNode(node)} className="cursor-pointer group">
                {/* Connecting Vector Line */}
                <line
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke={lineStroke}
                  strokeWidth={isSelected ? '2.25' : isTransferring ? '2' : '1.15'}
                  strokeDasharray={isTransferring ? '6 4' : 'none'}
                  className={`node-transition ${isTransferring ? 'animate-dash' : ''}`}
                  opacity={node.status === 'Offline' ? 0.5 : isTransferring ? 0.95 : 0.6}
                />

                {/* Selected Halo Ring */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={30}
                    fill="none"
                    stroke="#1A1A1A"
                    strokeWidth="1.25"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Node Outer Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={24}
                  fill={colors.outerFill}
                  stroke={isSelected ? '#1A1A1A' : colors.stroke}
                  strokeWidth={isSelected ? '2.25' : '1.75'}
                  filter="url(#softShadow)"
                  className="node-transition group-hover:scale-110 origin-center"
                />

                {/* Node Inner Disk */}
                <circle cx={x} cy={y} r={17} fill={colors.innerFill} className="node-transition" />

                {/* Node Label (N01 .. N12) */}
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={colors.labelColor}
                  fontSize="10.5"
                  fontWeight="600"
                  fontFamily='"JetBrains Mono", monospace'
                  className="node-transition"
                >
                  N{node.node_id < 10 ? `0${node.node_id}` : node.node_id}
                </text>

                {/* Shard Label Outside Ring */}
                <text
                  x={center + (radius + 36) * Math.cos(angle)}
                  y={center + (radius + 36) * Math.sin(angle) + 3.5}
                  textAnchor="middle"
                  fill={node.status === 'Offline' ? '#B5363A' : '#6B6B6B'}
                  fontSize="10"
                  fontFamily='"JetBrains Mono", monospace'
                  fontWeight="600"
                  className="node-transition"
                >
                  {node.shard_id !== null
                    ? node.shard_id < 8
                      ? `D${node.shard_id}`
                      : `P${node.shard_id - 8}`
                    : '—'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Animation Status Banner at Bottom */}
      <div className="w-full pt-3 border-t border-border text-center z-10">
        {activeAnimation === 'distributing' && (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-medium text-powder-blue-dark bg-powder-blue-light/30 px-4 py-1.5 rounded-full border border-powder-blue-light animate-pulse">
            Dispersing RS(8,4) shards across 12 storage nodes...
          </span>
        )}
        {activeAnimation === 'reconstructing' && (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-medium text-sage bg-sage-bg px-4 py-1.5 rounded-full border border-sage-light animate-pulse">
            Streaming surviving shards to coordinator (8-of-12)...
          </span>
        )}
        {activeAnimation === 'healing' && (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-medium text-sage bg-sage-bg px-4 py-1.5 rounded-full border border-sage-light animate-pulse">
            Regenerating & restoring missing shards outward...
          </span>
        )}
        {activeAnimation === 'idle' && (
          <span className="text-xs font-sans text-mid-grey">
            Select any node on the ring to inspect hardware telemetry, shard metadata, and Blake3 digests
          </span>
        )}
      </div>
    </div>
  );
};
