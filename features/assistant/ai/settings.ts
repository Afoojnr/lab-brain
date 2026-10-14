import { z } from 'zod';

export const AI_PROVIDERS = [
  'anthropic',
  'openai',
  'openrouter',
  'ollama'
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

/**
 * What the user chose to talk to: which provider, their key, the model and (for
 * Ollama, which runs on their computer) its address. It lives in the browser
 * and is sent with each question; the server uses it for that request only and
 * never stores or logs it.
 */
export type AiSettings = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** OpenRouter only: use providers with a zero-data-retention policy (stricter than "do not train", which is always asked for). */
  isZeroRetention: boolean;
};

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434/v1';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-5-5',
  baseUrl: DEFAULT_OLLAMA_URL,
  isZeroRetention: false
};

/** Models offered as suggestions; any model name can be typed instead. */
export const MODEL_SUGGESTIONS: Record<AiProvider, string[]> = {
  anthropic: [
    'claude-sonnet-5-5',
    'claude-opus-5-5',
    'claude-haiku-5-5',
    'claude-fable-5-1'
  ],
  openai: ['gpt-5.2', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o-mini'],
  // OpenRouter names are `maker/model`; any model from its list can be typed.
  openrouter: [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-haiku',
    'google/gemini-2.0-flash-001'
  ],
  ollama: ['qwen2.5:7b', 'llama3.1', 'mistral']
};

/** The model to start with when the provider changes. */
export const DEFAULT_MODEL: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-5-mini',
  openrouter: 'openai/gpt-4o-mini',
  ollama: 'qwen2.5:7b'
};

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Whether an Ollama address points at this computer. Ollama is a program on the
 * user's own machine, so only that is accepted: a typed address can never make
 * the server reach other machines on its network.
 */
export const isLocalAddress = (address: string): boolean => {
  try {
    const url = new URL(address);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      LOOPBACK_HOSTS.includes(url.hostname)
    );
  } catch {
    return false;
  }
};

/** The shape of the settings sent to the server (it re-checks everything). */
export const aiSettingsSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().max(500),
  model: z.string().trim().min(1).max(100),
  baseUrl: z.string().trim().max(300),
  // Settings saved before this existed have no value: off.
  isZeroRetention: z.boolean().default(false)
});

/**
 * Whether the settings are enough to ask a question: a key and a model for
 * Claude and OpenAI; a model and a local address for Ollama (no key).
 */
export const isAiReady = (settings: AiSettings): boolean =>
  settings.model.trim() !== '' &&
  (settings.provider === 'ollama'
    ? isLocalAddress(settings.baseUrl)
    : settings.apiKey.trim() !== '');
