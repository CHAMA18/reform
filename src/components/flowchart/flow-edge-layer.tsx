'use client';

import { useMemo, useState } from 'react';
import type { FlowNode, FlowEdge } from '@/lib/flowchart/types';

const NODE_WIDTH = 240;
const BASE_NODE_HEIGHT = 64;
const HANDLE_OFFSET = 12; // handle extends 12px past node edge (h-6 w-6 = 24px, translate-x-1/2 = 12px)

/**
 * Calculate the actual rendered height of a node based on its content.
 * - Base: 64px (header with icon + label + badges)
 * - Options section: +32px (if field with non-empty options)
 */
function getNodeHeight(node: FlowNode): number {
  let h = BASE_NODE_HEIGHT;
  if (
    node.type === 'field' &&
    node.data.options &&
    node.data.options.filter((o) => o.trim()).length > 0
  ) {
    h += 32; // options row
  }
  return h;
}

/**
 * Get the Y center of a node based on its actual height.
 */
function getNodeCenterY(node: FlowNode): number {
  return node.position.y + getNodeHeight(node) / 2;
}

/**
 * FlowEdgeLayer
 *
 * Renders SVG bezier curves that connect from the output handle of the source
 * node to the input handle of the target node. The arrowhead touches the
 * input handle precisely.
 */
export function FlowEdgeLayer({
  nodes,
  edges,
  pendingEdgeSource,
  pendingEdgeBranch,
  mousePos,
  onEdgeDelete,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  pendingEdgeSource: FlowNode | null;
  pendingEdgeBranch?: 'true' | 'false';
  mousePos?: { x: number; y: number } | null;
  onEdgeDelete?: (id: string) => void;
}) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);

  const paths = useMemo(() => {
    return edges
      .map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;

        const sourceH = getNodeHeight(source);
        const targetH = getNodeHeight(target);

        // Source point: right edge of source node + handle offset
        const isCondition = source.type === 'condition';
        let sx: number, sy: number;
        if (isCondition && edge.branch === 'true') {
          sx = source.position.x + NODE_WIDTH + HANDLE_OFFSET;
          sy = source.position.y + sourceH / 3;
        } else if (isCondition && edge.branch === 'false') {
          sx = source.position.x + NODE_WIDTH + HANDLE_OFFSET;
          sy = source.position.y + (sourceH * 2) / 3;
        } else {
          sx = source.position.x + NODE_WIDTH + HANDLE_OFFSET;
          sy = source.position.y + sourceH / 2;
        }

        // Target point: left edge of target node - handle offset
        // The arrow tip lands exactly at the center of the input handle
        const tx = target.position.x - HANDLE_OFFSET;
        const ty = target.position.y + targetH / 2;

        // Smooth bezier — horizontal flow with vertical adjustment
        const dx = Math.abs(tx - sx);
        const offset = Math.max(60, dx * 0.5);
        const cp1x = sx + offset;
        const cp1y = sy;
        const cp2x = tx - offset;
        const cp2y = ty;

        const path = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;

        const color =
          edge.branch === 'true'
            ? '#10b981'
            : edge.branch === 'false'
            ? '#f43f5e'
            : '#f59e0b';

        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;

        return { id: edge.id, path, color, label: edge.label, midX, midY };
      })
      .filter(Boolean) as Array<{
      id: string;
      path: string;
      color: string;
      label?: string;
      midX: number;
      midY: number;
    }>;
  }, [edges, nodeMap]);

  // Pending edge — follows mouse from the output handle
  const pendingPath = useMemo(() => {
    if (!pendingEdgeSource || !mousePos) return null;
    const source = pendingEdgeSource;
    const sourceH = getNodeHeight(source);
    const isCondition = source.type === 'condition';
    let sx: number, sy: number;
    if (isCondition && pendingEdgeBranch === 'true') {
      sx = source.position.x + NODE_WIDTH + HANDLE_OFFSET;
      sy = source.position.y + sourceH / 3;
    } else if (isCondition && pendingEdgeBranch === 'false') {
      sx = source.position.x + NODE_WIDTH + HANDLE_OFFSET;
      sy = source.position.y + (sourceH * 2) / 3;
    } else {
      sx = source.position.x + NODE_WIDTH + HANDLE_OFFSET;
      sy = source.position.y + sourceH / 2;
    }

    const tx = mousePos.x;
    const ty = mousePos.y;
    const dx = Math.abs(tx - sx);
    const offset = Math.max(60, dx * 0.5);
    const color =
      pendingEdgeBranch === 'true'
        ? '#10b981'
        : pendingEdgeBranch === 'false'
        ? '#f43f5e'
        : '#f59e0b';

    return {
      path: `M ${sx} ${sy} C ${sx + offset} ${sy}, ${tx - offset} ${ty}, ${tx} ${ty}`,
      color,
    };
  }, [pendingEdgeSource, pendingEdgeBranch, mousePos]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        {[
          { id: 'arrow-amber', color: '#f59e0b' },
          { id: 'arrow-green', color: '#10b981' },
          { id: 'arrow-red', color: '#f43f5e' },
        ].map((marker) => (
          <marker
            key={marker.id}
            id={marker.id}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={marker.color} />
          </marker>
        ))}
      </defs>

      {/* Render edges */}
      {paths.map((p) => {
        const markerId =
          p.color === '#10b981'
            ? 'arrow-green'
            : p.color === '#f43f5e'
            ? 'arrow-red'
            : 'arrow-amber';
        const isHovered = hoveredEdge === p.id;
        return (
          <g
            key={p.id}
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => setHoveredEdge(p.id)}
            onMouseLeave={() => setHoveredEdge(null)}
            onClick={() => onEdgeDelete?.(p.id)}
          >
            {/* Invisible thick hit area */}
            <path d={p.path} fill="none" stroke="transparent" strokeWidth={20} />

            {/* Glow on hover */}
            {isHovered && (
              <path
                d={p.path}
                fill="none"
                stroke={p.color}
                strokeWidth={6}
                strokeOpacity={0.2}
                style={{ filter: 'blur(4px)' }}
              />
            )}

            {/* Main edge */}
            <path
              d={p.path}
              fill="none"
              stroke={p.color}
              strokeWidth={isHovered ? 4 : 2.5}
              strokeOpacity={isHovered ? 1 : 0.8}
              markerEnd={`url(#${markerId})`}
              style={{ transition: 'stroke-width 0.15s ease, stroke-opacity 0.15s ease' }}
            />

            {/* Animated flowing dashes */}
            <path
              d={p.path}
              fill="none"
              stroke={p.color}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray="6 10"
              style={{ animation: 'dash-flow 1.5s linear infinite' }}
            />

            {/* Branch label */}
            {p.label && (
              <g>
                <rect
                  x={p.midX - 24}
                  y={p.midY - 10}
                  width={48}
                  height={20}
                  rx={10}
                  fill="var(--rf-surface-container)"
                  stroke={p.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
                <text
                  x={p.midX}
                  y={p.midY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={700}
                  fill={p.color}
                >
                  {p.label}
                </text>
              </g>
            )}

            {/* Delete tooltip on hover */}
            {isHovered && (
              <g>
                <rect
                  x={p.midX - 40}
                  y={p.midY - 32}
                  width={80}
                  height={18}
                  rx={9}
                  fill="#ef4444"
                  fillOpacity={0.9}
                />
                <text
                  x={p.midX}
                  y={p.midY - 20}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="ui-sans-serif, system-ui"
                  fontWeight={600}
                  fill="#ffffff"
                >
                  Click to delete
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Live preview while dragging */}
      {pendingPath && (
        <>
          <path
            d={pendingPath.path}
            fill="none"
            stroke={pendingPath.color}
            strokeWidth={2.5}
            strokeOpacity={0.6}
            strokeDasharray="8 4"
            style={{ animation: 'dash-flow 0.8s linear infinite' }}
          />
          <circle
            cx={mousePos?.x ?? 0}
            cy={mousePos?.y ?? 0}
            r={6}
            fill={pendingPath.color}
            fillOpacity={0.3}
            stroke={pendingPath.color}
            strokeWidth={2}
          />
          <circle
            cx={mousePos?.x ?? 0}
            cy={mousePos?.y ?? 0}
            r={12}
            fill="none"
            stroke={pendingPath.color}
            strokeWidth={1.5}
            strokeOpacity={0.3}
            style={{ animation: 'pulse-ring 1.5s ease-out infinite' }}
          />
        </>
      )}

      <style>{`
        @keyframes dash-flow { to { stroke-dashoffset: -12; } }
        @keyframes pulse-ring { 0% { r: 6; opacity: 0.6; } 100% { r: 18; opacity: 0; } }
      `}</style>
    </svg>
  );
}
