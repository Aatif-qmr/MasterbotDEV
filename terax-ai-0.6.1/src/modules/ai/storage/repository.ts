import { invoke } from '@tauri-apps/api/core';
import type { UIMessage } from '../engine/types';
import { z } from 'zod';

export interface DbMessage {
  id: string;
  role: string;
  content: string; // JSON string of UIMessagePart[]
  tool_calls: string | null; // JSON string of ToolCall[]
  timestamp: number;
}

const messageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  tool_calls: z.string().nullable(),
  timestamp: z.number(),
});

const historySchema = z.array(messageSchema);

export interface ChatRepository {
  saveMessage(projectPath: string, message: UIMessage): Promise<void>;
  getHistory(projectPath: string): Promise<UIMessage[]>;
  clearProject(projectPath: string): Promise<void>;
  migrateFromLocalStorage(projectPath: string, legacyData: UIMessage[]): Promise<void>;
}

export class NativeChatRepository implements ChatRepository {
  async saveMessage(projectPath: string, message: UIMessage): Promise<void> {
    const dbMsg: DbMessage = {
      id: message.id,
      role: message.role,
      content: JSON.stringify(message.parts || [{ type: 'text', text: message.content }]),
      tool_calls: message.parts 
        ? JSON.stringify(message.parts.filter(p => p.type === 'tool-invocation').map(p => ({
            callId: p.toolCallId,
            name: p.toolName,
            args: p.args,
            result: p.result
          })))
        : null,
      timestamp: Date.now(),
    };

    await invoke('storage_save_message', { projectPath, message: dbMsg });
  }

  async getHistory(projectPath: string): Promise<UIMessage[]> {
    try {
      // Ensure context is initialized
      await invoke('storage_get_context', { projectPath });
      
      const rawHistory = await invoke<unknown>('storage_get_history', { projectPath, limit: 100 });
      const validatedHistory = historySchema.parse(rawHistory);

      return validatedHistory.map(dbMsg => {
        const parts = JSON.parse(dbMsg.content);

        return {
          id: dbMsg.id,
          role: dbMsg.role as any,
          content: parts.find((p: any) => p.type === 'text')?.text || '',
          parts: parts,
        };
      });
    } catch (err) {
      console.error('Failed to get history from SQLite:', err);
      return [];
    }
  }

  async clearProject(projectPath: string): Promise<void> {
    await invoke('storage_clear_project', { projectPath });
  }

  async migrateFromLocalStorage(projectPath: string, legacyData: UIMessage[]): Promise<void> {
    const dbMessages: DbMessage[] = legacyData.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: JSON.stringify(msg.parts || [{ type: 'text', text: msg.content }]),
      tool_calls: null, // Legacy data might not have detailed tool calls in this format
      timestamp: Date.now(), // Rough approximation
    }));

    await invoke('storage_migrate_from_localstorage', { projectPath, legacyData: dbMessages });
  }
}

export const chatRepository = new NativeChatRepository();
