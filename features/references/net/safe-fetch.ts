import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';

import {
  LINK_TIMEOUT_MS,
  MAX_LINK_BYTES,
  MAX_REDIRECTS
} from '../config/limits';
import { isPrivateAddress } from './is-private-address';

/** Why a link could not be read; each is a key the app translates. */
export type LinkRefusalReason =
  | 'invalid'
  | 'blocked'
  | 'failed'
  | 'tooLarge'
  | 'timeout'
  | 'tooManyRedirects';

export class LinkRefusal extends Error {
  constructor(readonly reason: LinkRefusalReason) {
    super(reason);
  }
}

export type SafeFetchResult = {
  /** The address that was finally read, after redirects. */
  url: string;
  contentType: string;
  bytes: Uint8Array;
};

type SafeFetchOptions = {
  /** Decides whether an address may be connected to. Only tests replace it. */
  isAllowedAddress?: (address: string) => boolean;
  timeoutMs?: number;
  maxBytes?: number;
};

/**
 * Turns what the user pasted into an address to read: a web address as it is,
 * a DOI (`10.1000/xyz` or `doi:10.1000/xyz`) into its doi.org address.
 *
 * @param input - The pasted text.
 * @returns The address, or null when it is neither.
 */
export const normalizeLinkInput = (input: string): string | null => {
  const text = input.trim();
  const doi = /^(?:doi:\s*)?(10\.\d{4,9}\/\S+)$/i.exec(text);
  if (doi) return `https://doi.org/${doi[1]}`;

  try {
    const url = new URL(text);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const bareHost = (hostname: string) => hostname.replace(/^\[|\]$/g, '');

/**
 * Reads a web address from the server for a reference, and refuses what could
 * hurt: only http and https; never an address inside a private network or on
 * the server itself (checked on the address actually connected to, so a name
 * that later points somewhere private is caught too); each redirect checked the
 * same way; a time limit and a size limit.
 *
 * @param address - The address to read.
 * @param options - Limits; the defaults are the app's. Only tests change them.
 * @throws {LinkRefusal} With the reason, when the link cannot be read.
 */
export const safeFetch = async (
  address: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> => {
  const isAllowed =
    options.isAllowedAddress ??
    ((candidate: string) => !isPrivateAddress(candidate));
  const maxBytes = options.maxBytes ?? MAX_LINK_BYTES;
  const signal = AbortSignal.timeout(options.timeoutMs ?? LINK_TIMEOUT_MS);

  let current: URL;
  try {
    current = new URL(address);
  } catch {
    throw new LinkRefusal('invalid');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (current.protocol !== 'http:' && current.protocol !== 'https:') {
      throw new LinkRefusal('invalid');
    }
    // An IP address written in the link is not looked up, so it is judged here.
    const literal = bareHost(current.hostname);
    if (isIP(literal) !== 0 && !isAllowed(literal)) {
      throw new LinkRefusal('blocked');
    }

    const response = await get(current, isAllowed, signal);
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400) {
      const location = response.headers.location;
      if (!location) throw new LinkRefusal('failed');
      try {
        current = new URL(location, current);
      } catch {
        throw new LinkRefusal('invalid');
      }
      continue;
    }
    if (status < 200 || status >= 300) {
      throw new LinkRefusal('failed');
    }

    const declared = Number(response.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      response.destroy();
      throw new LinkRefusal('tooLarge');
    }

    return {
      url: current.toString(),
      contentType: String(response.headers['content-type'] ?? ''),
      bytes: await readBody(response, maxBytes, signal)
    };
  }

  throw new LinkRefusal('tooManyRedirects');
};

const get = (
  url: URL,
  isAllowed: (address: string) => boolean,
  signal: AbortSignal
): Promise<http.IncomingMessage> =>
  new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      url,
      {
        method: 'GET',
        signal,
        headers: {
          'user-agent': 'LabBrain/1.0 (reading a reference you added)',
          accept: 'text/html,application/pdf;q=0.9,*/*;q=0.1'
        },
        // The check happens on the address the connection really uses.
        lookup: (hostname, lookupOptions, callback) => {
          dns.lookup(hostname, { all: true }, (error, addresses) => {
            if (error) return callback(error, '', 4);
            if (addresses.some(item => !isAllowed(item.address))) {
              return callback(new LinkRefusal('blocked'), '', 4);
            }

            if (lookupOptions.all) {
              return (
                callback as unknown as (
                  error: null,
                  all: dns.LookupAddress[]
                ) => void
              )(null, addresses);
            }

            return callback(null, addresses[0].address, addresses[0].family);
          });
        }
      },
      resolve
    );
    request.on('error', error => {
      if (error instanceof LinkRefusal) return reject(error);
      reject(
        signal.aborted ? new LinkRefusal('timeout') : new LinkRefusal('failed')
      );
    });
    request.end();
  });

const readBody = (
  response: http.IncomingMessage,
  maxBytes: number,
  signal: AbortSignal
): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    response.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        response.destroy();
        return reject(new LinkRefusal('tooLarge'));
      }
      chunks.push(chunk);
    });
    response.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    response.on('error', () =>
      reject(new LinkRefusal(signal.aborted ? 'timeout' : 'failed'))
    );
    response.on('close', () => {
      if (!response.complete) {
        reject(new LinkRefusal(signal.aborted ? 'timeout' : 'failed'));
      }
    });
  });
