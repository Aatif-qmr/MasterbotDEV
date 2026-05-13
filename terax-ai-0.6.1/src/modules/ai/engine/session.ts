/**
 * Gemini CLI Agent and Session implementation for Terax AI
 * 
 * This module uses the official @google/genai SDK directly,
 * bypassing any middleware for maximum compatibility and performance.
 */

import { GoogleGenAI, type Content, type Part } from '@google/genai';
import type {
  GeminiAgentOptions,
  SessionContext,
  TypedGeminiStreamEvent,
  Tool,
  SkillReference,
  SystemInstructions,
} from './gemini_types';
import { GeminiEventType } from './gemini_types';
import type { GeminiStreamChunk } from './types';
import { GEMINI_SYSTEM_PROMPT } from './native';
import { useChatStore } from '../store/chatStore';
import { native } from '../core/native';
import { buildTools, type ChatTools } from '../bridge/tools/tools';

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
  private client: GoogleGenAI;

  constructor(options: GeminiAgentOptions) {
    this.options = options;
    
    // Initialize the SDK without an API key to trigger native/ADC auth
    // The SDK will look for GOOGLE_API_KEY env var or use Application Default Credentials.
    this.client = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY || '', // Default to env or empty for ADC
    });
  }

  /**
   * Create a new session
   */
  session(sessionId?: string): GeminiSession {
    const id = sessionId ?? createSessionId();
    return new GeminiSession(this.options, id, this, this.client);
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<GeminiSession> {
    // In a real implementation, history would be loaded from SQLite here
    return new GeminiSession(this.options, sessionId, this, this.client);
  }
}

/**
 * Gemini Session class - handles conversation and tool execution
 */
export class GeminiSession {
  private initialized = false;
  private history: Content[] = [];
  private loadedSkills: Skill[] = [];

  constructor(
    private options: GeminiAgentOptions,
    public readonly id: string,
    private agent: GeminiAgent,
    private client: GoogleGenAI,
  ) {}

  /**
   * Initialize the session
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load skills if enabled
    if (this.options.skillsEnabled) {
      await this.loadWorkspaceSkills();
    }

    console.log(`[GeminiSession] Initialized session ${this.id} with Native SDK`);
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
            }
          }
        }
      }
    } catch {
      // Skills dir might not exist
    }
  }

  private parseSkillMarkdown(content: string): Skill | null {
    const nameMatch = content.match(/^# (.*)/);
    const descriptionMatch = content.match(/description: >\s*([\s\S]*?)\n---/);
    if (!nameMatch) return null;
    return {
      name: nameMatch[1].trim(),
      description: descriptionMatch ? descriptionMatch[1].trim() : "",
      instructions: content,
    };
  }

  /**
   * Resolve system instructions
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

    if (this.loadedSkills.length > 0) {
      const skillsBlock = this.loadedSkills
        .map((s) => `### SKILL: ${s.name}\n${s.description}\n\n${s.instructions}`)
        .join("\n\n");
      baseInstructions += `\n\n## LOADED SKILLS\n${skillsBlock}`;
    }
    return baseInstructions;
  }

  /**
   * Create a session context
   */
  private createContext(): SessionContext {
    const state = useChatStore.getState();
    return {
      sessionId: this.id,
      transcript: [...this.history] as unknown as readonly import('./gemini_types').Content[],
      cwd: state.live.getCwd() ?? '/',
      timestamp: new Date().toISOString(),
      fs: {
        readFile: async (path: string) => {
          const result = await native.readFile(path);
          return result.kind === 'text' ? result.content : null;
        },
        writeFile: async (path: string, content: string) => {
          await native.writeFile(path, content);
        },
      },
      shell: {
        exec: async (cmd: string, options?: { cwd?: string; timeoutSeconds?: number }) => {
          const result = await native.runCommand(cmd, options?.cwd ?? null, options?.timeoutSeconds ?? 60);
          return {
            exitCode: result.exit_code,
            output: result.stdout || result.stderr,
            stdout: result.stdout,
            stderr: result.stderr,
          };
        },
      },
      agent: this.agent,
      session: this,
    };
  }

  /**
   * Send a message and stream the response using Native SDK
   */
  async *sendStream(
    prompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<TypedGeminiStreamEvent> {
    if (!this.initialized) await this.initialize();

    const state = useChatStore.getState();
    const modelId = this.options.model ?? state.selectedModelId;
    const systemInstructions = await this.resolveInstructions();
    const context = this.createContext();

    // Prepare built-in tools
    const toolContext = {
      getCwd: () => context.cwd,
      getWorkspaceRoot: () => state.live.getWorkspaceRoot(),
      getTerminalContext: () => state.live.getTerminalContext(),
      injectIntoActivePty: (text: string) => state.live.injectIntoActivePty(text),
      openPreview: (url: string) => state.live.openPreview(url),
      readCache: new Set<string>(),
      getSessionId: () => this.id,
    };
    
    const builtInTools = buildTools(toolContext);
    
    // Map tool schema. We use a light wrapper around zod inferences to match the SDK expectation
    const functionDeclarations = Object.entries(builtInTools).map(([name, t]) => {
      // NOTE: In a true implementation, we'd convert Zod to JSON Schema properly.
      // Assuming the backend SDK can handle light structures or we construct strict objects.
      return {
        name,
        description: t.description,
        // @ts-ignore - Temporary bypass for Zod -> SDK JSON Schema conversion
        parameters: t.inputSchema as unknown,
      };
    });
    
    const tools = [{ functionDeclarations }];

    this.history.push({ role: 'user', parts: [{ text: prompt }] });

    try {
      const result = await this.client.models.generateContentStream({
        model: modelId,
        contents: this.history,
        config: {
          systemInstruction: { parts: [{ text: systemInstructions }] },
          tools: tools as unknown as undefined, // Type mismatch between our mock tools and official SDK, pass undefined temporarily until full schema conversion
          abortSignal: signal,
        },
      });

      let fullResponseText = "";
      const modelParts: Part[] = [];

      // Iterate the stream
      for await (const chunkResponse of result) {
        // Safe chunk casting to our custom chunk interface
        const chunk = chunkResponse as unknown as GeminiStreamChunk;
        
        let text = "";
        if (typeof chunk.text === 'function') {
            text = chunk.text();
        } else if (typeof chunk.text === 'string') {
            text = chunk.text;
        }

        if (text) {
          fullResponseText += text;
          yield { type: GeminiEventType.Content, value: text };
        }

        const calls = typeof chunk.functionCalls === 'function' 
          ? chunk.functionCalls() 
          : Array.isArray(chunk.functionCalls) ? chunk.functionCalls : undefined;
          
        if (calls && calls.length > 0) {
          for (const call of calls) {
            yield {
              type: GeminiEventType.ToolCallRequest,
              value: {
                callId: call.id || `call-${Date.now()}`,
                name: call.name,
                args: call.args,
              },
            };
            
            const toolFunc = builtInTools[call.name as keyof ChatTools];
            if (toolFunc) {
              const toolResult = await toolFunc.execute(call.args as never);
              yield { type: GeminiEventType.ToolCallResponse, value: toolResult };
              
              modelParts.push({ functionCall: call } as Part);
              this.history.push({ role: 'model', parts: [...modelParts] });
              this.history.push({
                role: 'user',
                parts: [{ functionResponse: { name: call.name, response: toolResult as Record<string, unknown> } }],
              });
            }
          }
        }
      }

      if (fullResponseText) {
        modelParts.push({ text: fullResponseText });
        this.history.push({ role: 'model', parts: modelParts });
      }

      yield { type: GeminiEventType.Finish, value: null };

    } catch (error) {
      console.error('[GeminiSession] Native SDK Stream error:', error);
      yield {
        type: GeminiEventType.Error,
        value: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getHistory(): readonly Content[] {
    return [...this.history];
  }

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
): Tool<T> {
  return {
    name,
    description,
    inputSchema: schema,
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
  return new GeminiAgent({
    instructions: GEMINI_SYSTEM_PROMPT,
    model: options?.model ?? 'gemini-2.0-flash-exp',
    cwd: process.cwd(),
    debug: false,
    skillsEnabled: true,
    ...options,
  });
}
