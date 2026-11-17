/**
 * File uploads on the Flux client.
 *
 * The payloads mirror delivery-api's api/methods/upload_signature.py and
 * upload_status.py, and core's files/grants.py and files/pipeline/intents.py.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnonymousAuth } from '../../src/auth/anonymous.js';
import type { AuthStrategy, RequestData } from '../../src/auth/types.js';
import {
  FilesQuotaExceededError,
  FoxnoseAPIError,
  FoxnoseTransportError,
  RateLimitExceededError,
} from '../../src/errors.js';
import { FluxClient } from '../../src/flux/client.js';
import type { UploadSignature, UploadStatus } from '../../src/flux/models.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Simple pub:sec' };
  },
};

const PATH = 'tickets/tk_8f2c91/attachments';
const BASE = `https://env-123.fxns.io/support/${PATH}`;
const UPLOAD_ID = 'up_eu1_3f9a0c2e7b';
const AUTH_TOKEN = 'eyJ-upload-token';
const STATUS_TOKEN = 'eu1.status-token';

const GRANT: UploadSignature = {
  publicKey: 'public-key',
  uploadBaseUrl: 'https://upload.foxnose.net',
  authToken: AUTH_TOKEN,
  tokenExpire: 1793450000,
  store: 'auto',
  metadata: { nonce: 'grant-nonce', project: 'prj', env: 'env-123' },
  upload_id: UPLOAD_ID,
  status_token: STATUS_TOKEN,
  rotation: 1,
};

function setupMockFetch(response: any = {}, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(response), { status }));
  globalThis.fetch = fetchMock;
  return fetchMock;
}

function createClient(auth: AuthStrategy = dummyAuth, retryMethods: string[] = []) {
  return new FluxClient({
    baseUrl: 'https://env-123.fxns.io',
    apiPrefix: 'support',
    auth,
    timeout: 1000,
    retryConfig: { attempts: 2, backoffFactor: 0, statusCodes: [], methods: retryMethods },
  });
}

function lastCall(fetchMock: ReturnType<typeof setupMockFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return {
    url,
    method: init.method,
    body: init.body as string | undefined,
    headers: init.headers as Record<string, string>,
  };
}

describe('FluxClient — file uploads', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('createUploadSignature', () => {
    it('sends no body without a session key', async () => {
      const fetchMock = setupMockFetch(GRANT);

      const grant = await createClient().createUploadSignature(`/${PATH}/`);

      expect(grant).toEqual(GRANT);
      const call = lastCall(fetchMock);
      expect(call.url).toBe(`${BASE}/_upload-signature`);
      expect(call.method).toBe('POST');
      expect(call.body).toBeUndefined();
    });

    it('sends the session key', async () => {
      const fetchMock = setupMockFetch(GRANT);
      const sessionKey = 'a'.repeat(43);
      await createClient().createUploadSignature(PATH, { sessionKey });
      expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({ session_key: sessionKey });
    });

    it('is not resent after a dropped connection', async () => {
      const fetchMock = vi.fn(async () => {
        throw new TypeError('connection dropped');
      });
      globalThis.fetch = fetchMock;
      await expect(createClient(dummyAuth, ['POST']).createUploadSignature(PATH)).rejects.toThrow(
        FoxnoseTransportError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('writes the grant to no console', async () => {
      setupMockFetch(GRANT);
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
        vi.spyOn(console, level).mockImplementation(() => undefined),
      );
      await createClient().createUploadSignature(PATH);
      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    });

    it('a quota refusal relayed by Flux carries the code only', async () => {
      setupMockFetch(
        {
          message: 'The upload request was refused',
          error_code: 'files_quota_exceeded',
          detail: null,
        },
        402,
      );
      const error = await createClient()
        .createUploadSignature(PATH)
        .catch((e) => e);
      expect(error).toBeInstanceOf(FilesQuotaExceededError);
      expect(error.reason).toBeUndefined();
    });

    it('surfaces a refusal as an API error', async () => {
      setupMockFetch(
        {
          error_code: 'collection_not_files',
          message: 'This collection does not accept file uploads',
          detail: null,
        },
        422,
      );
      const error = await createClient()
        .createUploadSignature(PATH)
        .catch((e) => e);
      expect(error).toBeInstanceOf(FoxnoseAPIError);
      expect(error.errorCode).toBe('collection_not_files');
    });
  });

  describe('getUploadStatus', () => {
    it.each<[string, UploadStatus]>([
      ['ready', { state: 'ready', record_key: '9d2hX6qPZmL0' }],
      ['processing', { state: 'processing' }],
      ['pending_review', { state: 'pending_review' }],
      ['rejected', { state: 'rejected', public_reason: 'malware' }],
      [
        'several files',
        {
          state: 'processing',
          files: [
            { state: 'ready', record_key: '9d2hX6qPZmL0' },
            { state: 'rejected', public_reason: 'too_large' },
          ],
          remaining: 1,
        },
      ],
    ])('reads %s with a key', async (_name, payload) => {
      const fetchMock = setupMockFetch(payload);

      const status = await createClient().getUploadStatus(PATH, UPLOAD_ID);

      expect(status).toEqual(payload);
      const call = lastCall(fetchMock);
      expect(call.url).toBe(`${BASE}/_uploads/${UPLOAD_ID}`);
      expect(call.method).toBe('GET');
      expect(call.headers['X-Upload-Status-Token']).toBeUndefined();
    });

    it('sends a status token in a header, never in the URL', async () => {
      const payload: UploadStatus = {
        state: 'processing',
        files: [{ state: 'accepted', user_status: 'received', slot: 0 }],
        remaining: 1,
        slots_uploading: [{ slot: 1 }],
      };
      const fetchMock = setupMockFetch(payload);

      const status = await createClient(new AnonymousAuth()).getUploadStatus(PATH, UPLOAD_ID, {
        statusToken: STATUS_TOKEN,
      });

      expect(status).toEqual(payload);
      const call = lastCall(fetchMock);
      expect(call.headers['X-Upload-Status-Token']).toBe(STATUS_TOKEN);
      expect(call.headers.Authorization).toBeUndefined();
      expect(call.url).not.toContain(STATUS_TOKEN);
    });

    it('a miss is a 404', async () => {
      setupMockFetch({ message: 'Not found', error_code: 'not_found', detail: null }, 404);
      const error = await createClient()
        .getUploadStatus(PATH, UPLOAD_ID)
        .catch((e) => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('not_found');
    });

    it('keeps Retry-After on a rate limit', async () => {
      const fetchMock = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ message: 'Rate limit', error_code: 'rate_limited', detail: null }),
            { status: 429, headers: { 'Retry-After': '7' } },
          ),
      );
      globalThis.fetch = fetchMock;
      const error = await createClient()
        .getUploadStatus(PATH, UPLOAD_ID)
        .catch((e) => e);
      expect(error).toBeInstanceOf(RateLimitExceededError);
      expect(error.retryAfter).toBe(7);
    });

    it('keeps an upload id in one path segment', async () => {
      const fetchMock = setupMockFetch({ state: 'processing' });
      await createClient().getUploadStatus(PATH, 'up/../x');
      expect(lastCall(fetchMock).url).toBe(`${BASE}/_uploads/up%2F..%2Fx`);
    });
  });
});
