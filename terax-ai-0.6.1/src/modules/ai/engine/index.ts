/**
 * Gemini CLI Integration for Cipher AI
 * 
 * This module provides complete integration with Google's Gemini CLI,
 * making Gemini the sole AI agent with native control over Cipher.
 * 
 * @module gemini
 */

// Core types
export type {
  AgentFilesystem,
  AgentShell,
  AgentShellOptions,
  AgentShellResult,
  Content,
  SessionContext,
  GeminiStreamEvent,
  ToolDefinition,
  Tool,
  ToolAction,
  SkillReference,
  SystemInstructions,
  GeminiAgentOptions,
  TypedGeminiStreamEvent,
  ContentEvent,
  ToolCallRequestEvent,
} from './types';

// Native bridge implementations
export {
  GeminiCipherFilesystem,
  GeminiCipherShell,
  createGeminiSessionContext,
  GEMINI_SYSTEM_PROMPT,
  DEFAULT_SKILLS_CONFIG,
  DEFAULT_GEMINI_CONFIG,
  type GeminiIntegrationConfig,
} from './native';

// Agent and session implementation
export {
  GeminiAgent,
  GeminiSession,
  createSessionId,
  defineTool,
  skillDir,
  createCipherInstructions,
  createCipherGeminiAgent,
} from './session';

/**
 * Quick start example:
 * 
 * ```typescript
 * import { createCipherGeminiAgent } from './modules/ai/core/gemini';
 * 
 * // Create the sole Gemini agent for Cipher
 * const agent = createCipherGeminiAgent({
 *   customInstructions: 'Focus on TypeScript and React best practices',
 * });
 * 
 * // Create a session
 * const session = agent.session();
 * await session.initialize();
 * 
 * // Stream responses
 * for await (const event of session.sendStream('Create a todo app')) {
 *   if (event.type === 'content') {
 *     console.log(event.value);
 *   }
 * }
 * ```
 */
