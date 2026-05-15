import {
  DEFAULT_AUTOCOMPLETE_MODEL,
  type AutocompleteProviderId,
} from "@/modules/ai/config";
import { createTeraxGeminiAgent } from "@/modules/ai/engine/session";
import {
  buildUserPrompt,
  COMPLETION_SYSTEM_PROMPT,
  type CompletionRequest,
} from "./prompt";

export type CompletionDeps = {
  provider: AutocompleteProviderId;
  modelId: string;
  /** API key for the configured provider, or null for keyless (LM Studio). */
  apiKey: string | null;
  lmstudioBaseURL: string;
};

export async function requestCompletion(
  req: CompletionRequest,
  deps: CompletionDeps,
  signal: AbortSignal,
): Promise<string> {
  const modelId =
    deps.modelId.trim() || DEFAULT_AUTOCOMPLETE_MODEL[deps.provider];
  
  const agent = createTeraxGeminiAgent({
    model: modelId,
    instructions: COMPLETION_SYSTEM_PROMPT,
    skillsEnabled: false,
  });

  const session = await agent.session(`autocomplete-${Date.now()}`);
  await session.initialize();

  const prompt = buildUserPrompt(req);
  const result = await session.generate(prompt, signal);

  return cleanCompletion(result.text);
}

function cleanCompletion(raw: string): string {
  let t = raw;
  const fence = t.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  if (fence) t = fence[1];
  t = t.replace(/^<\|cursor\|>/, "");
  return t;
}
