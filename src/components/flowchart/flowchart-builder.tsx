'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFlowchartStore } from '@/lib/flowchart/store';
import { NODE_CATALOG, FIELD_TYPES, type FlowNode, type NodeType } from '@/lib/flowchart/types';
import { FlowNodeCard } from './flow-node-card';
import { FlowEdgeLayer } from './flow-edge-layer';
import { NodePalette } from './node-palette';
import { NodeInspector } from './node-inspector';

/**
 * FlowchartBuilder
 *
 * The main visual node editor. Renders an infinite pannable/zoomable canvas
 * where users drag nodes from the palette, connect them with edges, and
 * edit properties in the inspector panel.
 *
 * Architecture:
 *   - SVG layer renders the edges (bezier curves with arrowheads)
 *   - Absolutely-positioned divs render the node cards (draggable)
 *   - A background grid provides spatial reference
 *   - Pan = drag on empty canvas; Zoom = mouse wheel
 *   - Node drag = drag on a node card header
 *   - Edge creation = drag from a node's output handle to another node
 */
export function FlowchartBuilder() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const {
    flowchart,
    selectedNodeId,
    pendingEdge,
    selectNode,
    moveNode,
    addNode,
    startEdge,
    completeEdge,
    cancelEdge,
    deleteEdge,
  } = useFlowchartStore();

  // --- Pan & Zoom ---
  const panStart = useRef({ x: 0, y: 0, vpX: 0, vpY: 0 });

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan if clicking on the canvas background, not a node.
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg) {
        if (pendingEdge) {
          cancelEdge();
          return;
        }
        selectNode(null);
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          vpX: viewport.x,
          vpY: viewport.y,
        };
      }
    },
    [viewport, pendingEdge, selectNode, cancelEdge]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setViewport((vp) => ({
          ...vp,
          x: panStart.current.vpX + dx,
          y: panStart.current.vpY + dy,
        }));
      } else if (draggingNode) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x =
          (e.clientX - rect.left - viewport.x) / viewport.zoom -
          draggingNode.offsetX;
        const y =
          (e.clientY - rect.top - viewport.y) / viewport.zoom -
          draggingNode.offsetY;
        moveNode(draggingNode.id, { x, y });
      }

      // Track mouse position for live edge preview
      if (pendingEdge) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        setMousePos({ x, y });
      }
    },
    [isPanning, draggingNode, viewport, moveNode, pendingEdge]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
    if (pendingEdge) {
      // If we release without completing the edge, cancel it
      setMousePos(null);
    }
  }, [pendingEdge]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!canvasRef.current) return;
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(viewport.zoom + delta, 0.3), 2.5);
      // Zoom toward mouse position
      const scale = newZoom / viewport.zoom;
      setViewport((vp) => ({
        zoom: newZoom,
        x: mouseX - (mouseX - vp.x) * scale,
        y: mouseY - (mouseY - vp.y) * scale,
      }));
    },
    [viewport]
  );

  // --- Node dragging ---
  const handleNodeDragStart = useCallback(
    (e: React.MouseEvent, node: FlowNode) => {
      e.stopPropagation();
      selectNode(node.id);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nodeScreenX = node.position.x * viewport.zoom + viewport.x + rect.left;
      const nodeScreenY = node.position.y * viewport.zoom + viewport.y + rect.top;
      setDraggingNode({
        id: node.id,
        offsetX: e.clientX - nodeScreenX,
        offsetY: e.clientY - nodeScreenY,
      });
    },
    [selectNode, viewport]
  );

  // --- Edge creation ---
  const handleOutputHandleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string, branch?: 'true' | 'false') => {
      e.stopPropagation();
      startEdge(nodeId, branch);
    },
    [startEdge]
  );

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (pendingEdge) {
        completeEdge(nodeId);
      } else {
        selectNode(nodeId);
      }
    },
    [pendingEdge, completeEdge, selectNode]
  );

  // --- Palette drag to canvas ---
  const handlePaletteDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/node-type') as NodeType;
      if (!type) return;
      const fieldType = e.dataTransfer.getData('application/field-type') as string | '';
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      const id = addNode(type, { x: x - 100, y: y - 34 });
      // If a specific field type was dragged from the sub-palette, apply it
      if (type === 'field' && fieldType) {
        const info = FIELD_TYPES.find((f) => f.value === fieldType);
        useFlowchartStore.getState().updateNodeData(id, {
          fieldType: fieldType as never,
          label: info?.label ?? fieldType,
        });
      }
    },
    [addNode, viewport]
  );

  // Global mouse listeners so dragging continues outside the canvas
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning || draggingNode) {
        handleCanvasMouseMove(e as unknown as React.MouseEvent);
      }
    };
    const handleGlobalMouseUp = () => {
      if (isPanning || draggingNode) {
        handleCanvasMouseUp();
      }
    };
    if (isPanning || draggingNode) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, draggingNode, handleCanvasMouseMove, handleCanvasMouseUp]);

  // Escape key cancels pending edge; Delete key removes selected node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingEdge) {
        cancelEdge();
        setMousePos(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target as HTMLElement;
        // Don't delete if typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        const node = flowchart.nodes.find((n) => n.id === selectedNodeId);
        if (node && node.type !== 'start' && node.type !== 'end') {
          useFlowchartStore.getState().deleteNode(selectedNodeId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingEdge, selectedNodeId, cancelEdge, flowchart.nodes]);

  const selectedNode = flowchart.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const pendingEdgeSource = pendingEdge
    ? flowchart.nodes.find((n) => n.id === pendingEdge.source) ?? null
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-rf-surface-base">
      {/* Left: Node Palette */}
      <div data-tour="builder-palette">
        <NodePalette />
      </div>

      {/* Center: Canvas */}
      <div data-tour="builder-canvas" className="relative flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handlePaletteDrop}
        >
          {/* Background grid */}
          <div
            data-canvas-bg="true"
            className="absolute inset-0"
            style={{
              backgroundColor: '#0a0d14',
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)
              `,
              backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
              backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            }}
          />

          {/* Pan/zoom transform layer */}
          <div
            data-canvas-bg="true"
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            }}
          >
            {/* SVG edge layer */}
            <FlowEdgeLayer
              nodes={flowchart.nodes}
              edges={flowchart.edges}
              pendingEdgeSource={pendingEdgeSource}
              pendingEdgeBranch={pendingEdge?.branch}
              mousePos={mousePos}
              onEdgeDelete={(id) => deleteEdge(id)}
            />

            {/* Node cards */}
            {flowchart.nodes.map((node) => (
              <FlowNodeCard
                key={node.id}
                node={node}
                selected={node.id === selectedNodeId}
                isPendingTarget={!!pendingEdge && pendingEdge.source !== node.id}
                isConnectionSource={pendingEdge?.source === node.id}
                onMouseDown={(e) => handleNodeDragStart(e, node)}
                onClick={(e) => handleNodeClick(e, node.id)}
                onOutputMouseDown={(e, branch) =>
                  handleOutputHandleMouseDown(e, node.id, branch)
                }
              />
            ))}
          </div>

          {/* Empty-state prompt — shown when there are no nodes on the canvas */}
          {flowchart.nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-rf-surface-container/60 backdrop-blur-xl">
                  <span className="material-symbols-outlined text-[32px] text-rf-primary">
                    add_circle
                  </span>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-rf-on-surface">
                    Start building your form
                  </p>
                  <p className="mt-1 text-[12px] text-rf-on-surface-variant">
                    Drag a node from the palette on the left, or click to add one
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-white/10 bg-rf-surface-container/90 p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() =>
                setViewport((vp) => ({ ...vp, zoom: Math.max(vp.zoom - 0.1, 0.3) }))
              }
              className="rounded p-1.5 text-rf-on-surface-variant transition-colors hover:bg-white/5 hover:text-rf-on-surface"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <span className="min-w-[44px] text-center font-mono text-[11px] text-rf-on-surface-variant">
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setViewport((vp) => ({ ...vp, zoom: Math.min(vp.zoom + 0.1, 2.5) }))
              }
              className="rounded p-1.5 text-rf-on-surface-variant transition-colors hover:bg-white/5 hover:text-rf-on-surface"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <div className="mx-1 h-5 w-px bg-white/10" />
            {/* Fit to view — calculates the bounding box of all nodes and
                centers/scales them to fit the canvas */}
            <button
              type="button"
              onClick={() => {
                if (flowchart.nodes.length === 0) {
                  setViewport({ x: 0, y: 0, zoom: 1 });
                  return;
                }
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const padding = 80;
                const nodeWidth = 240;
                const nodeHeight = 68;
                const xs = flowchart.nodes.map((n) => n.position.x);
                const ys = flowchart.nodes.map((n) => n.position.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs) + nodeWidth;
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys) + nodeHeight;
                const contentW = maxX - minX;
                const contentH = maxY - minY;
                const availW = rect.width - padding * 2;
                const availH = rect.height - padding * 2;
                const zoom = Math.min(Math.min(availW / contentW, availH / contentH), 1.5);
                const x = (rect.width - contentW * zoom) / 2 - minX * zoom;
                const y = (rect.height - contentH * zoom) / 2 - minY * zoom;
                setViewport({ x, y, zoom: Math.max(zoom, 0.3) });
              }}
              className="rounded p-1.5 text-rf-on-surface-variant transition-colors hover:bg-white/5 hover:text-rf-on-surface"
              aria-label="Fit to view"
              title="Fit all nodes in view"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
              className="rounded p-1.5 text-rf-on-surface-variant transition-colors hover:bg-white/5 hover:text-rf-on-surface"
              aria-label="Reset view to 100%"
              title="Reset to 100%"
            >
              <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
            </button>
          </div>

          {/* Status bar */}
          <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-lg border border-white/10 bg-rf-surface-container/90 px-3 py-1.5 backdrop-blur-xl">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {flowchart.nodes.length} nodes · {flowchart.edges.length} edges
            </span>
          </div>

          {/* Pending edge hint */}
          {pendingEdge && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg border border-rf-primary/30 bg-rf-primary/10 px-4 py-2 text-[12px] font-medium text-rf-primary backdrop-blur-xl">
              Click a target node to connect {pendingEdge.branch ? `(branch: ${pendingEdge.branch})` : ''}
              <button
                type="button"
                onClick={cancelEdge}
                className="ml-3 rounded px-1.5 py-0.5 text-[10px] uppercase hover:bg-rf-primary/20"
              >
                Esc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Inspector */}
      <div data-tour="builder-inspector">
        <NodeInspector />
      </div>
    </div>
  );
}
