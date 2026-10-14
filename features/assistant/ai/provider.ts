import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import { createMockModel } from './mock-model';
import type { AiSettings } from './settings';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

/** The model to talk to, from the user's settings. */
export const createModel = (settings: AiSettings): LanguageModel => {
  // For the end-to-end tests only; never available in production.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.LAB_BRAIN_MOCK_AI === 'true'
  ) {
    return createMockModel();
  }

  switch (settings.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey: settings.apiKey })(settings.model);
    case 'openai':
      return createOpenAI({ apiKey: settings.apiKey })(settings.model);
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        baseURL: OPENROUTER_URL,
        apiKey: settings.apiKey,
        // Always ask for providers that do not collect or train on prompts;
        // optionally only those with a zero-data-retention policy.
        transformRequestBody: body => ({
          ...body,
          provider: {
            data_collection: 'deny',
            ...(settings.isZeroRetention ? { zdr: true } : {})
          }
        })
      })(settings.model);
    case 'ollama':
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: settings.baseUrl
      })(settings.model);
  }
};
