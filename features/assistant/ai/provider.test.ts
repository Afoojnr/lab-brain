import { describe, expect, it } from 'vitest';

import { createModel } from './provider';
import { DEFAULT_AI_SETTINGS } from './settings';

describe('createModel', () => {
  it('builds a model for every provider with the chosen model name', () => {
    for (const provider of [
      'anthropic',
      'openai',
      'openrouter',
      'ollama'
    ] as const) {
      const model = createModel({
        ...DEFAULT_AI_SETTINGS,
        provider,
        apiKey: 'sk-test',
        model: 'some/model'
      });

      expect(typeof model === 'object' && model.modelId).toBe('some/model');
    }
  });

  it('sends OpenRouter requests to OpenRouter', () => {
    const model = createModel({
      ...DEFAULT_AI_SETTINGS,
      provider: 'openrouter',
      apiKey: 'sk-test',
      model: 'openai/gpt-4o-mini'
    });

    expect(typeof model === 'object' && model.provider).toContain('openrouter');
  });
});
