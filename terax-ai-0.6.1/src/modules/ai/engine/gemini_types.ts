/**
 * Type definitions for Gemini CLI integration with Terax AI
 * 
 * These types mirror the Gemini CLI SDK types to enable
 * seamless integration without requiring the full SDK as a dependency.
 */

import type { UIMessagePart } from './types';

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
 * Content type from Gemini CLI (simplified)
 */
export interface Content {
  role: 'user' | 'model';
  parts: Array<{ text?: string } | Record<string, unknown>>;
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
  agent: GeminiAgent;
  session: GeminiSession;
}

/**
 * Forward declarations for circular reference resolution
 */
export interface GeminiAgent {
  session(sessionId?: string): Promise<GeminiSession>;
}

export interface GeminiSession {
  id: string;
  sendStream(prompt: string, signal?: AbortSignal): AsyncGenerator<TypedGeminiStreamEvent>;
  generate(prompt: string, signal?: AbortSignal): Promise<{ text: string; parts: UIMessagePart[] }>;
  initialize(): Promise<void>;
}

/**
 * Stream event types from Gemini CLI
 */
export enum GeminiEventType {
  Content = 'content',
  ToolCallRequest = 'tool_call_request',
  ToolCallResponse = 'tool_call_response',
  Finish = 'finish',
  Error = 'error',
}

/**
 * Base stream event interface
 */
export interface GeminiStreamEvent {
  type: GeminiEventType;
  value: unknown;
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
 * Simplified Zod type for schema definitions
 */
export interface ZodType {
  _type: unknown;
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

/**
 * Event for tool call requests
 */
export interface ToolCallRequestEvent extends GeminiStreamEvent {
  type: GeminiEventType.ToolCallRequest;
  value: {
    callId: string;
    name: string;
    args: Record<string, unknown>;
  };
}

/**
 * Event for content streaming
 */
export interface ContentEvent extends GeminiStreamEvent {
  type: GeminiEventType.Content;
  value: string;
}

/**
 * Union type for all stream events
 */
export type TypedGeminiStreamEvent = 
  | ContentEvent 
  | ToolCallRequestEvent 
  | GeminiStreamEvent;

export type { UIMessagePart };
