/** @deprecated Legacy providers preserved for reference. Not active in Gemini-First build. */

export type LegacyProviderId =
  | "openai"
  | "anthropic"
  | "xai"
  | "cerebras"
  | "groq"
  | "deepseek";

export type LegacyProviderInfo = {
  id: LegacyProviderId;
  label: string;
  keyringAccount: string;
  keyPrefix: string | null;
  consoleUrl: string;
};

export const LEGACY_PROVIDERS: readonly LegacyProviderInfo[] = [
  {
    id: "openai",
    label: "OpenAI",
    keyringAccount: "openai-api-key",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    keyringAccount: "anthropic-api-key",
    keyPrefix: "sk-ant-",
    consoleUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "xai",
    label: "xAI",
    keyringAccount: "xai-api-key",
    keyPrefix: "xai-",
    consoleUrl: "https://console.x.ai/",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    keyringAccount: "cerebras-api-key",
    keyPrefix: "csk-",
    consoleUrl: "https://cloud.cerebras.ai/",
  },
  {
    id: "groq",
    label: "Groq",
    keyringAccount: "groq-api-key",
    keyPrefix: "gsk_",
    consoleUrl: "https://console.groq.com/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    keyringAccount: "deepseek-api-key",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.deepseek.com/api_keys",
  },
] as const;

export const LEGACY_MODELS = [
  // OpenAI
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    label: "GPT-5.4 mini",
    hint: "Fast, default",
  },
  {
    id: "gpt-5.5",
    provider: "openai",
    label: "GPT-5.5",
    hint: "Higher quality",
  },
  {
    id: "gpt-5.3-codex",
    provider: "openai",
    label: "GPT-5.3 Codex",
    hint: "Coding",
  },
  // Anthropic
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    label: "Claude Haiku 4.5",
    hint: "Fast",
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    hint: "Balanced",
  },
  {
    id: "claude-opus-4-7",
    provider: "anthropic",
    label: "Claude Opus 4.7",
    hint: "Best",
  },
  // xAI
  {
    id: "grok-4.20-reasoning",
    provider: "xai",
    label: "Grok 4.20 Reasoning",
    hint: "Reasoning",
  },
  {
    id: "grok-4.20-non-reasoning",
    provider: "xai",
    label: "Grok 4.20",
    hint: "Fast",
  },
  // Cerebras (autocomplete-tier)
  {
    id: "gpt-oss-120b",
    provider: "cerebras",
    label: "GPT-OSS 120B",
    hint: "Cerebras · ultra-fast",
  },
  // Groq (autocomplete-tier)
  {
    id: "openai/gpt-oss-20b",
    provider: "groq",
    label: "GPT-OSS 20B",
    hint: "Groq · ultra-fast",
  },
  // DeepSeek
  {
    id: "deepseek-v4-flash",
    provider: "deepseek",
    label: "DeepSeek V4 Flash",
    hint: "Fast",
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    label: "DeepSeek V4 Pro",
    hint: "Best",
  },
] as const;
