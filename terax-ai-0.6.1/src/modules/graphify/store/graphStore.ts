import { create } from 'zustand';
import { type GraphData, type ViewportState, type InteractionState } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface GraphStore {
  data: GraphData | null;
  viewport: ViewportState;
  interaction: InteractionState;
  loadGraph: (projectPath: string) => Promise<void>;
  setZoom: (zoom: number) => void;
  panBy: (dx: number, dy: number) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  data: null,
  viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  interaction: { selectedNodeId: null, hoveredNodeId: null },

  loadGraph: async (projectPath: string) => {
    try {
      const data = await invoke<GraphData>('generate_graph', { projectPath });
      set({ data });
    } catch (e) {
      console.error('Failed to load graph:', e);
    }
  },

  setZoom: (zoom) => set((s) => ({ viewport: { ...s.viewport, zoom } })),
  
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
}));
