import { create } from 'zustand';
import type { Flowchart, FlowNode, FlowEdge, NodeType, FlowNodeData } from './types';
import { NODE_CATALOG } from './types';
import {
  generateSchema,
  validateFlowchart,
  generateNodeId,
  generateEdgeId,
  createDefaultFlowchart,
} from './schema-generator';

interface FlowchartState {
  flowchart: Flowchart;
  selectedNodeId: string | null;
  formName: string;
  formDescription: string;
  pendingEdge: { source: string; branch?: 'true' | 'false' } | null;
  // History stack for undo/redo
  _history: Flowchart[];
  _historyIndex: number;

  // Actions
  addNode: (type: NodeType, position?: { x: number; y: number }) => string;
  updateNodeData: (id: string, data: Partial<FlowNodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => string | null;
  selectNode: (id: string | null) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;

  startEdge: (source: string, branch?: 'true' | 'false') => void;
  completeEdge: (target: string) => void;
  cancelEdge: () => void;
  deleteEdge: (id: string) => void;

  setFormName: (name: string) => void;
  setFormDescription: (desc: string) => void;
  loadFlowchart: (fc: Flowchart, name?: string, desc?: string) => void;
  reset: () => void;

  // History (undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Computed
  getSchema: () => ReturnType<typeof generateSchema>;
  getErrors: () => string[];
}

export const useFlowchartStore = create<FlowchartState>((set, get) => {
  const defaultFc = createDefaultFlowchart();

  // Helper: push current flowchart to history before a mutation
  const pushHistory = (state: FlowchartState) => {
    const newHistory = state._history.slice(0, state._historyIndex + 1);
    newHistory.push(state.flowchart);
    // Cap history at 50 entries
    if (newHistory.length > 50) newHistory.shift();
    return { _history: newHistory, _historyIndex: newHistory.length - 1 };
  };

  return {
  flowchart: defaultFc,
  selectedNodeId: null,
  formName: 'Untitled Form',
  formDescription: '',
  pendingEdge: null,
  _history: [defaultFc],
  _historyIndex: 0,

  addNode: (type, position) => {
    const catalog = NODE_CATALOG[type];
    const id = generateNodeId();
    // Snap to 20px grid for cleaner placement
    const rawPos = position ?? {
      x: 400 + Math.random() * 200,
      y: 200 + Math.random() * 200,
    };
    const snappedPos = {
      x: Math.round(rawPos.x / 20) * 20,
      y: Math.round(rawPos.y / 20) * 20,
    };
    const node: FlowNode = {
      id,
      type,
      position: snappedPos,
      data: {
        ...catalog.defaultData,
        label: catalog.defaultData.label ?? catalog.label,
      } as FlowNodeData,
    };
    set((state) => ({
      ...pushHistory(state),
      flowchart: {
        ...state.flowchart,
        nodes: [...state.flowchart.nodes, node],
      },
      selectedNodeId: id,
    }));
    return id;
  },

  updateNodeData: (id, data) =>
    set((state) => ({
      ...pushHistory(state),
      flowchart: {
        ...state.flowchart,
        nodes: state.flowchart.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        ),
      },
    })),

  deleteNode: (id) =>
    set((state) => ({
      ...pushHistory(state),
      flowchart: {
        nodes: state.flowchart.nodes.filter((n) => n.id !== id),
        edges: state.flowchart.edges.filter(
          (e) => e.source !== id && e.target !== id
        ),
      },
      selectedNodeId:
        state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  duplicateNode: (id) => {
    const state = get();
    const original = state.flowchart.nodes.find((n) => n.id === id);
    if (!original) return null;
    const newId = generateNodeId();
    const newNode: FlowNode = {
      ...original,
      id: newId,
      position: {
        x: Math.round((original.position.x + 60) / 20) * 20,
        y: Math.round((original.position.y + 60) / 20) * 20,
      },
      data: { ...original.data, label: `${original.data.label} (copy)` },
    };
    set((s) => ({
      ...pushHistory(s),
      flowchart: {
        ...s.flowchart,
        nodes: [...s.flowchart.nodes, newNode],
      },
      selectedNodeId: newId,
    }));
    return newId;
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  moveNode: (id, position) => {
    // Snap to 20px grid
    const snapped = {
      x: Math.round(position.x / 20) * 20,
      y: Math.round(position.y / 20) * 20,
    };
    set((state) => ({
      flowchart: {
        ...state.flowchart,
        nodes: state.flowchart.nodes.map((n) =>
          n.id === id ? { ...n, position: snapped } : n
        ),
      },
    }));
  },

  startEdge: (source, branch) =>
    set({ pendingEdge: { source, branch } }),

  completeEdge: (target) =>
    set((state) => {
      if (!state.pendingEdge) return {};
      const { source, branch } = state.pendingEdge;
      if (source === target) return { pendingEdge: null };

      const filteredEdges = branch
        ? state.flowchart.edges.filter(
            (e) => !(e.source === source && e.branch === branch)
          )
        : state.flowchart.edges;

      const newEdge: FlowEdge = {
        id: generateEdgeId(),
        source,
        target,
        branch,
        label: branch === 'true' ? 'true' : branch === 'false' ? 'false' : undefined,
      };

      return {
        ...pushHistory(state),
        flowchart: {
          ...state.flowchart,
          edges: [...filteredEdges, newEdge],
        },
        pendingEdge: null,
      };
    }),

  cancelEdge: () => set({ pendingEdge: null }),

  deleteEdge: (id) =>
    set((state) => ({
      ...pushHistory(state),
      flowchart: {
        ...state.flowchart,
        edges: state.flowchart.edges.filter((e) => e.id !== id),
      },
    })),

  setFormName: (name) => set({ formName: name }),
  setFormDescription: (desc) => set({ formDescription: desc }),

  loadFlowchart: (fc, name, desc) =>
    set({
      flowchart: fc,
      formName: name ?? 'Untitled Form',
      formDescription: desc ?? '',
      selectedNodeId: null,
      pendingEdge: null,
      _history: [fc],
      _historyIndex: 0,
    }),

  reset: () => {
    const fc = createDefaultFlowchart();
    set({
      flowchart: fc,
      formName: 'Untitled Form',
      formDescription: '',
      selectedNodeId: null,
      pendingEdge: null,
      _history: [fc],
      _historyIndex: 0,
    });
  },

  undo: () =>
    set((state) => {
      if (state._historyIndex <= 0) return {};
      const newIndex = state._historyIndex - 1;
      return {
        flowchart: state._history[newIndex],
        _historyIndex: newIndex,
        selectedNodeId: null,
        pendingEdge: null,
      };
    }),

  redo: () =>
    set((state) => {
      if (state._historyIndex >= state._history.length - 1) return {};
      const newIndex = state._historyIndex + 1;
      return {
        flowchart: state._history[newIndex],
        _historyIndex: newIndex,
        selectedNodeId: null,
        pendingEdge: null,
      };
    }),

  canUndo: () => get()._historyIndex > 0,
  canRedo: () => get()._historyIndex < get()._history.length - 1,

  getSchema: () => {
    const { flowchart, formName } = get();
    return generateSchema(flowchart, formName);
  },

  getErrors: () => {
    const { flowchart } = get();
    return validateFlowchart(flowchart);
  },
  };
});
