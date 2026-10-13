import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { chatErrorKey } from './chat-error';
import { collectSources, isWithoutRecords } from './chat-sources';

const toolPart = (state: string, output: unknown, id = 'c1') =>
  ({
    type: 'tool-findSamples',
    toolCallId: id,
    state,
    input: {},
    output
  }) as unknown as UIMessage['parts'][number];

describe('collectSources', () => {
  it('lists each record once, in the order it was read', () => {
    const parts = [
      toolPart('output-available', {
        sources: [
          { label: 'ALD001', path: '/projects/p/experiments/e/samples/a' },
          { label: 'ALD002', path: '/projects/p/experiments/e/samples/b' }
        ]
      }),
      {
        type: 'text',
        text: 'ALD001 and ALD002 differ.'
      } as UIMessage['parts'][number],
      toolPart(
        'output-available',
        {
          sources: [
            { label: 'ALD001', path: '/projects/p/experiments/e/samples/a' }
          ]
        },
        'c2'
      )
    ];

    expect(collectSources(parts).map(source => source.label)).toEqual([
      'ALD001',
      'ALD002'
    ]);
  });

  it('ignores unfinished tools, results with no sources, and paths outside the app', () => {
    expect(
      collectSources([
        toolPart('input-available', undefined),
        toolPart('output-available', { error: 'No column' }),
        toolPart('output-available', {
          sources: [
            { label: 'Evil', path: 'https://example.com' },
            { label: 'Evil2', path: '//example.com/x' }
          ]
        })
      ])
    ).toEqual([]);
  });
});

describe('collectSources: only what the answer uses', () => {
  const text = (value: string) =>
    ({ type: 'text', text: value }) as UIMessage['parts'][number];
  const lookup = toolPart('output-available', {
    sources: [
      { label: 'ALD001', path: '/projects/p/experiments/e/samples/a' },
      { label: 'ALD002', path: '/projects/p/experiments/e/samples/b' },
      { label: 'ALD003', path: '/projects/p/experiments/e/samples/c' }
    ]
  });

  it('drops records the lookup returned but the answer never mentions', () => {
    const sources = collectSources([lookup, text('ALD002 is the highest.')]);

    expect(sources.map(source => source.label)).toEqual(['ALD002']);
  });

  it('keeps a record the answer links to by its address', () => {
    const sources = collectSources([
      lookup,
      text('See [the run](/projects/p/experiments/e/samples/c).')
    ]);

    expect(sources.map(source => source.label)).toEqual(['ALD003']);
  });
});

describe('isWithoutRecords', () => {
  it('flags an answer written with no lookup, not one with a lookup or with no text', () => {
    const text = {
      type: 'text',
      text: 'Trust me.'
    } as UIMessage['parts'][number];

    expect(isWithoutRecords([text])).toBe(true);
    expect(
      isWithoutRecords([toolPart('output-available', { sources: [] }), text])
    ).toBe(false);
    expect(isWithoutRecords([])).toBe(false);
  });
});

describe('chatErrorKey', () => {
  it('reads the key from a stream error or a JSON body', () => {
    expect(chatErrorKey(new Error('unauthorized'))).toBe('unauthorized');
    expect(chatErrorKey(new Error('{"error":"notReady"}'))).toBe('notReady');
  });

  it('never passes on an unknown message', () => {
    expect(chatErrorKey(new Error('Invalid key sk-123'))).toBe('failed');
    expect(chatErrorKey(undefined)).toBe('failed');
  });
});
