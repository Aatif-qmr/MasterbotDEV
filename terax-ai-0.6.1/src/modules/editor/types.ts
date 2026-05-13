export type Orientation = 'horizontal' | 'vertical';

export interface EditorPaneState {
  id: string;
  filePath: string | null;
  cursor?: { line: number; ch: number };
  scroll?: { top: number; left: number };
}

export interface WorkspaceLayout {
  orientation: Orientation;
  panes: EditorPaneState[];
  activePaneId: string;
  sizes: number[];
}

export interface InlineEdit {
  id: string;
  filePath: string;
  range: { from: number; to: number };
  originalText: string;
  suggestedText: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}
