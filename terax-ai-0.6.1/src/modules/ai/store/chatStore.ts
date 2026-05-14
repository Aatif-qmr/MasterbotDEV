import { create } from "zustand";
import {
  DEFAULT_MODEL_ID,
  getModel,
  providerNeedsKey,
  type ModelId,
  type ProviderId,
} from "../config";
import { EMPTY_PROVIDER_KEYS, type ProviderKeys } from "../engine/keyring";
import {
  deriveTitle,
  loadAll,
  newSessionId,
  saveActiveId,
  saveSessionsList,
  loadLegacyMessages,
  deleteLegacyMessages,
  type SessionMeta,
} from "../engine/sessions";
import { chatRepository } from "../storage/repository";
import { runStorageMigration } from "../storage/migrator";
import { GeminiSession, createTeraxGeminiAgent } from "../engine/session";
import { GeminiEventType } from "../engine/gemini_types";
import type { UIMessage, UIMessagePart, ChatStatus, TeraxToolCall } from "../engine/types";

export type { UIMessage, UIMessagePart, ChatStatus, TeraxToolCall };

/**
 * Local Chat class replacement for Vercel AI SDK's Chat
 */
export class Chat {
  public messages: UIMessage[] = [];
  public status: ChatStatus = "idle";
  public error: Error | undefined;
  public id: string;
  
  private onStep?: (step: string | null) => void;
  private onError?: (error: Error) => void;
  private session: GeminiSession | null = null;
  private agent = createTeraxGeminiAgent();

  constructor(options: {
    id: string;
    messages?: UIMessage[];
    onStep?: (step: string | null) => void;
    onError?: (error: Error) => void;
  }) {
    this.id = options.id;
    this.messages = options.messages || [];
    this.onStep = options.onStep;
    this.onError = options.onError;
  }

  async initialize() {
    if (!this.session) {
      this.session = await this.agent.session(this.id);
      await this.session.initialize();
    }
  }

  async sendMessage(input: { text?: string; parts?: UIMessagePart[] }) {
    await this.initialize();
    
    let content = input.text || "";
    if (!content && input.parts) {
      for (const p of input.parts) {
        if (p.type === 'text') {
          content = p.text;
          break;
        }
      }
    }

    const userMsg: UIMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      parts: input.parts || [{ type: "text", text: content }],
    };
    
    this.messages = [...this.messages, userMsg];
    this.status = "submitted";
    this.notify();

    const assistantMsg: UIMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      parts: [],
    };
    
    this.messages = [...this.messages, assistantMsg];
    
    try {
      this.status = "streaming";
      for await (const event of this.session!.sendStream(content)) {
        if (event.type === GeminiEventType.Content) {
          assistantMsg.content += String(event.value);
          assistantMsg.parts.push({ type: "text", text: String(event.value) });
          this.messages = [...this.messages];
          this.notify();
        } else if (event.type === GeminiEventType.ToolCallRequest) {
          const toolCall = event.value as TeraxToolCall;
          assistantMsg.parts.push({
            type: "tool-invocation",
            toolCallId: toolCall.callId,
            toolName: toolCall.name,
            args: toolCall.args,
            state: "call",
          });
          this.messages = [...this.messages];
          this.notify();
          if (this.onStep) this.onStep(`Calling ${toolCall.name}`);
        } else if (event.type === GeminiEventType.Finish) {
          this.status = "idle";
          this.notify();
        } else if (event.type === GeminiEventType.Error) {
          throw new Error(String(event.value));
        }
      }
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.status = "error";
      if (this.onError) this.onError(this.error);
      this.notify();
    }
  }

  clearError() {
    this.error = undefined;
    this.notify();
  }

  stop() {
    // Implement stop logic if possible with Native SDK abort signals
  }

  private listeners = new Set<() => void>();
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify() {
    this.listeners.forEach(fn => fn());
    
    // Auto-persist on change if project path is available
    const projectPath = useChatStore.getState().live.getWorkspaceRoot();
    if (projectPath) {
       useChatStore.getState().persistMessages(this.id, this.messages);
    }
  }
}

type Live = {
  getCwd: () => string | null;
  getTerminalContext: () => string | null;
  injectIntoActivePty: (text: string) => boolean;
  getWorkspaceRoot: () => string | null;
  getActiveFile: () => string | null;
  openPreview: (url: string) => boolean;
};

export type AgentRunStatus =
  | "idle"
  | "thinking"
  | "streaming"
  | "awaiting-approval"
  | "error";

export type AgentMeta = {
  status: AgentRunStatus;
  step: string | null;
  approvalsPending: number;
  error: string | null;
};

const IDLE_META: AgentMeta = {
  status: "idle",
  step: null,
  approvalsPending: 0,
  error: null,
};

export type MiniState = {
  open: boolean;
};

export type PendingSelection = {
  id: string;
  text: string;
  source: "terminal" | "editor";
};

export type ApprovalResponder = (
  approvalId: string,
  approved: boolean,
) => void;

type StoreState = {
  live: Live;
  setLive: (live: Live) => void;

  approvalResponder: ApprovalResponder | null;
  setApprovalResponder: (fn: ApprovalResponder | null) => void;
  respondToApproval: (approvalId: string, approved: boolean) => void;

  apiKeys: ProviderKeys;
  setApiKeys: (keys: ProviderKeys) => void;
  setApiKey: (provider: ProviderId, key: string | null) => void;

  selectedModelId: ModelId;
  setSelectedModelId: (id: ModelId) => void;

  mini: MiniState;
  openMini: () => void;
  closeMini: () => void;
  toggleMini: () => void;

  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  focusSignal: number;
  pendingPrefill: string | null;
  focusInput: (prefill?: string | null) => void;
  consumePrefill: () => string | null;

  pendingSelections: PendingSelection[];
  attachSelection: (text: string, source: "terminal" | "editor") => void;
  consumeSelections: () => PendingSelection[];

  agentMeta: AgentMeta;
  patchAgentMeta: (patch: Partial<AgentMeta>) => void;
  resetAgentMeta: () => void;

  // Sessions
  sessionsHydrated: boolean;
  sessions: SessionMeta[];
  activeSessionId: string | null;
  hydrateSessions: () => Promise<void>;
  newSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  persistMessages: (id: string, messages: UIMessage[]) => void;
};

const NOOP_LIVE: Live = {
  getCwd: () => null,
  getTerminalContext: () => null,
  injectIntoActivePty: () => false,
  getWorkspaceRoot: () => null,
  getActiveFile: () => null,
  openPreview: () => false,
};

const chats = new Map<string, Chat>();
const seedMessages = new Map<string, UIMessage[]>();

const PERSIST_DEBOUNCE_MS = 300;
const pendingPersist = new Map<
  string,
  { latest: UIMessage[]; timer: ReturnType<typeof setTimeout> }
>();

function flushPersistEntry(id: string) {
  const entry = pendingPersist.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  pendingPersist.delete(id);
  
  const projectPath = useChatStore.getState().live.getWorkspaceRoot();
  if (projectPath) {
    // Save each message individually to SQLite for better tracking
    for (const msg of entry.latest) {
      void chatRepository.saveMessage(projectPath, msg);
    }
  }
}

export function flushPersist(id?: string): void {
  if (id) {
    flushPersistEntry(id);
    return;
  }
  for (const key of Array.from(pendingPersist.keys())) flushPersistEntry(key);
}

function makeChat(sessionId: string): Chat {
  const initialMessages = seedMessages.get(sessionId);
  seedMessages.delete(sessionId);

  return new Chat({
    id: sessionId,
    messages: initialMessages,
    onStep: (step) => {
      useChatStore.getState().patchAgentMeta({ step });
    },
    onError: (e) => {
      useChatStore.getState().patchAgentMeta({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    },
  });
}

export const useChatStore = create<StoreState>((set, get) => ({
  live: NOOP_LIVE,
  setLive: (live) => {
    const oldRoot = get().live.getWorkspaceRoot();
    const newRoot = live.getWorkspaceRoot();
    set({ live });
    
    // If project root changed, we might want to reload the current session's history from the new project DB
    if (oldRoot !== newRoot && newRoot && get().activeSessionId) {
       // Optional: logic to handle project-scoped session switching
    }
  },

  approvalResponder: null,
  setApprovalResponder: (fn) => set({ approvalResponder: fn }),
  respondToApproval: (approvalId, approved) => {
    const fn = get().approvalResponder;
    if (fn) fn(approvalId, approved);
  },

  apiKeys: { ...EMPTY_PROVIDER_KEYS },
  setApiKeys: (keys) => set({ apiKeys: keys }),
  setApiKey: (provider, key) => {
    set({ apiKeys: { ...get().apiKeys, [provider]: key } });
  },

  selectedModelId: DEFAULT_MODEL_ID,
  setSelectedModelId: (id) => set({ selectedModelId: id }),

  mini: { open: false },
  openMini: () => set({ mini: { open: true } }),
  closeMini: () => set({ mini: { open: false } }),
  toggleMini: () => set((s) => ({ mini: { open: !s.mini.open } })),

  panelOpen: false,
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  focusSignal: 0,
  pendingPrefill: null,
  focusInput: (prefill = null) =>
    set((s) => ({
      panelOpen: true,
      focusSignal: s.focusSignal + 1,
      pendingPrefill: prefill ?? null,
    })),
  consumePrefill: () => {
    const v = get().pendingPrefill;
    if (v != null) set({ pendingPrefill: null });
    return v;
  },

  pendingSelections: [],
  attachSelection: (text, source) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = `sel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({
      panelOpen: true,
      focusSignal: s.focusSignal + 1,
      pendingSelections: [...s.pendingSelections, { id, text: trimmed, source }],
    }));
  },
  consumeSelections: () => {
    const v = get().pendingSelections;
    if (v.length > 0) set({ pendingSelections: [] });
    return v;
  },

  agentMeta: IDLE_META,
  patchAgentMeta: (patch) =>
    set((s) => ({ agentMeta: { ...s.agentMeta, ...patch } })),
  resetAgentMeta: () => set({ agentMeta: IDLE_META }),

  // Sessions
  sessionsHydrated: false,
  sessions: [],
  activeSessionId: null,

  hydrateSessions: async () => {
    if (get().sessionsHydrated) return;
    
    // Run migration from localStorage to SQLite
    await runStorageMigration();

    const { sessions } = await loadAll();
    const reusable = sessions[0]?.title === "New chat" ? sessions[0] : null;
    let nextSessions: SessionMeta[];
    let freshId: string;
    
    if (reusable) {
      nextSessions = sessions;
      freshId = reusable.id;
    } else {
      freshId = newSessionId();
      const fresh: SessionMeta = {
        id: freshId,
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      nextSessions = [fresh, ...sessions];
      void saveSessionsList(nextSessions);
    }
    
    void saveActiveId(freshId);
    
    // Load history for active session if project root is known
    const projectPath = get().live.getWorkspaceRoot();
    if (projectPath) {
      const history = await chatRepository.getHistory(projectPath);
      if (history.length > 0) {
        seedMessages.set(freshId, history);
      }
    }

    set({
      sessions: nextSessions,
      activeSessionId: freshId,
      sessionsHydrated: true,
    });
  },

  newSession: () => {
    const id = newSessionId();
    const meta: SessionMeta = {
      id,
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [meta, ...get().sessions];
    set({ sessions: next, activeSessionId: id, agentMeta: IDLE_META });
    void saveSessionsList(next);
    void saveActiveId(id);
    return id;
  },

  switchSession: (id) => {
    if (get().activeSessionId === id) return;
    if (!get().sessions.some((s) => s.id === id)) return;
    const flip = () => {
      set({ activeSessionId: id, agentMeta: IDLE_META });
      void saveActiveId(id);
    };
    
    if (chats.has(id) || seedMessages.has(id)) {
      flip();
      return;
    }

    const projectPath = get().live.getWorkspaceRoot();
    if (projectPath) {
      void chatRepository.getHistory(projectPath).then((m) => {
        if (m && m.length > 0 && !chats.has(id)) seedMessages.set(id, m);
        flip();
      });
    } else {
      void loadLegacyMessages(id).then((m) => {
        if (m && m.length > 0 && !chats.has(id)) seedMessages.set(id, m);
        flip();
      });
    }
  },

  deleteSession: (id) => {
    const remaining = get().sessions.filter((s) => s.id !== id);
    chats.get(id)?.stop();
    chats.delete(id);
    seedMessages.delete(id);
    const pend = pendingPersist.get(id);
    if (pend) {
      clearTimeout(pend.timer);
      pendingPersist.delete(id);
    }
    
    // We don't delete from SQLite here because it's project-scoped and might contain multiple sessions' worth of history
    // But we clear legacy data
    void deleteLegacyMessages(id);
    
    if (remaining.length === 0) {
      const fresh: SessionMeta = {
        id: newSessionId(),
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({ sessions: [fresh], activeSessionId: fresh.id });
      void saveSessionsList([fresh]);
      void saveActiveId(fresh.id);
      return;
    }
    const wasActive = get().activeSessionId === id;
    const nextActive = wasActive ? remaining[0].id : get().activeSessionId;
    set({ sessions: remaining, activeSessionId: nextActive });
    void saveSessionsList(remaining);
    if (wasActive) void saveActiveId(nextActive);
  },

  renameSession: (id, title) => {
    const next = get().sessions.map((s) =>
      s.id === id ? { ...s, title, updatedAt: Date.now() } : s,
    );
    set({ sessions: next });
    void saveSessionsList(next);
  },

  persistMessages: (id, messages) => {
    const existing = pendingPersist.get(id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => flushPersistEntry(id), PERSIST_DEBOUNCE_MS);
    pendingPersist.set(id, { latest: messages, timer });
    
    const sessions = get().sessions;
    const meta = sessions.find((s) => s.id === id);
    if (!meta) return;
    const isUntitled = !meta.title || meta.title === "New chat";
    if (!isUntitled) return;
    const nextTitle = deriveTitle(messages);
    if (nextTitle === meta.title) return;
    const next = sessions.map((s) =>
      s.id === id ? { ...s, title: nextTitle, updatedAt: Date.now() } : s,
    );
    set({ sessions: next });
    void saveSessionsList(next);
  },
}));

export function getAgentMeta(): AgentMeta {
  return useChatStore.getState().agentMeta;
}

export function getActiveProviderKey(): string | null {
  const { selectedModelId, apiKeys } = useChatStore.getState();
  return apiKeys[getModel(selectedModelId).provider] ?? null;
}

export function hasKeyForModel(modelId: ModelId): boolean {
  const { apiKeys } = useChatStore.getState();
  const provider = getModel(modelId).provider;
  return providerNeedsKey(provider) ? !!apiKeys[provider] : true;
}

export function getOrCreateChat(sessionId: string): Chat {
  const existing = chats.get(sessionId);
  if (existing) return existing;
  const c = makeChat(sessionId);
  chats.set(sessionId, c);
  return c;
}

export function getChat(sessionId?: string): Chat | undefined {
  if (sessionId) return chats.get(sessionId);
  const id = useChatStore.getState().activeSessionId;
  return id ? chats.get(id) : undefined;
}

export async function sendMessage(text: string): Promise<boolean> {
  const state = useChatStore.getState();
  const sessionId = state.activeSessionId;
  if (!sessionId) return false;
  const c = getOrCreateChat(sessionId);
  await c.sendMessage({ text });
  return true;
}

export function stop(): void {
  const id = useChatStore.getState().activeSessionId;
  if (!id) return;
  void chats.get(id)?.stop();
}
