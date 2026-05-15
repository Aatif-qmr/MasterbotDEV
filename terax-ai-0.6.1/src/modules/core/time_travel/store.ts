import { create } from 'zustand';
import type { StateSnapshot, TimeTravelState } from './types';

interface TimeTravelStore extends TimeTravelState {
  setTimeline: (timeline: StateSnapshot[]) => void;
  setCurrentSnapshotId: (id: string | null) => void;
  setIsReplaying: (replaying: boolean) => void;
}

export const useTimeTravelStore = create<TimeTravelStore>((set) => ({
  timeline: [],
  currentSnapshotId: null,
  isReplaying: false,

  setTimeline: (timeline) => set({ timeline }),
  setCurrentSnapshotId: (currentSnapshotId) => set({ currentSnapshotId }),
  setIsReplaying: (isReplaying) => set({ isReplaying }),
}));
