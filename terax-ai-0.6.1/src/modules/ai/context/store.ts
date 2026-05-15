import { create } from 'zustand';
import type { ContextState, ProjectStats } from './types';

interface ContextStore extends ContextState {
  stats: ProjectStats | null;
  startIndexing: () => void;
  finishIndexing: (count: number) => void;
  setStats: (stats: ProjectStats) => void;
  setLastSync: (lastSync: number) => void;
}

export const useContextStore = create<ContextStore>((set) => ({
  isIndexing: false,
  indexedFileCount: 0,
  lastSync: null,
  stats: null,

  startIndexing: () => set({ isIndexing: true }),
  finishIndexing: (count) => set({ isIndexing: false, indexedFileCount: count, lastSync: Date.now() }),
  setStats: (stats) => set({ stats }),
  setLastSync: (lastSync) => set({ lastSync }),
}));
