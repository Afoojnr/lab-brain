import { describe, expect, it } from 'vitest';

import { aiErrorKey } from './ai-errors';

describe('aiErrorKey', () => {
  it.each([
    [{ statusCode: 401 }, 'unauthorized'],
    [{ statusCode: 403 }, 'unauthorized'],
    [{ statusCode: 404 }, 'modelNotFound'],
    [{ statusCode: 429 }, 'rateLimited'],
    [
      { statusCode: 400, responseBody: 'Your credit balance is too low' },
      'noCredit'
    ],
    [{ statusCode: 400, responseBody: 'something else' }, 'failed'],
    [
      {
        statusCode: 404,
        responseBody:
          'No endpoints found matching your data policy (Zero data retention).'
      },
      'noPrivateProvider'
    ],
    [{ statusCode: 404, responseBody: 'model not found' }, 'modelNotFound'],
    [{ name: 'TimeoutError' }, 'timeout'],
    [{ name: 'AbortError' }, 'timeout'],
    [{ cause: { code: 'ECONNREFUSED' } }, 'unreachable'],
    [{ code: 'ENOTFOUND' }, 'unreachable'],
    [{ statusCode: 500 }, 'failed'],
    [new Error('boom'), 'failed'],
    [null, 'failed'],
    ['text', 'failed']
  ])('reads %j as %s', (error, key) => {
    expect(aiErrorKey(error)).toBe(key);
  });

  it('never repeats the error message, which could contain part of a key', () => {
    const key = aiErrorKey({
      statusCode: 401,
      message: 'Invalid key sk-secret-123'
    });

    expect(key).toBe('unauthorized');
    expect(key).not.toContain('sk-');
  });
});
