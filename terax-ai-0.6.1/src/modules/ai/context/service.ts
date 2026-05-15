import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '@/modules/ai/store/chatStore';
import { useContextStore } from './store';
import type { ContextDocument, ProjectStats } from './types';

export class ContextService {
  async indexProject(): Promise<number> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return 0;

    useContextStore.getState().startIndexing();
    try {
      const count = await invoke<number>('ctx_index_project', { projectPath });
      useContextStore.getState().finishIndexing(count);
      await this.refreshStats();
      return count;
    } catch (err) {
      console.error('Failed to index project:', err);
      useContextStore.getState().finishIndexing(0);
      return 0;
    }
  }

  async refreshStats(): Promise<void> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return;

    try {
      const stats = await invoke<ProjectStats>('ctx_get_project_summary', { projectPath });
      useContextStore.getState().setStats(stats);
    } catch (err) {
      console.error('Failed to get project stats:', err);
    }
  }

  async searchContext(query: string, limit: number = 5): Promise<ContextDocument[]> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return [];

    try {
      return await invoke<ContextDocument[]>('ctx_search', { projectPath, query, limit });
    } catch (err) {
      console.error('Failed to search context:', err);
      return [];
    }
  }

  async getFileContent(filePath: string): Promise<string | null> {
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (!projectPath) return null;

    try {
      return await invoke<string>('ctx_get_file_context', { projectPath, filePath });
    } catch (err) {
      console.error('Failed to get file content:', err);
      return null;
    }
  }

  async buildContextBlock(query: string): Promise<string> {
    const docs = await this.searchContext(query);
    if (docs.length === 0) return "";

    let block = "\n\n## PROJECT CONTEXT\n";
    block += "The following files from the project are relevant to the current request:\n\n";

    for (const doc of docs) {
      const content = await this.getFileContent(doc.file_path);
      if (content) {
        block += `### File: ${doc.file_path}\n`;
        block += "```" + (doc.language || "") + "\n";
        block += content;
        block += "\n```\n\n";
      }
    }

    return block;
  }
}

export const contextService = new ContextService();
