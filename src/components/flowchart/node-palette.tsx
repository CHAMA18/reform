'use client';

import { useState } from 'react';
import { NODE_CATALOG, FIELD_TYPES, type NodeType, type FieldType } from '@/lib/flowchart/types';
import { useFlowchartStore } from '@/lib/flowchart/store';

/**
 * NodePalette
 *
 * The left sidebar of the builder. Shows draggable node types that can be
 * dragged onto the canvas, or clicked to add at the canvas center.
 *
 * Enhanced UX:
 *   - The "Input Field" item expands to reveal a grid of all 13 field
 *     types (text, email, number, dropdown, etc.) so users can add a
 *     specific field type with one click instead of adding a generic
 *     field and then changing its type in the inspector.
 *   - Each field type has its own icon for visual scannability.
 *   - Drag any item onto the canvas, or click to add at center.
 *   - Keyboard-friendly: the expanded grid is a list of buttons.
 */
const PALETTE_ITEMS: NodeType[] = ['start', 'field', 'condition', 'submit', 'end'];

export function NodePalette() {
  const addNode = useFlowchartStore((s) => s.addNode);
  const [fieldExpanded, setFieldExpanded] = useState(true);

  /**
   * Add a field node with a specific field type. We add a generic field
   * node first, then immediately patch its fieldType + label via the
   * store. The store's addNode doesn't accept a fieldType override, so
   * we add then update.
   */
  const addFieldOfType = (fieldType: FieldType) => {
    const info = FIELD_TYPES.find((f) => f.value === fieldType);
    // addNode returns the new node's id; we use the store's updateNodeData
    // to set the fieldType and a sensible default label.
    const store = useFlowchartStore.getState();
    const id = store.addNode('field');
    if (id) {
      store.updateNodeData(id, {
        fieldType,
        label: info?.label ?? fieldType,
      });
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-rf-surface-container/60 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-rf-primary">
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Node Palette
          </span>
        </div>
        <p className="mt-1 text-[10px] text-rf-on-surface-variant">
          Drag onto canvas or click to add
        </p>
      </div>

      {/* Palette items */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {PALETTE_ITEMS.map((type) => {
          const catalog = NODE_CATALOG[type];
          const isField = type === 'field';

          return (
            <div key={type}>
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/node-type', type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  if (isField) {
                    setFieldExpanded((v) => !v);
                  } else {
                    addNode(type);
                  }
                }}
                className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-rf-surface/50 p-3 text-left transition-all hover:border-white/20 hover:bg-rf-surface"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
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
                  <div className="text-[13px] font-semibold text-rf-on-surface">
                    {catalog.label}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-tight text-rf-on-surface-variant">
                    {catalog.description}
                  </div>
                </div>
                {isField ? (
                  <span className={`material-symbols-outlined text-[14px] text-rf-on-surface-variant transition-transform ${fieldExpanded ? 'rotate-90' : ''}`}>
                    chevron_right
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[14px] text-rf-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
                    drag_indicator
                  </span>
                )}
              </button>

              {/* Field-type sub-palette — expands when "Input Field" is clicked */}
              {isField && fieldExpanded && (
                <div className="mt-1.5 ml-3 grid grid-cols-2 gap-1.5 border-l border-white/10 pl-3">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/node-type', 'field');
                        e.dataTransfer.setData('application/field-type', ft.value);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => addFieldOfType(ft.value)}
                      className="group/ft flex items-center gap-1.5 rounded-lg border border-white/5 bg-rf-input-hollow-bg px-2 py-1.5 text-left transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
                      title={`Add ${ft.label} field`}
                    >
                      <span className="material-symbols-outlined text-[14px] text-rf-on-surface-variant group-hover/ft:text-rf-primary">
                        {ft.icon}
                      </span>
                      <span className="truncate text-[10px] font-medium text-rf-on-surface-variant group-hover/ft:text-rf-on-surface">
                        {ft.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips footer */}
      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg border border-white/5 bg-rf-surface/30 p-3">
          <div className="flex items-center gap-1.5 text-rf-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Tips
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-rf-on-surface-variant/80">
            <li>· Drag from a node&apos;s right edge to connect</li>
            <li>· Conditions branch into true / false</li>
            <li>· Click an edge to delete it</li>
            <li>· Scroll to zoom, drag bg to pan</li>
            <li>· Press <kbd className="rounded bg-rf-surface px-1 font-mono">Del</kbd> to remove a node</li>
            <li>· Press <kbd className="rounded bg-rf-surface px-1 font-mono">Esc</kbd> to cancel a connection</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
