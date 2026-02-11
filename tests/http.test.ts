import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpTransport } from '../src/http.js';
import { FoxnoseAPIError, FoxnoseTransportError } from '../src/errors.js';
import type { FoxnoseConfig } from '../src/config.js';

const baseConfig: FoxnoseConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  userAgent: 'test-agent/1.0',
};

function mockFetch(responses: Array<{ status: number; body?: any; headers?: Record<string, string> }>) {
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
      const fetchMock = mockFetch([
        { status: 500, body: { message: 'Internal error' } },
      ]);
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

  describe('retry logic', () => {
    it('retries on retryable status codes for GET', async () => {
      const fetchMock = mockFetch([
        { status: 503 },
        { status: 200, body: { ok: true } },
      ]);
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
      const fetchMock = mockFetch([
        { status: 503, body: { message: 'Unavailable' } },
      ]);
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

  it('handles non-JSON error response body', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('Plain text error', { status: 500 }),
    );

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
