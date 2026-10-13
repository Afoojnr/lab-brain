import { MockLanguageModelV4 } from 'ai/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ai/provider', () => ({ createModel: vi.fn() }));

import { createModel } from '../ai/provider';
import { DEFAULT_AI_SETTINGS } from '../ai/settings';
import { testAiConnectionAction } from './test-ai-connection';

const USAGE = {
  inputTokens: {
    total: 3,
    noCache: 3,
    cacheRead: undefined,
    cacheWrite: undefined
  },
  outputTokens: { total: 2, text: 2, reasoning: undefined }
};
const READY = { ...DEFAULT_AI_SETTINGS, apiKey: 'sk-test-secret' };

const answering = () =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: 'OK' }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: USAGE,
      warnings: []
    })
  });
const failing = (error: object) =>
  new MockLanguageModelV4({
    doGenerate: async () => {
      throw Object.assign(new Error('Invalid key sk-test-secret'), error);
    }
  });

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('testAiConnectionAction', () => {
  it('reports that it works when the model answers', async () => {
    vi.mocked(createModel).mockReturnValueOnce(answering());

    expect(await testAiConnectionAction(READY)).toEqual({ ok: true });
    expect(createModel).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'anthropic',
        apiKey: 'sk-test-secret'
      })
    );
  });

  it('says the key was refused, without repeating the provider message that holds it', async () => {
    vi.mocked(createModel).mockReturnValueOnce(failing({ statusCode: 401 }));

    const result = await testAiConnectionAction(READY);

    expect(result).toEqual({ ok: false, error: 'unauthorized' });
    expect(JSON.stringify(result)).not.toContain('sk-test-secret');
  });

  it('is not ready without a key, or with settings that are not settings', async () => {
    expect(await testAiConnectionAction(DEFAULT_AI_SETTINGS)).toEqual({
      ok: false,
      error: 'notReady'
    });
    expect(await testAiConnectionAction({ provider: 'x' })).toEqual({
      ok: false,
      error: 'notReady'
    });
    expect(await testAiConnectionAction(null)).toEqual({
      ok: false,
      error: 'notReady'
    });
    expect(createModel).not.toHaveBeenCalled();
  });

  it('reaches Ollama only on this computer, and only when the app allows it', async () => {
    const ollama = {
      ...DEFAULT_AI_SETTINGS,
      provider: 'ollama' as const,
      model: 'llama3.1'
    };
    vi.mocked(createModel).mockReturnValue(answering());

    expect(
      await testAiConnectionAction({
        ...ollama,
        baseUrl: 'http://192.168.1.9:11434'
      })
    ).toEqual({ ok: false, error: 'notReady' });
    expect(await testAiConnectionAction(ollama)).toEqual({ ok: true });

    vi.stubEnv('LAB_BRAIN_DISABLE_LOCAL_AI', 'true');
    expect(await testAiConnectionAction(ollama)).toEqual({
      ok: false,
      error: 'localDisabled'
    });
  });
});
