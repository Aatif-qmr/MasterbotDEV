/**
 * Gemini CLI Agent and Session implementation for Terax AI
 * 
 * This module provides a complete re-implementation of the Gemini CLI SDK
 * functionality, optimized for Terax AI's architecture.
 */

import type {
  GeminiAgentOptions,
  SystemInstructions,
  SessionContext,
  Tool,
  SkillReference,
  Content,
  TypedGeminiStreamEvent,
} from './types';
import { GeminiEventType } from './types';
import { GEMINI_SYSTEM_PROMPT } from './native';
import { useChatStore } from '../../store/chatStore';
import { native } from '../native';
import { streamText, tool, type LanguageModel } from 'ai';
import { buildLanguageModel } from '../agent';
import { buildTools } from '../../tools/tools';

interface Skill {
  name: string;
  description: string;
  instructions: string;
}

/**
 * Generate a unique session ID
 */
export function createSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Gemini Agent class - the main entry point for creating sessions
 */
export class GeminiAgent {
  private options: GeminiAgentOptions;

  constructor(options: GeminiAgentOptions) {
    this.options = options;
  }

  /**
   * Create a new session
   */
  session(sessionId?: string): GeminiSession {
    const id = sessionId ?? createSessionId();
    return new GeminiSession(this.options, id, this);
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<GeminiSession> {
    // For now, create a new session with the given ID
    // In the future, this should load history from a persistent store
    return new GeminiSession(this.options, sessionId, this);
  }
}

/**
 * Gemini Session class - handles conversation and tool execution
 */
export class GeminiSession {
  private options: GeminiAgentOptions;
  private initialized = false;
  private history: Content[] = [];
  private model: LanguageModel | null = null;
  private loadedSkills: Skill[] = [];

  constructor(
    options: GeminiAgentOptions,
    public readonly id: string,
    private agent: GeminiAgent,
  ) {
    this.options = options;
  }

  /**
   * Initialize the session
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Resolve model
    const state = useChatStore.getState();
    const modelId = this.options.model ?? state.selectedModelId;
    
    try {
      this.model = await buildLanguageModel(
        'google', // Default to google for Gemini integration
        state.apiKeys,
        modelId
      );
    } catch (error) {
      console.error('[GeminiSession] Failed to build language model:', error);
      throw error;
    }

    // Load skills if enabled
    if (this.options.skillsEnabled) {
      await this.loadWorkspaceSkills();
    }

    console.log(`[GeminiSession] Initialized session ${this.id}`);
    this.initialized = true;
  }

  /**
   * Load skills from the workspace .gemini/skills directory
   */
  private async loadWorkspaceSkills(): Promise<void> {
    const state = useChatStore.getState();
    const workspaceRoot = state.live.getWorkspaceRoot();
    if (!workspaceRoot) return;

    try {
      const skillsDir = `${workspaceRoot.replace(/\/$/, "")}/.gemini/skills`;
      const entries = await native.readDir(skillsDir);

      for (const entry of entries) {
        if (entry.kind === "dir") {
          const skillPath = `${skillsDir}/${entry.name}/SKILL.md`;
          const content = await native.readFile(skillPath);
          if (content.kind === "text") {
            const skill = this.parseSkillMarkdown(content.content);
            if (skill) {
              this.loadedSkills.push(skill);
              console.log(`[GeminiSession] Loaded skill: ${skill.name}`);
            }
          }
        }
      }
    } catch (error) {
      // Skills dir might not exist, ignore
    }
  }

  /**
   * Simple parser for SKILL.md files
   */
  private parseSkillMarkdown(content: string): Skill | null {
    const nameMatch = content.match(/^# (.*)/);
    const descriptionMatch = content.match(/description: >\s*([\s\S]*?)\n---/);

    if (!nameMatch) return null;

    return {
      name: nameMatch[1].trim(),
      description: descriptionMatch ? descriptionMatch[1].trim() : "",
      instructions: content, // Use full content as instructions for now
    };
  }

  /**
   * Resolve system instructions (static or dynamic)
   */
  private async resolveInstructions(): Promise<string> {
    const { instructions } = this.options;

    let baseInstructions = "";
    if (typeof instructions === "string") {
      baseInstructions = instructions;
    } else if (typeof instructions === "function") {
      const context = this.createContext();
      baseInstructions = await instructions(context);
    } else {
      baseInstructions = GEMINI_SYSTEM_PROMPT;
    }

    // Append skill instructions
    if (this.loadedSkills.length > 0) {
      const skillsBlock = this.loadedSkills
        .map(
          (s) => `### SKILL: ${s.name}\n${s.description}\n\n${s.instructions}`,
        )
        .join("\n\n");

      baseInstructions += `\n\n## LOADED SKILLS\nYou have the following specialized skills available. Follow their specific instructions when applicable:\n\n${skillsBlock}`;
    }

    return baseInstructions;
  }

  /**
   * Create a session context for dynamic instructions and tools
   */
  private createContext(): SessionContext {
    const state = useChatStore.getState();
    
    return {
      sessionId: this.id,
      transcript: [...this.history],
      cwd: state.live.getCwd() ?? '/',
      timestamp: new Date().toISOString(),
      fs: {
        readFile: async (path: string) => {
          try {
            const result = await native.readFile(path);
            return result.kind === 'text' ? result.content : null;
          } catch {
            return null;
          }
        },
        writeFile: async (path: string, content: string) => {
          await native.writeFile(path, content);
        },
      },
      shell: {
        exec: async (cmd: string, options?: { cwd?: string; timeoutSeconds?: number }) => {
          try {
            const result = await native.runCommand(
              cmd,
              options?.cwd ?? null,
              options?.timeoutSeconds ?? 60,
            );
            return {
              exitCode: result.exit_code,
              output: result.stdout || result.stderr,
              stdout: result.stdout,
              stderr: result.stderr,
            };
          } catch (error) {
            return {
              exitCode: 1,
              output: '',
              stdout: '',
              stderr: error instanceof Error ? error.message : String(error),
              error: error instanceof Error ? error : new Error(String(error)),
            };
          }
        },
      },
      agent: this.agent as any,
      session: this,
    };
  }

  /**
   * Send a message and stream the response
   */
  async *sendStream(
    prompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<TypedGeminiStreamEvent> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.model) {
      throw new Error("Session not properly initialized: model is missing");
    }

    // Add user message to history
    this.history.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const systemInstructions = await this.resolveInstructions();
    const context = this.createContext();

    // Map tools to Vercel AI SDK format
    const sdkTools: Record<string, any> = {
      ...(this.options.tools
        ? Object.fromEntries(
            this.options.tools.map((t) => [
              t.name,
              tool({
                description: t.description,
                parameters: t.inputSchema as any,
                execute: (async (args: any) => {
                  return await t.action(args, context);
                }) as any,
              } as any),
            ]),
          )
        : {}),
    };

    // Auto-load built-in Terax tools
    const toolContext = {
      getCwd: () => context.cwd,
      getWorkspaceRoot: () => useChatStore.getState().live.getWorkspaceRoot(),
      getTerminalContext: () =>
        useChatStore.getState().live.getTerminalContext(),
      injectIntoActivePty: (text: string) =>
        useChatStore.getState().live.injectIntoActivePty(text),
      openPreview: (url: string) =>
        useChatStore.getState().live.openPreview(url),
      readCache: new Set<string>(),
      getSessionId: () => this.id,
    };
    const builtInTools = buildTools(toolContext);
    Object.assign(sdkTools, builtInTools);

    try {
      const streamOptions: any = {
        model: this.model,
        system: systemInstructions,
        messages: this.history.map((m) => ({
          role: m.role === "model" ? "assistant" : "user",
          content: m.parts.map((p) => (p as any).text ?? "").join(" "),
        })),
        tools: sdkTools,
        maxSteps: 10,
        abortSignal: signal,
      };

      const result = await streamText(streamOptions);

      let fullResponseText = "";

      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          fullResponseText += part.text;
          yield {
            type: GeminiEventType.Content,
            value: part.text,
          };
        } else if (part.type === "tool-call") {
          yield {
            type: GeminiEventType.ToolCallRequest,
            value: {
              callId: part.toolCallId,
              name: part.toolName,
              args: part.input as any,
            },
          };
        } else if (part.type === "tool-result") {
          yield {
            type: GeminiEventType.ToolCallResponse,
            value: part.output,
          };
        }
      }

      // Update history with complete model response
      if (fullResponseText) {
        this.history.push({
          role: 'model',
          parts: [{ text: fullResponseText }],
        });
      }

      yield {
        type: GeminiEventType.Finish,
        value: null,
      };

    } catch (error) {
      console.error('[GeminiSession] Stream error:', error);
      yield {
        type: GeminiEventType.Error,
        value: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): readonly Content[] {
    return [...this.history];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
  }
}

/**
 * Helper to create a tool definition
 */
export function defineTool<T extends Record<string, unknown>>(
  name: string,
  description: string,
  schema: T,
  action: (params: T, context?: SessionContext) => Promise<unknown>,
): Tool {
  return {
    name,
    description,
    inputSchema: schema as any,
    action,
  };
}

/**
 * Helper to reference a skill directory
 */
export function skillDir(path: string): SkillReference {
  return { type: 'dir', path };
}

/**
 * Default system instructions for Terax AI powered by Gemini
 */
export function createTeraxInstructions(customInstructions?: string): SystemInstructions {
  return (context) => {
    return `${GEMINI_SYSTEM_PROMPT}${
      customInstructions ? `\n\n## CUSTOM INSTRUCTIONS\n${customInstructions}` : ''
    }\n\n## CONTEXT\n- Session ID: ${context.sessionId}\n- CWD: ${context.cwd}`;
  };
}

/**
 * Create a pre-configured Gemini agent for Terax AI
 */
export function createTeraxGeminiAgent(options?: Partial<GeminiAgentOptions>): GeminiAgent {
  const instructions = createTeraxInstructions(options?.instructions as string);
  
  return new GeminiAgent({
    instructions,
    model: options?.model ?? 'gemini-2.0-flash-exp', // Fast default
    cwd: process.cwd(),
    debug: false,
    skillsEnabled: true,
    ...options,
  });
}
