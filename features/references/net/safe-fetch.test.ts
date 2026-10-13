import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LinkRefusal, normalizeLinkInput, safeFetch } from './safe-fetch';

let server: http.Server;
let base: string;
// Tests talk to a server on this computer, so loopback is allowed for them
// only; every other private address stays refused.
const allowLoopback = (address: string) => address === '127.0.0.1';

beforeAll(async () => {
  server = http.createServer((request, response) => {
    const url = request.url ?? '/';
    if (url === '/page') {
      response.setHeader('content-type', 'text/html');
      response.end('<p>hello</p>');
    } else if (url === '/redirect') {
      response.writeHead(302, { location: '/page' }).end();
    } else if (url === '/loop') {
      response.writeHead(302, { location: '/loop' }).end();
    } else if (url === '/metadata') {
      response
        .writeHead(302, { location: 'http://169.254.169.254/latest' })
        .end();
    } else if (url === '/big') {
      response.setHeader('content-type', 'text/plain');
      response.write('x'.repeat(2000));
      response.end('y'.repeat(2000));
    } else if (url === '/missing') {
      response.writeHead(404).end('no');
    } else if (url === '/slow') {
      // never answers
    } else {
      response.writeHead(500).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

const reason = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 'no error';
  } catch (error) {
    return error instanceof LinkRefusal ? error.reason : String(error);
  }
};

describe('safeFetch', () => {
  it('reads a page and returns its type and bytes', async () => {
    const result = await safeFetch(`${base}/page`, {
      isAllowedAddress: allowLoopback
    });

    expect(result.contentType).toBe('text/html');
    expect(new TextDecoder().decode(result.bytes)).toBe('<p>hello</p>');
  });

  it('follows a redirect and reports the final address', async () => {
    const result = await safeFetch(`${base}/redirect`, {
      isAllowedAddress: allowLoopback
    });

    expect(result.url).toBe(`${base}/page`);
  });

  it('refuses this computer by default, with no test override', async () => {
    expect(await reason(safeFetch(`${base}/page`))).toBe('blocked');
    expect(await reason(safeFetch('http://localhost:1/'))).toBe('blocked');
  });

  it('refuses a redirect to a private address, such as a cloud metadata service', async () => {
    expect(
      await reason(
        safeFetch(`${base}/metadata`, { isAllowedAddress: allowLoopback })
      )
    ).toBe('blocked');
  });

  it('refuses schemes other than http and https', async () => {
    expect(await reason(safeFetch('file:///etc/passwd'))).toBe('invalid');
    expect(await reason(safeFetch('ftp://example.com/a'))).toBe('invalid');
    expect(await reason(safeFetch('not a url'))).toBe('invalid');
  });

  it('gives up on a redirect loop', async () => {
    expect(
      await reason(
        safeFetch(`${base}/loop`, { isAllowedAddress: allowLoopback })
      )
    ).toBe('tooManyRedirects');
  });

  it('refuses more bytes than the limit, while reading', async () => {
    expect(
      await reason(
        safeFetch(`${base}/big`, {
          isAllowedAddress: allowLoopback,
          maxBytes: 3000
        })
      )
    ).toBe('tooLarge');
  });

  it('reports a page that is not there, and one that never answers', async () => {
    expect(
      await reason(
        safeFetch(`${base}/missing`, { isAllowedAddress: allowLoopback })
      )
    ).toBe('failed');
    expect(
      await reason(
        safeFetch(`${base}/slow`, {
          isAllowedAddress: allowLoopback,
          timeoutMs: 200
        })
      )
    ).toBe('timeout');
  });
});

describe('normalizeLinkInput', () => {
  it('keeps a web address, and turns a DOI into its doi.org address', () => {
    expect(normalizeLinkInput(' https://example.com/paper ')).toBe(
      'https://example.com/paper'
    );
    expect(normalizeLinkInput('10.1016/j.apsusc.2020.146190')).toBe(
      'https://doi.org/10.1016/j.apsusc.2020.146190'
    );
    expect(normalizeLinkInput('doi: 10.1016/j.apsusc.2020.146190')).toBe(
      'https://doi.org/10.1016/j.apsusc.2020.146190'
    );
  });

  it('refuses anything else', () => {
    expect(normalizeLinkInput('file:///etc/passwd')).toBeNull();
    expect(normalizeLinkInput('javascript:alert(1)')).toBeNull();
    expect(normalizeLinkInput('some words')).toBeNull();
    expect(normalizeLinkInput('')).toBeNull();
  });
});
