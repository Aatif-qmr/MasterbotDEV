import { DEFAULT_MODEL_ID, getModel, type ModelId } from "../config";
import { createCipherGeminiAgent, type GeminiAgent, type GeminiSession } from "../engine/session";
import type { ToolContext } from "../bridge/tools/context";
import { buildFsTools } from "../bridge/tools/fs";
import { buildSearchTools } from "../bridge/tools/search";
import { SUBAGENTS, type SubagentType } from "./subagents";

type Args = {
  type: SubagentType;
  prompt: string;
  modelId: ModelId;
  toolContext: ToolContext;
};

type RunResult = {
  summary: string;
  stepCount: number;
  durationMs: number;
};

export async function runSubagent({
  type,
  prompt,
  modelId,
  toolContext,
}: Args): Promise<RunResult> {
  const def = SUBAGENTS[type];
  if (!def) throw new Error(`unknown subagent type: ${type}`);

  // Subagents only get read-only tools. Build directly from the read-only
  // builders to avoid pulling in mutating/recursive tools.
  const readOnly: Record<string, any> = {
    ...buildFsTools(toolContext),
    ...buildSearchTools(toolContext),
  };
  const filteredTools: any[] = [];
  for (const t of def.tools) {
    if (t in readOnly) {
        // Map to Tool interface
        filteredTools.push({
            name: t,
            description: (readOnly[t] as any).description,
            inputSchema: (readOnly[t] as any).inputSchema,
            action: (readOnly[t] as any).execute
        });
    }
  }

  const agent: GeminiAgent = createCipherGeminiAgent({
    model: getModel(modelId).id,
    instructions: def.systemPrompt,
    tools: filteredTools,
    skillsEnabled: false,
  });

  const start = Date.now();
  const session: GeminiSession = await agent.session(`subagent-${Date.now()}`);
  await session.initialize();
  
  const result = await session.generate(prompt);
  const durationMs = Date.now() - start;

  // Since generate() returns UIMessagePart[], we extract text from them
  const summary = result.text || "(no output)";
  const stepCount = result.parts.filter(p => p.type === 'tool-invocation').length;

  return { summary, stepCount, durationMs };
}

export const DEFAULT_SUBAGENT_MODEL: ModelId = DEFAULT_MODEL_ID;
