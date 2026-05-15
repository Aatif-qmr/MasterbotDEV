import { create } from 'zustand';
import { type WorkspaceLayout, type EditorPaneState, type InlineEdit } from '../types';

interface EditorState {
  layout: WorkspaceLayout;
  activeEdits: Record<string, InlineEdit[]>;
  addPane: (direction: 'horizontal' | 'vertical') => void;
  closePane: (paneId: string) => void;
  setActivePane: (paneId: string) => void;
  updatePaneFile: (paneId: string, filePath: string) => void;
  setSizes: (sizes: number[]) => void;
  proposeEdit: (filePath: string, range: { from: number; to: number }, suggestion: string, originalText: string) => string;
  applyEdit: (filePath: string, editId: string, accept: boolean) => void;
  clearEdits: (filePath: string) => void;
  loadState: (state: any) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  layout: {
    orientation: 'horizontal',
    panes: [{ id: 'pane-1', filePath: null }],
    activePaneId: 'pane-1',
    sizes: [100],
  },
  activeEdits: {},
  
  addPane: (direction) => set((state) => {
    const newId = `pane-${Date.now()}`;
    const newPane: EditorPaneState = { id: newId, filePath: null };
    const newPanes = [...state.layout.panes, newPane];
    const newSizes = new Array(newPanes.length).fill(100 / newPanes.length);
    
    return {
      layout: {
        ...state.layout,
        orientation: direction,
        panes: newPanes,
        activePaneId: newId,
        sizes: newSizes,
      }
    };
  }),
  
  closePane: (paneId) => set((state) => {
    if (state.layout.panes.length <= 1) return state;
    
    const newPanes = state.layout.panes.filter(p => p.id !== paneId);
    const newSizes = new Array(newPanes.length).fill(100 / newPanes.length);
    const activePaneId = state.layout.activePaneId === paneId ? newPanes[0].id : state.layout.activePaneId;
    
    return {
      layout: {
        ...state.layout,
        panes: newPanes,
        activePaneId,
        sizes: newSizes,
      }
    };
  }),
  
  setActivePane: (paneId) => set((state) => ({
    layout: { ...state.layout, activePaneId: paneId }
  })),
  
  updatePaneFile: (paneId, filePath) => set((state) => ({
    layout: {
      ...state.layout,
      panes: state.layout.panes.map(p => p.id === paneId ? { ...p, filePath } : p)
    }
  })),
  
  setSizes: (sizes) => set((state) => ({
    layout: { ...state.layout, sizes }
  })),

  proposeEdit: (filePath, range, suggestion, originalText) => {
    const editId = `edit-${Date.now()}`;
    const newEdit: InlineEdit = {
      id: editId,
      filePath,
      range,
      originalText,
      suggestedText: suggestion,
      status: 'pending',
      createdAt: Date.now(),
    };
    set((state) => ({
      activeEdits: {
        ...state.activeEdits,
        [filePath]: [...(state.activeEdits[filePath] || []), newEdit]
      }
    }));
    return editId;
  },

  applyEdit: (filePath, editId, accept) => set((state) => ({
    activeEdits: {
      ...state.activeEdits,
      [filePath]: (state.activeEdits[filePath] || []).map(e => e.id === editId ? { ...e, status: accept ? 'accepted' : 'rejected' } : e)
    }
  })),

  clearEdits: (filePath) => set((state) => {
    const newEdits = { ...state.activeEdits };
    delete newEdits[filePath];
    return { activeEdits: newEdits };
  }),

  loadState: (state) => set({
    layout: state.layout,
    activeEdits: state.activeEdits
  })
}));
