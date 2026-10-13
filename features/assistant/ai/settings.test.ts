import { describe, expect, it } from 'vitest';

import {
  aiSettingsSchema,
  DEFAULT_AI_SETTINGS,
  isAiReady,
  isLocalAddress
} from './settings';

const settings = (changes: Partial<typeof DEFAULT_AI_SETTINGS>) => ({
  ...DEFAULT_AI_SETTINGS,
  ...changes
});

describe('isLocalAddress', () => {
  it.each([
    'http://localhost:11434/v1',
    'http://127.0.0.1:11434',
    'https://localhost/v1',
    'http://[::1]:11434/v1'
  ])('accepts %s', address => expect(isLocalAddress(address)).toBe(true));

  it.each([
    'http://192.168.1.20:11434',
    'http://169.254.169.254/latest',
    'http://example.com',
    'http://localhost.evil.com',
    'file:///etc/passwd',
    'localhost:11434',
    ''
  ])('refuses %s, so a typed address cannot reach other machines', address =>
    expect(isLocalAddress(address)).toBe(false)
  );
});

describe('isAiReady', () => {
  it('needs a key and a model for Claude and OpenAI', () => {
    expect(isAiReady(settings({ apiKey: '' }))).toBe(false);
    expect(isAiReady(settings({ apiKey: '  ' }))).toBe(false);
    expect(isAiReady(settings({ apiKey: 'sk-x', model: '' }))).toBe(false);
    expect(isAiReady(settings({ apiKey: 'sk-x' }))).toBe(true);
    expect(isAiReady(settings({ provider: 'openai', apiKey: 'sk-x' }))).toBe(
      true
    );
    expect(
      isAiReady(settings({ provider: 'openrouter', apiKey: '', model: 'a/b' }))
    ).toBe(false);
    expect(
      isAiReady(
        settings({ provider: 'openrouter', apiKey: 'sk-or-x', model: 'a/b' })
      )
    ).toBe(true);
  });

  it('needs no key for Ollama, but a model and a local address', () => {
    expect(isAiReady(settings({ provider: 'ollama', model: 'llama3.1' }))).toBe(
      true
    );
    expect(
      isAiReady(
        settings({
          provider: 'ollama',
          model: 'llama3.1',
          baseUrl: 'http://192.168.0.5:11434'
        })
      )
    ).toBe(false);
  });
});

describe('aiSettingsSchema', () => {
  it('accepts the defaults and refuses an unknown provider, a missing model and a huge key', () => {
    expect(aiSettingsSchema.safeParse(DEFAULT_AI_SETTINGS).success).toBe(true);
    expect(
      aiSettingsSchema.safeParse({ ...DEFAULT_AI_SETTINGS, provider: 'other' })
        .success
    ).toBe(false);
    expect(
      aiSettingsSchema.safeParse({ ...DEFAULT_AI_SETTINGS, model: ' ' }).success
    ).toBe(false);
    expect(
      aiSettingsSchema.safeParse({
        ...DEFAULT_AI_SETTINGS,
        apiKey: 'x'.repeat(501)
      }).success
    ).toBe(false);
  });
});
