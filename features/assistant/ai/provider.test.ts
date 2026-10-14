import { generateText } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('createModel: OpenRouter privacy', () => {
  const sendOne = async (isZeroRetention: boolean) => {
    let body: Record<string, unknown> = {};
    let url = '';
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        url = String(input);
        body = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            id: 'x',
            created: 0,
            model: 'a/b',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop'
              }
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
          }),
          { headers: { 'content-type': 'application/json' } }
        );
      }
    );
    await generateText({
      model: createModel({
        ...DEFAULT_AI_SETTINGS,
        provider: 'openrouter',
        apiKey: 'sk-or-test',
        model: 'a/b',
        isZeroRetention
      }),
      prompt: 'hi',
      maxRetries: 0
    });

    return { body, url };
  };

  afterEach(() => vi.unstubAllGlobals());

  it('always asks for providers that do not collect or train on prompts', async () => {
    const { body, url } = await sendOne(false);

    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(body.provider).toEqual({ data_collection: 'deny' });
  });

  it('asks for zero data retention only when the user ticked it', async () => {
    const { body } = await sendOne(true);

    expect(body.provider).toEqual({ data_collection: 'deny', zdr: true });
  });

  it('sends no privacy field to the other providers', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal(
      'fetch',
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        body = JSON.parse(String(init?.body));

        return new Response('{}', { status: 500 });
      }
    );
    await generateText({
      model: createModel({
        ...DEFAULT_AI_SETTINGS,
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-x'
      }),
      prompt: 'hi',
      maxRetries: 0
    }).catch(() => undefined);

    expect(body).not.toHaveProperty('provider');
  });
});
