import { isToolUIPart } from 'ai';
import type { UIMessage } from 'ai';
import { z } from 'zod';

const sourcesSchema = z.object({
  sources: z.array(z.object({ label: z.string(), path: z.string() }))
});

export type ChatSource = { label: string; path: string };

/** An app page the assistant may link to; anything else is not shown as a source. */
const isAppPath = (path: string) =>
  path.startsWith('/') && !path.startsWith('//');

/**
 * The records an answer is based on: the ones its tools returned that the
 * answer names (by label) or links to.
 */
export const collectSources = (parts: UIMessage['parts']): ChatSource[] => {
  const answer = parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
    .toLowerCase();
  const isUsed = (source: ChatSource) =>
    answer.includes(source.label.toLowerCase()) ||
    answer.includes(source.path.toLowerCase());

  const found = new Map<string, ChatSource>();
  for (const part of parts) {
    if (!isToolUIPart(part) || part.state !== 'output-available') continue;
    const parsed = sourcesSchema.safeParse(part.output);
    if (!parsed.success) continue;
    for (const source of parsed.data.sources)
      if (isAppPath(source.path) && isUsed(source) && !found.has(source.path))
        found.set(source.path, source);
  }

  return [...found.values()];
};

/**
 * Whether an answer was written without reading any record: no lookup was
 * made, so nothing in it comes from the user's data.
 */
export const isWithoutRecords = (parts: UIMessage['parts']): boolean =>
  parts.some(part => part.type === 'text' && part.text.trim() !== '') &&
  !parts.some(part => isToolUIPart(part) && part.state === 'output-available');
