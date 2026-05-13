import { z, type ZodTypeAny } from "zod";

/**
 * Strict typing for the Gemini stream chunks coming from the SDK
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

export type UIMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  parts: UIMessagePart[];
};

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
