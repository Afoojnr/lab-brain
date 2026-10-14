/** Why the AI could not answer; each is a key under `assistant.errors`. */
export type AiErrorKey =
  | 'notReady'
  | 'localDisabled'
  | 'unauthorized'
  | 'modelNotFound'
  | 'rateLimited'
  | 'noCredit'
  | 'noPrivateProvider'
  | 'unreachable'
  | 'timeout'
  | 'failed';

type ErrorLike = {
  name?: string;
  statusCode?: number;
  responseBody?: string;
  code?: string;
  cause?: { code?: string };
};

/**
 * Which problem an error from the AI provider is, without ever repeating its
 * message (a message can contain part of the key).
 */
export const aiErrorKey = (error: unknown): AiErrorKey => {
  const { name, statusCode, code, cause, responseBody } = (error ??
    {}) as ErrorLike;
  const networkCode = code ?? cause?.code;

  // Anthropic reports an empty balance as a 400; only this fixed phrase is looked for.
  if (statusCode === 400 && /credit balance/i.test(responseBody ?? ''))
    return 'noCredit';
  if (statusCode === 401 || statusCode === 403) return 'unauthorized';
  // OpenRouter says so when the privacy setting leaves a model with no provider.
  if (statusCode === 404 && /data policy/i.test(responseBody ?? ''))
    return 'noPrivateProvider';
  if (statusCode === 404) return 'modelNotFound';
  if (statusCode === 429) return 'rateLimited';
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  if (
    networkCode === 'ECONNREFUSED' ||
    networkCode === 'ENOTFOUND' ||
    networkCode === 'ECONNRESET' ||
    networkCode === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return 'unreachable';
  }

  return 'failed';
};
