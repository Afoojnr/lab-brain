import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage
} from 'ai';
import { z } from 'zod';

import {
  getExperimentInProject,
  getProjectById
} from '@/features/experiments/server';
import { listReferencesByProject } from '@/features/references/server';

import { aiErrorKey, type AiErrorKey } from '../ai/ai-errors';
import { buildSystemPrompt } from '../prompts/prompt';
import { createModel } from '../ai/provider';
import { aiSettingsSchema, isAiReady, isLocalAddress } from '../ai/settings';
import { createAssistantTools } from '../tools';
import type { ChatMetadata } from '../types';

/** The most past messages sent with a question, so a long chat never grows the cost without limit. */
export const MAX_HISTORY_MESSAGES = 20;
/** The most tool rounds in one answer. */
export const MAX_TOOL_STEPS = 8;
export const MAX_OUTPUT_TOKENS = 2000;
const MAX_QUESTION_CHARS = 4000;
const MAX_REQUEST_BYTES = 200_000;

export const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1).max(100),
  scope: z.object({
    projectId: z.string().min(1).max(100),
    experimentId: z.string().min(1).max(100).optional()
  }),
  settings: aiSettingsSchema
});

const failure = (key: AiErrorKey, status: number) =>
  Response.json({ error: key }, { status });

const questionLength = (message: unknown): number => {
  const parts = (message as { parts?: { type?: string; text?: string }[] })
    ?.parts;

  return (parts ?? []).reduce(
    (sum, part) => sum + (part.type === 'text' ? (part.text?.length ?? 0) : 0),
    0
  );
};

/**
 * Answers one chat question as a stream. The key in the request is used to
 * build the model for this request only: it is never logged, stored, or put in
 * a response or an error.
 */
export const handleChat = async (
  request: Request,
  options: { model?: LanguageModel } = {}
): Promise<Response> => {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) return failure('failed', 413);

  let body: z.infer<typeof chatRequestSchema>;
  try {
    body = chatRequestSchema.parse(await request.json());
  } catch {
    return failure('failed', 400);
  }

  const { scope, settings } = body;
  if (!options.model) {
    if (!isAiReady(settings)) return failure('notReady', 400);
    if (settings.provider === 'ollama') {
      if (process.env.LAB_BRAIN_DISABLE_LOCAL_AI === 'true')
        return failure('localDisabled', 403);
      if (!isLocalAddress(settings.baseUrl)) return failure('notReady', 400);
    }
  }

  const project = await getProjectById(scope.projectId);
  if (!project) return failure('failed', 404);
  const experiment = scope.experimentId
    ? await getExperimentInProject(scope.projectId, scope.experimentId)
    : undefined;
  if (scope.experimentId && !experiment) return failure('failed', 404);

  const history = body.messages.slice(-MAX_HISTORY_MESSAGES) as UIMessage[];
  if (history.some(message => questionLength(message) > MAX_QUESTION_CHARS))
    return failure('failed', 413);

  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  try {
    modelMessages = await convertToModelMessages(history);
  } catch {
    return failure('failed', 400);
  }

  const references = await listReferencesByProject(scope.projectId);
  const result = streamText({
    model: options.model ?? createModel(settings),
    system: buildSystemPrompt({
      project,
      references,
      experimentName: experiment?.name
    }),
    messages: modelMessages,
    tools: createAssistantTools(scope),
    stopWhen: isStepCount(MAX_TOOL_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: request.signal,
    // The default logs the error, and a provider error can echo request details.
    onError: () => undefined
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: aiErrorKey,
      messageMetadata: ({ part }): ChatMetadata | undefined =>
        part.type === 'finish'
          ? { totalTokens: part.totalUsage.totalTokens }
          : undefined
    })
  });
};
