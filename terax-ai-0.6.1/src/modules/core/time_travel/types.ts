export interface StateSnapshot {
  id: string;
  projectPath: string;
  timestamp: number;
  label?: string;
}

export interface TimeTravelState {
  timeline: StateSnapshot[];
  currentSnapshotId: string | null;
  isReplaying: boolean;
}

export interface SnapshotData {
  chat_state: string; // JSON
  editor_state: string; // JSON
}
