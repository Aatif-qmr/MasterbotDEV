import type { UIMessage } from '../engine/types';

export interface ChatRepository {
  saveMessage(projectId: string, message: UIMessage): Promise<void>;
  getHistory(projectId: string): Promise<UIMessage[]>;
  clearProject(projectId: string): Promise<void>;
  deleteMessage(projectId: string, messageId: string): Promise<void>;
}

export class SQLiteChatRepository implements ChatRepository {
  async saveMessage(projectId: string, message: UIMessage): Promise<void> {
    // TODO: Implement actual SQLite insertion
    console.log(`Saving message to project ${projectId}:`, message);
    
    // Fallback to localStorage if SQLite not available
    const key = `chat_history_${projectId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(message);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  async getHistory(projectId: string): Promise<UIMessage[]> {
    // TODO: Implement actual SQLite query
    console.log(`Retrieving history for project ${projectId}`);
    
    // Fallback to localStorage
    const key = `chat_history_${projectId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  async clearProject(projectId: string): Promise<void> {
    // TODO: Implement actual SQLite deletion
    console.log(`Clearing project ${projectId}`);
    
    // Fallback to localStorage
    localStorage.removeItem(`chat_history_${projectId}`);
  }

  async deleteMessage(projectId: string, messageId: string): Promise<void> {
    // TODO: Implement actual SQLite deletion
    console.log(`Deleting message ${messageId} from project ${projectId}`);
    
    // Fallback to localStorage
    const key = `chat_history_${projectId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((msg: UIMessage) => msg.id !== messageId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }
}

export const chatRepository = new SQLiteChatRepository();