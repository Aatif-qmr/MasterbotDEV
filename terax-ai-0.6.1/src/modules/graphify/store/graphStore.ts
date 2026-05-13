import { create } from 'zustand';
import { type GraphData, type ViewportState, type InteractionState } from '../types';
import { generateGraph } from '../lib/api';

export type GraphMode = 'dependencies' | 'workflow';

interface GraphStore {
  data: GraphData | null;
  mode: GraphMode;
  viewport: ViewportState;
  interaction: InteractionState;
  isLoading: boolean;
  error: string | null;
  loadGraph: (projectRoot: string) => Promise<void>;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  setMode: (mode: GraphMode) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  data: null,
  mode: 'dependencies',
  viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  interaction: { selectedNodeId: null, hoveredNodeId: null },
  isLoading: false,
  error: null,

  loadGraph: async (projectRoot: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await generateGraph(projectRoot);
      set({ data, isLoading: false });
    } catch (e) {
      console.error('Failed to load graph:', e);
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
    }
  },

  setZoom: (zoom) => set((s) => ({ viewport: { ...s.viewport, zoom } })),
  
  setPan: (x, y) => set((s) => ({ viewport: { ...s.viewport, pan: { x, y } } })),

  panBy: (dx, dy) => set((s) => ({ 
    viewport: { 
      ...s.viewport, 
      pan: { x: s.viewport.pan.x + dx, y: s.viewport.pan.y + dy } 
    } 
  })),

  selectNode: (nodeId) => set((s) => ({ 
    interaction: { ...s.interaction, selectedNodeId: nodeId } 
  })),

  hoverNode: (nodeId) => set((s) => ({ 
    interaction: { ...s.interaction, hoveredNodeId: nodeId } 
  })),

  setMode: (mode) => set({ mode }),
}));
