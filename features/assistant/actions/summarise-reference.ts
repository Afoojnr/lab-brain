'use server';

import { generateText } from 'ai';
import { revalidatePath } from 'next/cache';

import {
  getReference,
  readReferenceText,
  SUMMARY_SOURCE_CHARS,
  updateReference
} from '@/features/references/server';

import { aiErrorKey } from '../ai/ai-errors';
import type { AiErrorKey } from '../ai/ai-errors';
import { createModel } from '../ai/provider';
import { aiSettingsSchema, isAiReady, isLocalAddress } from '../ai/settings';
import {
  coverageNote,
  MAX_SUMMARY_CHARS,
  SUMMARY_SYSTEM_PROMPT
} from '../prompts/summary-text';

const TIMEOUT_MS = 60_000;

/**
 * Writes a short summary of a reference with the user's AI, once, and stores
 * it (they can edit it). Costs tokens only when the button is pressed. The
 * settings are used for this call only and never stored or logged; a failure
 * is a reason, never the provider's message.
 */
export const summariseReferenceAction = async (
  projectId: string,
  referenceId: string,
  settings: unknown
): Promise<{ ok: true } | { ok: false; error: AiErrorKey }> => {
  const parsed = aiSettingsSchema.safeParse(settings);
  if (!parsed.success || !isAiReady(parsed.data)) {
    return { ok: false, error: 'notReady' };
  }
  if (
    parsed.data.provider === 'ollama' &&
    (process.env.LAB_BRAIN_DISABLE_LOCAL_AI === 'true' ||
      !isLocalAddress(parsed.data.baseUrl))
  ) {
    return { ok: false, error: 'localDisabled' };
  }

  const reference = await getReference(projectId, referenceId);
  const text = reference ? await readReferenceText(reference) : null;
  if (!reference || text === null) return { ok: false, error: 'failed' };

  try {
    const result = await generateText({
      model: createModel(parsed.data),
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: `Title: ${reference.title}\n\n<document>\n${text.slice(0, SUMMARY_SOURCE_CHARS)}\n</document>`,
      maxOutputTokens: 700,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const summary = result.text.trim().slice(0, MAX_SUMMARY_CHARS);
    if (summary === '') return { ok: false, error: 'failed' };

    await updateReference(projectId, referenceId, {
      summary: `${summary}${coverageNote(text)}`
    });
    revalidatePath(`/projects/${projectId}`);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: aiErrorKey(error) };
  }
};
