import { MockLanguageModelV4, simulateReadableStream } from 'ai/test';

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined }
};

type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4['doStream']>
  >['stream'] extends ReadableStream<infer Part>
    ? Part
    : never;

/**
 * A stand-in for a real AI, for the end-to-end tests only (`LAB_BRAIN_MOCK_AI`
 * outside production): in a chat it reads the project's experiments with a
 * tool, then answers; asked to summarise it returns a fixed summary. It makes
 * no network call, so tests need no key.
 */
export const createMockModel = () =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: '- Mock summary of the document.' }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: USAGE,
      warnings: []
    }),
    doStream: async ({ prompt }) => {
      const hasToolResult = prompt.some(message => message.role === 'tool');
      const finish = (unified: 'stop' | 'tool-calls') => ({
        type: 'finish' as const,
        finishReason: { unified, raw: undefined },
        usage: USAGE
      });

      return {
        stream: simulateReadableStream({
          chunks: (hasToolResult
            ? [
                { type: 'text-start' as const, id: 'mock' },
                {
                  type: 'text-delta' as const,
                  id: 'mock',
                  delta: 'Mock answer from your experiments: Deposition.'
                },
                { type: 'text-end' as const, id: 'mock' },
                finish('stop')
              ]
            : [
                {
                  type: 'tool-call' as const,
                  toolCallId: 'mock-call',
                  toolName: 'listExperiments',
                  input: '{}'
                },
                finish('tool-calls')
              ]) as StreamPart[]
        })
      };
    }
  });
