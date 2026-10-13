import { MockLanguageModelV4, simulateReadableStream } from 'ai/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleChat, MAX_HISTORY_MESSAGES } from './chat-handler';
import { DEFAULT_AI_SETTINGS } from '../ai/settings';

const KEY = 'sk-test-secret-key';
const SETTINGS = { ...DEFAULT_AI_SETTINGS, apiKey: KEY };
const USAGE = {
  inputTokens: {
    total: 30,
    noCache: 30,
    cacheRead: undefined,
    cacheWrite: undefined
  },
  outputTokens: { total: 12, text: 12, reasoning: undefined }
};
const FINISH = (unified: 'stop' | 'tool-calls') => ({
  type: 'finish' as const,
  finishReason: { unified, raw: undefined },
  usage: USAGE
});

type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4['doStream']>
  >['stream'] extends ReadableStream<infer Part>
    ? Part
    : never;

const question = (text: string, id = 'q1') => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }]
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });

const valid = (overrides: Record<string, unknown> = {}) => ({
  messages: [question('Which samples were made at 600 cycles?')],
  scope: { projectId: 'demo-project-1' },
  settings: SETTINGS,
  ...overrides
});

/** A model that first calls a tool, then answers with text. */
const toolThenAnswer = (toolName: string, input: object, answer: string) => {
  let call = 0;

  return new MockLanguageModelV4({
    doStream: async () => {
      call += 1;
      const chunks: StreamPart[] =
        call === 1
          ? [
              {
                type: 'tool-call' as const,
                toolCallId: 'call-1',
                toolName,
                input: JSON.stringify(input)
              },
              FINISH('tool-calls')
            ]
          : [
              { type: 'text-start' as const, id: 't' },
              { type: 'text-delta' as const, id: 't', delta: answer },
              { type: 'text-end' as const, id: 't' },
              FINISH('stop')
            ];

      return { stream: simulateReadableStream({ chunks }) };
    }
  });
};

afterEach(() => vi.unstubAllEnvs());

describe('handleChat', () => {
  it('lets the model read the experiments with a tool and streams the answer with tokens used', async () => {
    const response = await handleChat(post(valid()), {
      model: toolThenAnswer('listExperiments', {}, 'There is one experiment.')
    });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('tool-output-available');
    expect(text).toContain('Deposition');
    expect(text).toContain('There is one experiment.');
    expect(text).toContain('"totalTokens":84');
    expect(text).not.toContain(KEY);
  });

  it('gives the model the project, its rules and the tools', async () => {
    const model = toolThenAnswer('listExperiments', {}, 'ok');
    await (await handleChat(post(valid()), { model })).text();

    const first = model.doStreamCalls[0];
    expect(JSON.stringify(first.prompt)).toContain('ALD of BxC');
    expect(JSON.stringify(first.prompt)).toContain('read-only');
    expect(first.tools?.map(item => item.name).sort()).toEqual([
      'findSamples',
      'getExperimentOverview',
      'getSample',
      'listExperiments',
      'readReference',
      'searchNotes'
    ]);
  });

  it('reports a tool mistake to the model instead of failing the answer', async () => {
    const response = await handleChat(post(valid()), {
      model: toolThenAnswer(
        'findSamples',
        {
          experiment: 'Deposition',
          filters: [{ column: 'Nope', operator: 'eq', value: 1 }]
        },
        'That column does not exist.'
      )
    });
    const text = await response.text();

    expect(text).toContain('No column named');
    expect(text).toContain('That column does not exist.');
  });

  it('sends only the last messages of a long chat', async () => {
    const messages = Array.from({ length: 30 }, (_, index) =>
      question(`question ${index}`, `q${index}`)
    );
    const model = toolThenAnswer('listExperiments', {}, 'ok');
    await (await handleChat(post(valid({ messages })), { model })).text();

    const sent = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(sent).toContain('question 29');
    expect(sent).not.toContain(`question ${30 - MAX_HISTORY_MESSAGES - 1}"`);
  });

  it('refuses a request that is not valid, a missing project and a missing experiment', async () => {
    const model = toolThenAnswer('listExperiments', {}, 'ok');

    expect((await handleChat(post({ nope: 1 }), { model })).status).toBe(400);
    expect(
      (await handleChat(post(valid({ scope: { projectId: 'x' } })), { model }))
        .status
    ).toBe(404);
    expect(
      (
        await handleChat(
          post(
            valid({ scope: { projectId: 'demo-project-1', experimentId: 'x' } })
          ),
          { model }
        )
      ).status
    ).toBe(404);
    expect(
      (
        await handleChat(post(valid({ messages: [{ role: 'user' }] })), {
          model
        })
      ).status
    ).toBe(400);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('refuses an oversize question and an oversize request', async () => {
    const model = toolThenAnswer('listExperiments', {}, 'ok');

    expect(
      (
        await handleChat(
          post(valid({ messages: [question('x'.repeat(5000))] })),
          { model }
        )
      ).status
    ).toBe(413);
    expect(
      (
        await handleChat(post(valid(), { 'content-length': '999999' }), {
          model
        })
      ).status
    ).toBe(413);
  });

  it('asks for settings first when there is no key, without calling any model', async () => {
    const response = await handleChat(
      post(valid({ settings: { ...SETTINGS, apiKey: '' } }))
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'notReady' });
  });

  it('only talks to Ollama on this computer, and not when local AI is switched off', async () => {
    const ollama = (baseUrl: string) =>
      valid({
        settings: { ...SETTINGS, provider: 'ollama', apiKey: '', baseUrl }
      });

    const remote = await handleChat(
      post(ollama('http://192.168.1.20:11434/v1'))
    );
    expect(remote.status).toBe(400);

    vi.stubEnv('LAB_BRAIN_DISABLE_LOCAL_AI', 'true');
    const disabled = await handleChat(
      post(ollama('http://localhost:11434/v1'))
    );
    expect(disabled.status).toBe(403);
    expect(await disabled.json()).toEqual({ error: 'localDisabled' });
  });

  it('turns a provider failure into an error key without repeating its message or the key', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw Object.assign(new Error(`Invalid key ${KEY}`), {
          statusCode: 401
        });
      }
    });
    const logged = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await handleChat(post(valid()), { model });
    const text = await response.text();

    expect(text).toContain('unauthorized');
    expect(text).not.toContain(KEY);
    expect(JSON.stringify(logged.mock.calls)).not.toContain(KEY);
    logged.mockRestore();
  });
});
