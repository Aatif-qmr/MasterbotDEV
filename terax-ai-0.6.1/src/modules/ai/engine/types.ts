import type { Content } from '@google/genai';
import { z, type ZodTypeAny } from "zod";

export type { Content };

/**
 * Strict typing for the Gemini stream chunks coming from the SDK
 * This mirrors what we expect to extract from GenerateContentResponse
 */
export interface GeminiStreamChunk {
  text?: () => string;
  functionCalls?: () => Array<{
    id?: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

/**
 * Exact shape of tool requests in Terax AI
 */
export interface TeraxToolCall {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface TeraxToolResponse {
  callId: string;
  name: string;
  result: unknown;
}

/**
 * Strictly typed message parts for the UI
 */
export type UIMessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool-invocation";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      state: "call" | "result";
      result?: unknown;
    }
  | { type: "reasoning"; text: string }
  | { type: "file"; mediaType: string; url: string; filename?: string };

export type ChatStatus = "idle" | "thinking" | "streaming" | "submitted" | "error";

export interface ChatState {
  status: ChatStatus;
  error: Error | undefined;
}

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  parts: UIMessagePart[];
}

export interface TeraxTool<T extends ZodTypeAny = ZodTypeAny> {
  description: string;
  inputSchema: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
  needsApproval?: boolean;
}

export function tool<T extends ZodTypeAny>(options: {
  description: string;
  inputSchema: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
  needsApproval?: boolean;
}): TeraxTool<T> {
  return options;
}

/**
 * Filesystem interface that Gemini CLI expects
 */
export interface AgentFilesystem {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
}

/**
 * Shell execution result
 */
export interface AgentShellResult {
  exitCode: number | null;
  output: string;
  stdout: string;
  stderr: string;
  error?: Error;
}

/**
 * Shell execution options
 */
export interface AgentShellOptions {
  env?: Record<string, string>;
  timeoutSeconds?: number;
  cwd?: string;
}

/**
 * Shell interface that Gemini CLI expects
 */
export interface AgentShell {
  exec(
    cmd: string, 
    options?: AgentShellOptions
  ): Promise<AgentShellResult>;
}

/**
 * Forward declaration interfaces to solve circular dependencies
 */
export interface IGeminiAgent {
  session(sessionId?: string): IGeminiSession;
}

export interface IGeminiSession {
  id: string;
  sendStream(prompt: string, signal?: AbortSignal): AsyncGenerator<TypedGeminiStreamEvent>;
  initialize(): Promise<void>;
}

/**
 * Session context passed to dynamic instructions and tools
 */
export interface SessionContext {
  sessionId: string;
  transcript: readonly Content[];
  cwd: string;
  timestamp: string;
  fs: AgentFilesystem;
  shell: AgentShell;
  agent: IGeminiAgent;
  session: IGeminiSession;
}

/**
 * Tool definition for Gemini CLI
 */
export interface ToolDefinition<T = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: T;
  sendErrorsToModel?: boolean;
}

/**
 * Tool action function
 */
export type ToolAction<T = Record<string, unknown>> = (
  params: T, 
  context?: SessionContext
) => Promise<unknown>;

/**
 * Complete tool interface
 */
export interface Tool<T = Record<string, unknown>> extends ToolDefinition<T> {
  action: ToolAction<T>;
}

/**
 * Skill reference for loading custom skills
 */
export type SkillReference = { type: 'dir'; path: string };

/**
 * System instructions can be static or dynamic
 */
export type SystemInstructions =
  | string
  | ((context: SessionContext) => string | Promise<string>);

/**
 * Configuration options for creating a Gemini agent
 */
export interface GeminiAgentOptions {
  instructions: SystemInstructions;
  tools?: Array<Tool>;
  skills?: SkillReference[];
  skillsEnabled?: boolean;
  model?: string;
  cwd?: string;
  debug?: boolean;
  recordResponses?: string;
  fakeResponses?: string;
}

export enum GeminiEventType {
  Content = 'content',
  ToolCallRequest = 'tool_call_request',
  ToolCallResponse = 'tool_call_response',
  Finish = 'finish',
  Error = 'error',
}

export interface GeminiStreamEvent {
  type: GeminiEventType;
  value: unknown;
}

export interface ToolCallRequestEvent extends GeminiStreamEvent {
  type: GeminiEventType.ToolCallRequest;
  value: TeraxToolCall;
}

export interface ToolCallResponseEvent extends GeminiStreamEvent {
  type: GeminiEventType.ToolCallResponse;
  value: unknown;
}

export interface ContentEvent extends GeminiStreamEvent {
  type: GeminiEventType.Content;
  value: string;
}

export interface ErrorEvent extends GeminiStreamEvent {
  type: GeminiEventType.Error;
  value: string;
}

export interface FinishEvent extends GeminiStreamEvent {
  type: GeminiEventType.Finish;
  value: null;
}

export type TypedGeminiStreamEvent = 
  | ContentEvent 
  | ToolCallRequestEvent 
  | ToolCallResponseEvent
  | FinishEvent
  | ErrorEvent;
