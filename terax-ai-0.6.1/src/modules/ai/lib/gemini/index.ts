/**
 * Gemini CLI Integration for Terax AI
 * 
 * This module provides complete integration with Google's Gemini CLI,
 * making Gemini the sole AI agent with native control over Terax.
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
  GeminiTeraxFilesystem,
  GeminiTeraxShell,
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
  createTeraxInstructions,
  createTeraxGeminiAgent,
} from './session';

// Transport adapter
export {
  GeminiTransport,
  createGeminiTransport,
  type GeminiTransportOptions,
} from './transport';

/**
 * Quick start example:
 * 
 * ```typescript
 * import { createTeraxGeminiAgent } from './modules/ai/lib/gemini';
 * 
 * // Create the sole Gemini agent for Terax
 * const agent = createTeraxGeminiAgent({
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
