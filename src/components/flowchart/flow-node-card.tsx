'use client';

import { NODE_CATALOG, FIELD_TYPES, type FlowNode, type NodeType } from '@/lib/flowchart/types';
import { useFlowchartStore } from '@/lib/flowchart/store';

/**
 * FlowNodeCard
 *
 * Renders a single node on the canvas with world-class connection handles.
 *
 * Connection model:
 *   - Every node (except Start) has an INPUT handle on the LEFT (a port circle)
 *   - Every node (except End) has an OUTPUT handle on the RIGHT
 *   - Condition nodes have TWO output handles on the RIGHT: True (green) + False (red)
 *
 * Visual design:
 *   - Handles are larger, more visible, with glow effects on hover
 *   - Active connection source shows a pulsing ring
 *   - Valid drop targets highlight with a green ring
 *   - Handles show a tooltip on hover ("Drag to connect")
 *   - Input handle glows when a connection is being dragged
 */

const NODE_WIDTH = 240;
const NODE_HEIGHT = 68;

/**
 * Connection validation rules:
 *   - Start: can only output, not input
 *   - End: can only input, not output
 *   - Cannot connect a node to itself
 *   - Cannot create duplicate edges (same source → target)
 *   - Cannot create cycles (target → ... → source)
 */
export function canConnect(
  sourceType: NodeType,
  targetType: NodeType,
  sourceId: string,
  targetId: string
): boolean {
  if (sourceId === targetId) return false;
  if (targetType === 'start') return false; // Start can't receive input
  if (sourceType === 'end') return false; // End can't output
  return true;
}

export function FlowNodeCard({
  node,
  selected,
  isPendingTarget,
  isConnectionSource,
  onMouseDown,
  onClick,
  onOutputMouseDown,
}: {
  node: FlowNode;
  selected: boolean;
  isPendingTarget: boolean;
  isConnectionSource: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onOutputMouseDown: (e: React.MouseEvent, branch?: 'true' | 'false') => void;
}) {
  const catalog = NODE_CATALOG[node.type];
  const { deleteNode, flowchart } = useFlowchartStore();

  // Look up the field-type metadata (icon + label) for field nodes so we
  // can show a distinctive icon next to the label — e.g. an envelope icon
  // for email fields, a calendar for date fields, etc. This makes the
  // canvas scannable at a glance: you can tell field types apart without
  // selecting each node.
  const fieldTypeInfo = node.type === 'field'
    ? FIELD_TYPES.find((f) => f.value === node.data.fieldType)
    : null;

  const isCondition = node.type === 'condition';
  const isTerminal = node.type === 'start' || node.type === 'end';
  const hasInput = node.type !== 'start';
  const hasOutput = node.type !== 'end';

  // Count incoming connections for display
  const incomingCount = flowchart.edges.filter((e) => e.target === node.id).length;
  const outgoingCount = flowchart.edges.filter((e) => e.source === node.id).length;

  return (
    <div
      className="absolute select-none"
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Selection ring + connection state */}
      <div
        className={`relative rounded-xl border transition-all duration-200 ${
          selected
            ? 'border-rf-primary shadow-[0_0_0_2px_rgba(245,158,11,0.3),0_8px_24px_rgba(0,0,0,0.3)]'
            : isConnectionSource
            ? 'border-rf-primary shadow-[0_0_0_2px_rgba(245,158,11,0.4),0_8px_24px_rgba(0,0,0,0.3)]'
            : isPendingTarget
            ? 'border-emerald-400/60 shadow-[0_0_0_2px_rgba(16,185,129,0.3),0_8px_24px_rgba(0,0,0,0.2)] hover:border-emerald-400'
            : 'border-rf-border-white-faint hover:border-rf-primary/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
        }`}
        style={{
          minHeight: NODE_HEIGHT,
          background: 'var(--rf-surface-container)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute left-0 right-0 top-0 h-1 rounded-t-xl"
          style={{ backgroundColor: catalog.color }}
        />

        {/* Node content */}
        <div className="flex items-center gap-3 px-3 py-3">
          {/* Main type icon (colored) */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${catalog.color}20`,
              color: catalog.color,
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              {catalog.icon}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            {/* Label line — with field-type icon prefix for field nodes */}
            <div className="flex items-center gap-1.5">
              {fieldTypeInfo && (
                <span
                  className="material-symbols-outlined shrink-0 text-[13px]"
                  style={{ color: catalog.color }}
                  title={fieldTypeInfo.label}
                >
                  {fieldTypeInfo.icon}
                </span>
              )}
              <div className="truncate text-[12px] font-semibold text-rf-on-surface" title={node.data.label}>
                {node.data.label}
              </div>
            </div>
            {/* Subtitle — field type + required flag, or node type */}
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="truncate font-mono text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                {node.type === 'field'
                  ? fieldTypeInfo?.label ?? node.data.fieldType ?? 'text'
                  : node.type === 'condition'
                  ? 'if / else'
                  : node.type}
              </span>
              {node.type === 'field' && node.data.required && (
                <span className="rounded bg-rose-500/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-rose-400">
                  required
                </span>
              )}
              {node.type === 'field' && node.data.validation && (
                <span className="text-[9px] text-rf-primary" title="Has validation rules">
                  ⊟
                </span>
              )}
            </div>
          </div>

          {/* Connection count badges */}
          <div className="flex shrink-0 items-center gap-1">
            {incomingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rf-primary/10 px-1 text-[9px] font-bold text-rf-primary">
                ←{incomingCount}
              </span>
            )}
            {outgoingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/10 px-1 text-[9px] font-bold text-emerald-400">
                {outgoingCount}→
              </span>
            )}
          </div>

          {/* Delete button */}
          {!isTerminal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(node.id);
              }}
              className="rounded p-1 text-rf-on-surface-variant opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
              style={{ opacity: selected ? 1 : undefined }}
              aria-label="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        {/* Options indicator for dropdown/radio/checkbox */}
        {node.type === 'field' &&
          node.data.options &&
          node.data.options.filter((o) => o.trim()).length > 0 && (
            <div className="border-t border-rf-border-white-faint/50 px-3 py-1.5">
              <div className="flex flex-wrap gap-1">
                {node.data.options
                  .filter((o) => o.trim())
                  .slice(0, 3)
                  .map((opt, i) => (
                    <span
                      key={i}
                      className="rounded bg-rf-input-hollow-bg px-1.5 py-0.5 font-mono text-[9px] text-rf-on-surface-variant"
                    >
                      {opt}
                    </span>
                  ))}
                {node.data.options.filter((o) => o.trim()).length > 3 && (
                  <span className="font-mono text-[9px] text-rf-on-surface-variant">
                    +{node.data.options.filter((o) => o.trim()).length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

        {/* === INPUT HANDLE (left side) === */}
        {hasInput && (
          <div
            className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
              isPendingTarget ? 'scale-150' : ''
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                isPendingTarget
                  ? 'border-emerald-400 bg-emerald-400/20 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'border-rf-surface-container bg-rf-on-surface-variant/60 hover:bg-rf-primary hover:scale-125'
              }`}
              title="Input — drop a connection here"
            >
              {isPendingTarget && (
                <span className="material-symbols-outlined text-[10px] text-emerald-400">
                  add
                </span>
              )}
            </div>
            {/* Pulse ring when pending target */}
            {isPendingTarget && (
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-emerald-400/40" />
            )}
          </div>
        )}

        {/* === OUTPUT HANDLES (right side) === */}
        {hasOutput && (
          <>
            {isCondition ? (
              <>
                {/* True branch handle — right top */}
                <div className="absolute right-0 top-1/3 flex flex-col items-center">
                  <button
                    type="button"
                    onMouseDown={(e) => onOutputMouseDown(e, 'true')}
                    onClick={(e) => e.stopPropagation()}
                    className="group/handle flex h-6 w-6 translate-x-1/2 items-center justify-center rounded-full border-2 border-rf-surface-container bg-emerald-500 transition-all duration-200 hover:scale-125 hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    title="True branch — drag to connect"
                  >
                    <span className="font-mono text-[8px] font-bold text-white">T</span>
                  </button>
                  <span className="mt-0.5 translate-x-2 text-[8px] font-bold uppercase text-emerald-400 opacity-0 transition-opacity group-hover/handle:opacity-100">
                    true
                  </span>
                </div>
                {/* False branch handle — right bottom */}
                <div className="absolute bottom-1/4 right-0 flex flex-col items-center">
                  <button
                    type="button"
                    onMouseDown={(e) => onOutputMouseDown(e, 'false')}
                    onClick={(e) => e.stopPropagation()}
                    className="group/handle flex h-6 w-6 translate-x-1/2 items-center justify-center rounded-full border-2 border-rf-surface-container bg-rose-500 transition-all duration-200 hover:scale-125 hover:shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                    title="False branch — drag to connect"
                  >
                    <span className="font-mono text-[8px] font-bold text-white">F</span>
                  </button>
                  <span className="mt-0.5 translate-x-2 text-[8px] font-bold uppercase text-rose-400 opacity-0 transition-opacity group-hover/handle:opacity-100">
                    false
                  </span>
                </div>
              </>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => onOutputMouseDown(e)}
                onClick={(e) => e.stopPropagation()}
                className="group/handle absolute right-0 top-1/2 flex h-6 w-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-rf-surface-container bg-rf-primary transition-all duration-200 hover:scale-125 hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                title="Output — drag to connect"
              >
                <span className="material-symbols-outlined text-[12px] text-white opacity-0 transition-opacity group-hover/handle:opacity-100">
                  arrow_forward
                </span>
              </button>
            )}
          </>
        )}

        {/* Connection source pulse */}
        {isConnectionSource && (
          <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl border-2 border-rf-primary/40" />
        )}
      </div>
    </div>
  );
}
