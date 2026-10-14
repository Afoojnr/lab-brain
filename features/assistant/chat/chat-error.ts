import type { AiErrorKey } from '../ai/ai-errors';

const KEYS: AiErrorKey[] = [
  'notReady',
  'localDisabled',
  'unauthorized',
  'modelNotFound',
  'rateLimited',
  'noCredit',
  'noPrivateProvider',
  'unreachable',
  'timeout',
  'failed'
];

/**
 * Which problem a chat error is. The server answers with a key only (in a JSON
 * body, or as the stream's error text), never the provider's own message.
 */
export const chatErrorKey = (error: Error | undefined): AiErrorKey => {
  const message = error?.message ?? '';
  const direct = KEYS.find(key => key === message);
  if (direct) return direct;
  try {
    const body = JSON.parse(message) as { error?: unknown };
    const nested = KEYS.find(key => key === body.error);
    if (nested) return nested;
  } catch {
    // Not JSON: a network failure or something unexpected.
  }

  return 'failed';
};
