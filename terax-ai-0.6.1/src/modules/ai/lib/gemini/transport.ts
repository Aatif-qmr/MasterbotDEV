/**
 * Gemini Transport for Terax AI
 * 
 * Bridges the GeminiSession to the Vercel AI SDK's ChatTransport interface,
 * allowing the existing chatStore to use Gemini as the sole agent.
 */

import type { UIMessage } from '@ai-sdk/react';
import { type ChatTransport } from 'ai';
import { GeminiAgent, createTeraxGeminiAgent } from './session';
import { GeminiEventType } from './types';
import type { GeminiAgentOptions } from './types';

export interface GeminiTransportOptions extends Partial<GeminiAgentOptions> {
  sessionId?: string;
}

/**
 * ChatTransport implementation that routes through GeminiSession
 */
export class GeminiTransport implements ChatTransport<UIMessage> {
  private agent: GeminiAgent;
  private options: GeminiTransportOptions;

  constructor(options: GeminiTransportOptions = {}) {
    this.options = options;
    this.agent = createTeraxGeminiAgent(options);
  }

  async sendMessages(options: {
    messages: UIMessage[];
    [k: string]: unknown;
  }) {
    // Get the last user message as the prompt
    const lastUserMessage = [...options.messages].reverse().find(m => m.role === 'user');
    const prompt = (lastUserMessage as any)?.content ?? ''; 

    // Create or resume session
    const session = this.agent.session(this.options.sessionId);
    await session.initialize();

    // Return a readable stream compatible with Vercel AI SDK
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of session.sendStream(prompt)) {
            switch (event.type) {
              case GeminiEventType.Content:
                controller.enqueue(`0:${JSON.stringify(event.value)}\n`);
                break;
              case GeminiEventType.ToolCallRequest:
                const toolCall = event.value as any;
                controller.enqueue(`9:${JSON.stringify({
                  toolCallId: toolCall.callId,
                  toolName: toolCall.name,
                  args: toolCall.args,
                })}\n`);
                break;
              case GeminiEventType.ToolCallResponse:
                const toolResult = event.value as any;
                controller.enqueue(`a:${JSON.stringify({
                  toolCallId: 'temp-id', // We need to track IDs if we want precision
                  result: toolResult,
                })}\n`);
                break;
              case GeminiEventType.Finish:
                controller.close();
                break;
              case GeminiEventType.Error:
                controller.error(event.value);
                break;
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  // Not strictly required for the base DirectChatTransport usage but good for completeness
  async reconnectToStream(_options: any): Promise<ReadableStream<any> | null> {
    return null;
  }
}

/**
 * Create a Gemini transport instance
 */
export function createGeminiTransport(options?: GeminiTransportOptions): GeminiTransport {
  return new GeminiTransport(options);
}
