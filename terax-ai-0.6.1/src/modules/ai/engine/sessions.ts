import { LazyStore } from "@tauri-apps/plugin-store";
import type { UIMessage } from "../store/chatStore";

export type SessionMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  projectPath?: string; // Track which project this session belongs to
};

const STORE_PATH = "cipher-ai-sessions.json";
const KEY_SESSIONS = "sessions";
const KEY_ACTIVE = "activeId";

const store = new LazyStore(STORE_PATH, { defaults: {}, autoSave: 200 });

export type LoadedSessions = {
  sessions: SessionMeta[];
  activeId: string | null;
};

export async function loadAll(): Promise<LoadedSessions> {
  const entries = await store.entries();
  let sessions: SessionMeta[] | undefined;
  let activeId: string | null | undefined;
  for (const [k, v] of entries) {
    if (k === KEY_SESSIONS) sessions = v as SessionMeta[];
    else if (k === KEY_ACTIVE) activeId = v as string | null;
  }
  return { sessions: sessions ?? [], activeId: activeId ?? null };
}

export async function saveSessionsList(sessions: SessionMeta[]): Promise<void> {
  await store.set(KEY_SESSIONS, sessions);
}

export async function saveActiveId(id: string | null): Promise<void> {
  await store.set(KEY_ACTIVE, id);
}

// Global messages storage is deprecated in favor of project-scoped SQLite
// These are kept for backward compatibility during migration
export async function loadLegacyMessages(id: string): Promise<UIMessage[] | null> {
  return (await store.get<UIMessage[]>(`messages:${id}`)) ?? null;
}

export async function deleteLegacyMessages(id: string): Promise<void> {
  await store.delete(`messages:${id}`);
}

export function newSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function deriveTitle(messages: UIMessage[]): string {
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const p of (m.parts || [])) {
      if (p.type !== "text") continue;
      const text = (p as { text: string }).text
        .replace(/<terminal-context[\s\S]*?<\/terminal-context>\s*/g, "")
        .replace(/<selection[\s\S]*?<\/selection>\s*/g, "")
        .replace(/<file[\s\S]*?<\/file>\s*/g, "")
        .trim();
      if (!text) continue;
      const first = text.split("\n")[0].trim();
      return first.length > 40 ? `${first.slice(0, 40)}…` : first;
    }
  }
  return "New chat";
}
