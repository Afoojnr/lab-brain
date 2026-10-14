'use server';

import { generateText } from 'ai';

import { aiErrorKey } from '../ai/ai-errors';
import type { AiErrorKey } from '../ai/ai-errors';
import { createModel } from '../ai/provider';
import { aiSettingsSchema, isAiReady, isLocalAddress } from '../ai/settings';

const TIMEOUT_MS = 20_000;

/**
 * Sends one tiny message with the user's settings to see whether the key, the
 * model and the address work. The settings are used for this call only and are
 * never stored or logged; a failure is reported as a reason, never as the
 * provider's message.
 */
export const testAiConnectionAction = async (
  input: unknown
): Promise<{ ok: true } | { ok: false; error: AiErrorKey }> => {
  const parsed = aiSettingsSchema.safeParse(input);
  if (!parsed.success || !isAiReady(parsed.data)) {
    return { ok: false, error: 'notReady' };
  }

  const settings = parsed.data;
  if (settings.provider === 'ollama') {
    if (
      process.env.LAB_BRAIN_DISABLE_LOCAL_AI === 'true' ||
      !isLocalAddress(settings.baseUrl)
    ) {
      return { ok: false, error: 'localDisabled' };
    }
  }

  try {
    await generateText({
      model: createModel(settings),
      prompt: 'Reply with the single word OK.',
      maxOutputTokens: 16,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS)
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: aiErrorKey(error) };
  }
};
