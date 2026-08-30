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

  // Actions
  addNode: (type: NodeType, position?: { x: number; y: number }) => string;
  updateNodeData: (id: string, data: Partial<FlowNodeData>) => void;
  deleteNode: (id: string) => void;
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

  // Computed
  getSchema: () => ReturnType<typeof generateSchema>;
  getErrors: () => string[];
}

export const useFlowchartStore = create<FlowchartState>((set, get) => ({
  flowchart: createDefaultFlowchart(),
  selectedNodeId: null,
  formName: 'Untitled Form',
  formDescription: '',
  pendingEdge: null,

  addNode: (type, position) => {
    const catalog = NODE_CATALOG[type];
    const id = generateNodeId();
    const node: FlowNode = {
      id,
      type,
      position: position ?? {
        x: 400 + Math.random() * 200,
        y: 200 + Math.random() * 200,
      },
      data: {
        ...catalog.defaultData,
        label: catalog.defaultData.label ?? catalog.label,
      } as FlowNodeData,
    };
    set((state) => ({
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
      flowchart: {
        ...state.flowchart,
        nodes: state.flowchart.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        ),
      },
    })),

  deleteNode: (id) =>
    set((state) => ({
      flowchart: {
        nodes: state.flowchart.nodes.filter((n) => n.id !== id),
        edges: state.flowchart.edges.filter(
          (e) => e.source !== id && e.target !== id
        ),
      },
      selectedNodeId:
        state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  moveNode: (id, position) =>
    set((state) => ({
      flowchart: {
        ...state.flowchart,
        nodes: state.flowchart.nodes.map((n) =>
          n.id === id ? { ...n, position } : n
        ),
      },
    })),

  startEdge: (source, branch) =>
    set({ pendingEdge: { source, branch } }),

  completeEdge: (target) =>
    set((state) => {
      if (!state.pendingEdge) return {};
      const { source, branch } = state.pendingEdge;
      if (source === target) return { pendingEdge: null };

      // Remove any existing edge with the same source+branch (for conditions).
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
    }),

  reset: () =>
    set({
      flowchart: createDefaultFlowchart(),
      formName: 'Untitled Form',
      formDescription: '',
      selectedNodeId: null,
      pendingEdge: null,
    }),

  getSchema: () => {
    const { flowchart, formName } = get();
    return generateSchema(flowchart, formName);
  },

  getErrors: () => {
    const { flowchart } = get();
    return validateFlowchart(flowchart);
  },
}));
