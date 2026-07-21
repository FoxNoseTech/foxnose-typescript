import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpTransport } from '../src/http.js';
import {
  FoxnoseAPIError,
  FoxnoseTransportError,
  SpendCapExceededError,
  PlanExhaustedError,
  PlanLimitExceededError,
  RateLimitExceededError,
} from '../src/errors.js';
import type { FoxnoseConfig } from '../src/config.js';

const baseConfig: FoxnoseConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  userAgent: 'test-agent/1.0',
};

function mockFetch(
  responses: Array<{ status: number; body?: any; headers?: Record<string, string> }>,
) {
  let callIndex = 0;
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    const headersObj = new Headers(resp.headers ?? {});
    return new Response(resp.body !== undefined ? JSON.stringify(resp.body) : null, {
      status: resp.status,
      headers: headersObj,
    });
  });
}

describe('HttpTransport', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('makes a GET request and parses JSON', async () => {
    const fetchMock = mockFetch([{ status: 200, body: { result: 'ok' } }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    const result = await transport.request('GET', '/test');

    expect(result).toEqual({ result: 'ok' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/test');
  });

  it('sends JSON body for POST', async () => {
    const fetchMock = mockFetch([{ status: 201, body: { id: '123' } }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    const result = await transport.request('POST', '/items', {
      jsonBody: { name: 'test' },
    });

    expect(result).toEqual({ id: '123' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"name":"test"}');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('appends query parameters', async () => {
    const fetchMock = mockFetch([{ status: 200, body: [] }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    await transport.request('GET', '/items', {
      params: { page: 2, limit: 10 },
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('returns null for empty response body', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    const result = await transport.request('DELETE', '/item/1');

    expect(result).toBeNull();
  });

  it('returns raw Response when parseJson is false', async () => {
    const fetchMock = mockFetch([{ status: 200, body: { data: 'test' } }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    const result = await transport.request('GET', '/test', { parseJson: false });

    expect(result).toBeInstanceOf(Response);
  });

  it('returns text for non-JSON response', async () => {
    const fetchMock = vi.fn(async () => new Response('plain text', { status: 200 }));
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    const result = await transport.request('GET', '/test');

    expect(result).toBe('plain text');
  });

  it('sets User-Agent header', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    await transport.request('GET', '/test');

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('test-agent/1.0');
  });

  it('applies default headers', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({
      config: { ...baseConfig, defaultHeaders: { 'X-Custom': 'header-val' } },
    });
    await transport.request('GET', '/test');

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['X-Custom']).toBe('header-val');
  });

  it('per-call headers override default headers', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({
      config: { ...baseConfig, defaultHeaders: { 'X-Key': 'default' } },
    });
    await transport.request('GET', '/test', {
      headers: { 'X-Key': 'override' },
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['X-Key']).toBe('override');
  });

  it('applies auth headers', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const auth = {
      buildHeaders: () => ({ Authorization: 'Bearer tok' }),
    };
    const transport = new HttpTransport({ config: baseConfig, auth });
    await transport.request('GET', '/test');

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tok');
  });

  describe('error handling', () => {
    it('throws FoxnoseAPIError on 4xx', async () => {
      const fetchMock = mockFetch([
        {
          status: 404,
          body: { message: 'Not found', error_code: 'resource_not_found' },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
      });

      await expect(transport.request('GET', '/missing')).rejects.toThrow(FoxnoseAPIError);

      try {
        await transport.request('GET', '/missing');
      } catch (err) {
        const apiErr = err as FoxnoseAPIError;
        expect(apiErr.statusCode).toBe(404);
        expect(apiErr.errorCode).toBe('resource_not_found');
      }
    });

    it('throws FoxnoseAPIError on 5xx (no retry for POST)', async () => {
      const fetchMock = mockFetch([{ status: 500, body: { message: 'Internal error' } }]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      await expect(transport.request('POST', '/action')).rejects.toThrow(FoxnoseAPIError);
    });

    it('throws FoxnoseTransportError on network failure', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('Connection refused');
      });

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
      });

      await expect(transport.request('GET', '/test')).rejects.toThrow(FoxnoseTransportError);
    });
  });

  describe('billing error mapping', () => {
    it('maps 402 spend_cap_reached to SpendCapExceededError without retrying', async () => {
      const fetchMock = mockFetch([
        {
          status: 402,
          body: {
            error_code: 'spend_cap_reached',
            cap_usd: 25,
            cycle_resets_at: '2026-08-01T00:00:00Z',
            raise_cap_url: 'https://foxnose.net/billing/cap',
          },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      let caught: unknown;
      try {
        await transport.request('GET', '/resources');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(SpendCapExceededError);
      expect(caught).toBeInstanceOf(FoxnoseAPIError);
      const capErr = caught as SpendCapExceededError;
      expect(capErr.statusCode).toBe(402);
      expect(capErr.capUsd).toBe(25);
      expect(capErr.cycleResetsAt).toBe('2026-08-01T00:00:00Z');
      expect(capErr.raiseCapUrl).toBe('https://foxnose.net/billing/cap');
      // 402 bodies carry no `message`, so the default is used (not the raw JSON).
      expect(capErr.message).toContain('Spend cap reached');
      // 402 is not a retryable status.
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('maps 402 plan_exhausted to PlanExhaustedError', async () => {
      const fetchMock = mockFetch([
        {
          status: 402,
          body: {
            error_code: 'plan_exhausted',
            axis: 'writes',
            window_resets_at: '2026-08-01T00:00:00Z',
            upgrade_url: 'https://foxnose.net/billing/upgrade',
          },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      let caught: unknown;
      try {
        await transport.request('GET', '/resources');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(PlanExhaustedError);
      const planErr = caught as PlanExhaustedError;
      expect(planErr.axis).toBe('writes');
      expect(planErr.windowResetsAt).toBe('2026-08-01T00:00:00Z');
      expect(planErr.upgradeUrl).toBe('https://foxnose.net/billing/upgrade');
      expect(planErr.message).toContain('Plan allowance exhausted');
    });

    it('maps 403 plan_limit_exceeded to PlanLimitExceededError from detail', async () => {
      const fetchMock = mockFetch([
        {
          status: 403,
          body: {
            message: 'Plan limit exceeded',
            error_code: 'plan_limit_exceeded',
            detail: {
              entity: 'collections',
              current: 10,
              limit: 10,
              upgrade_url: 'https://foxnose.net/billing/upgrade',
            },
          },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      let caught: unknown;
      try {
        await transport.request('GET', '/collections');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(PlanLimitExceededError);
      const limitErr = caught as PlanLimitExceededError;
      expect(limitErr.entity).toBe('collections');
      expect(limitErr.current).toBe(10);
      expect(limitErr.limit).toBe(10);
      expect(limitErr.upgradeUrl).toBe('https://foxnose.net/billing/upgrade');
    });

    it('maps 403 plan_limit_exceeded with no upgrade_url', async () => {
      const fetchMock = mockFetch([
        {
          status: 403,
          body: {
            message: 'Plan limit exceeded',
            error_code: 'plan_limit_exceeded',
            detail: { entity: 'environments', current: 3, limit: 3 },
          },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      let caught: unknown;
      try {
        await transport.request('GET', '/environments');
      } catch (err) {
        caught = err;
      }
      const limitErr = caught as PlanLimitExceededError;
      expect(limitErr).toBeInstanceOf(PlanLimitExceededError);
      expect(limitErr.entity).toBe('environments');
      expect(limitErr.current).toBe(3);
      expect(limitErr.limit).toBe(3);
      expect(limitErr.upgradeUrl).toBeUndefined();
    });

    it('maps 429 rate_limited on POST immediately with parsed Retry-After', async () => {
      const fetchMock = mockFetch([
        {
          status: 429,
          body: { error_code: 'rate_limited', message: 'Rate limit exceeded' },
          headers: { 'Retry-After': '12' },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      let caught: unknown;
      try {
        await transport.request('POST', '/items', { jsonBody: { name: 'x' } });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(RateLimitExceededError);
      expect((caught as RateLimitExceededError).retryAfter).toBe(12);
      // POST is not retried by default.
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('retries 429 rate_limited on GET then throws RateLimitExceededError', async () => {
      const fetchMock = mockFetch([
        { status: 429, body: { error_code: 'rate_limited', message: 'Rate limit exceeded' } },
        { status: 429, body: { error_code: 'rate_limited', message: 'Rate limit exceeded' } },
        {
          status: 429,
          body: { error_code: 'rate_limited', message: 'Rate limit exceeded' },
          headers: { 'Retry-After': '5' },
        },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: { attempts: 3, backoffFactor: 0, statusCodes: [429], methods: ['GET'] },
      });

      let caught: unknown;
      try {
        await transport.request('GET', '/resources');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(RateLimitExceededError);
      expect((caught as RateLimitExceededError).retryAfter).toBe(5);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('keeps unknown codes on mapped statuses as generic FoxnoseAPIError', async () => {
      const fetchMock = mockFetch([{ status: 402, body: { error_code: 'something_new' } }]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({ config: baseConfig });

      let caught: unknown;
      try {
        await transport.request('GET', '/resources');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(FoxnoseAPIError);
      expect((caught as FoxnoseAPIError).constructor).toBe(FoxnoseAPIError);
      expect(caught).not.toBeInstanceOf(SpendCapExceededError);

      const fetchMock2 = mockFetch([{ status: 429, body: { error_code: 'insufficient_units' } }]);
      globalThis.fetch = fetchMock2;

      let caught2: unknown;
      try {
        await transport.request('POST', '/items', { jsonBody: {} });
      } catch (err) {
        caught2 = err;
      }
      expect((caught2 as FoxnoseAPIError).constructor).toBe(FoxnoseAPIError);
      expect(caught2).not.toBeInstanceOf(RateLimitExceededError);
    });

    it('falls through to generic FoxnoseAPIError for malformed bodies on mapped statuses', async () => {
      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
      });

      // Bare JSON string body.
      globalThis.fetch = vi.fn(async () => new Response('"just a string"', { status: 402 }));
      let caught: unknown;
      try {
        await transport.request('POST', '/x', { jsonBody: {} });
      } catch (err) {
        caught = err;
      }
      expect((caught as FoxnoseAPIError).constructor).toBe(FoxnoseAPIError);

      // JSON null body.
      globalThis.fetch = vi.fn(async () => new Response('null', { status: 429 }));
      let caught2: unknown;
      try {
        await transport.request('POST', '/x', { jsonBody: {} });
      } catch (err) {
        caught2 = err;
      }
      expect((caught2 as FoxnoseAPIError).constructor).toBe(FoxnoseAPIError);

      // JSON array body.
      globalThis.fetch = vi.fn(async () => new Response('[1,2,3]', { status: 402 }));
      let caught3: unknown;
      try {
        await transport.request('POST', '/x', { jsonBody: {} });
      } catch (err) {
        caught3 = err;
      }
      expect((caught3 as FoxnoseAPIError).constructor).toBe(FoxnoseAPIError);
    });
  });

  describe('retry logic', () => {
    it('retries on retryable status codes for GET', async () => {
      const fetchMock = mockFetch([{ status: 503 }, { status: 200, body: { ok: true } }]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: {
          attempts: 3,
          backoffFactor: 0,
          statusCodes: [503],
          methods: ['GET'],
        },
      });

      const result = await transport.request('GET', '/test');
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry POST by default', async () => {
      const fetchMock = mockFetch([{ status: 503, body: { message: 'Unavailable' } }]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: {
          attempts: 3,
          backoffFactor: 0,
          statusCodes: [503],
          methods: ['GET'],
        },
      });

      await expect(transport.request('POST', '/test')).rejects.toThrow(FoxnoseAPIError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('respects Retry-After header', async () => {
      const fetchMock = mockFetch([
        { status: 429, headers: { 'Retry-After': '0' } },
        { status: 200, body: { ok: true } },
      ]);
      globalThis.fetch = fetchMock;

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: {
          attempts: 3,
          backoffFactor: 0,
          statusCodes: [429],
          methods: ['GET'],
        },
      });

      const result = await transport.request('GET', '/test');
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries on transport error', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Connection reset');
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: {
          attempts: 3,
          backoffFactor: 0,
          statusCodes: [],
          methods: ['GET'],
        },
      });

      const result = await transport.request('GET', '/test');
      expect(result).toEqual({ ok: true });
    });

    it('exhausts retries and throws FoxnoseTransportError', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('Always fails');
      });

      const transport = new HttpTransport({
        config: baseConfig,
        retryConfig: {
          attempts: 2,
          backoffFactor: 0,
          statusCodes: [],
          methods: ['GET'],
        },
      });

      await expect(transport.request('GET', '/test')).rejects.toThrow(FoxnoseTransportError);
    });
  });

  it('close is a no-op', () => {
    const transport = new HttpTransport({ config: baseConfig });
    expect(() => transport.close()).not.toThrow();
  });

  it('skips null and undefined params', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    await transport.request('GET', '/test', {
      params: { a: 'yes', b: null, c: undefined, d: 0 },
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('a=yes');
    expect(url).toContain('d=0');
    expect(url).not.toContain('b=');
    expect(url).not.toContain('c=');
  });

  it('signing path filters null/undefined params same as URL', async () => {
    let capturedPath = '';
    const auth = {
      buildHeaders: (req: any) => {
        capturedPath = req.path;
        return {};
      },
    };
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig, auth });
    await transport.request('GET', '/test', {
      params: { a: 'yes', b: null, c: undefined },
    });

    expect(capturedPath).toBe('/test?a=yes');
    expect(capturedPath).not.toContain('null');
    expect(capturedPath).not.toContain('undefined');
  });

  it('handles non-JSON error response body', async () => {
    globalThis.fetch = vi.fn(async () => new Response('Plain text error', { status: 500 }));

    const transport = new HttpTransport({
      config: baseConfig,
      retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
    });

    try {
      await transport.request('POST', '/test');
    } catch (err) {
      const apiErr = err as FoxnoseAPIError;
      expect(apiErr.statusCode).toBe(500);
      expect(apiErr.responseBody).toBe('Plain text error');
    }
  });

  it('handles error response with empty body', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 400 }));

    const transport = new HttpTransport({
      config: baseConfig,
      retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
    });

    try {
      await transport.request('GET', '/test');
    } catch (err) {
      const apiErr = err as FoxnoseAPIError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.message).toContain('API request failed');
    }
  });

  it('sends binary content', async () => {
    const fetchMock = mockFetch([{ status: 200, body: { ok: true } }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    const content = new TextEncoder().encode('binary data');
    await transport.request('POST', '/upload', { content });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toEqual(content);
  });

  it('does not retry transport errors for non-retryable methods', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('Connection reset');
    });

    const transport = new HttpTransport({
      config: baseConfig,
      retryConfig: {
        attempts: 3,
        backoffFactor: 0,
        statusCodes: [],
        methods: ['GET'],
      },
    });

    await expect(transport.request('POST', '/test')).rejects.toThrow(FoxnoseTransportError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles transport error with non-Error thrown', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw 'string-error';
    });

    const transport = new HttpTransport({
      config: baseConfig,
      retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
    });

    await expect(transport.request('GET', '/test')).rejects.toThrow(FoxnoseTransportError);
  });

  it('handles no params in buildUrl', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = fetchMock;

    const transport = new HttpTransport({ config: baseConfig });
    await transport.request('GET', '/test');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/test');
    expect(url).not.toContain('?');
  });
});
