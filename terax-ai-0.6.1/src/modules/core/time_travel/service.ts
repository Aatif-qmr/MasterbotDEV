import { invoke } from '@tauri-apps/api/core';
import { useChatStore, getFullChatState } from '@/modules/ai/store/chatStore';
import { useEditorStore } from '@/modules/editor/store/editorStore';
import { useTimeTravelStore } from './store';
import type { StateSnapshot } from './types';

export class TimeTravelService {
  async createSnapshot(label?: string): Promise<string | null> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return null;

    const chatState = JSON.stringify(getFullChatState());
    
    const editorState = JSON.stringify({
      layout: useEditorStore.getState().layout,
      activeEdits: useEditorStore.getState().activeEdits
    });

    try {
      const id = await invoke<string>('tt_create_snapshot', {
        projectPath,
        chatState,
        editorState,
        label
      });
      
      await this.refreshTimeline();
      return id;
    } catch (err) {
      console.error('Failed to create snapshot:', err);
      return null;
    }
  }

  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return false;

    try {
      const [chatStateJson, editorStateJson] = await invoke<[string, string]>('tt_restore_snapshot', {
        projectPath,
        snapshotId
      });

      const chatState = JSON.parse(chatStateJson);
      const editorState = JSON.parse(editorStateJson);

      // Atomically load states
      useChatStore.getState().loadState(chatState);
      useEditorStore.getState().loadState(editorState);

      useTimeTravelStore.getState().setCurrentSnapshotId(snapshotId);
      return true;
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      return false;
    }
  }

  async refreshTimeline(): Promise<void> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return;

    try {
      const timeline = await invoke<StateSnapshot[]>('tt_get_timeline', {
        projectPath,
        limit: 50
      });
      useTimeTravelStore.getState().setTimeline(timeline);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    }
  }
}

export const timeTravelService = new TimeTravelService();
