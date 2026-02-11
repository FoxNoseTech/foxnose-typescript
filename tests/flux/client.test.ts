import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxClient } from '../../src/flux/client.js';
import type { AuthStrategy, RequestData } from '../../src/auth/types.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Simple pub:sec' };
  },
};

function setupMockFetch(response: any = {}, status = 200) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(response), { status }),
  );
  globalThis.fetch = fetchMock;
  return fetchMock;
}

function createClient() {
  return new FluxClient({
    baseUrl: 'https://env-123.fxns.io',
    apiPrefix: 'v1',
    auth: dummyAuth,
    timeout: 1000,
    retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
  });
}

describe('FluxClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('cleans api prefix', () => {
      const client = new FluxClient({
        baseUrl: 'https://test.fxns.io',
        apiPrefix: '/v2/',
        auth: dummyAuth,
      });
      expect(client.apiPrefix).toBe('v2');
    });

    it('throws on empty apiPrefix', () => {
      expect(
        () =>
          new FluxClient({
            baseUrl: 'https://test.fxns.io',
            apiPrefix: '',
            auth: dummyAuth,
          }),
      ).toThrow('apiPrefix cannot be empty');
    });

    it('throws on blank apiPrefix', () => {
      expect(
        () =>
          new FluxClient({
            baseUrl: 'https://test.fxns.io',
            apiPrefix: '///',
            auth: dummyAuth,
          }),
      ).toThrow('apiPrefix cannot be empty');
    });
  });

  describe('listResources', () => {
    it('fetches resources from folder path', async () => {
      const data = { limit: 100, next: null, previous: null, results: [{ _sys: { key: 'r1' } }] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.listResources('articles');

      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toBe('https://env-123.fxns.io/v1/articles');
    });

    it('normalizes folder path with slashes', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.listResources('/blog/articles/');

      expect(fetchMock.mock.calls[0][0]).toBe('https://env-123.fxns.io/v1/blog/articles');
    });

    it('passes query params', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.listResources('articles', { limit: 10, populate: 'author' });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
      expect(url).toContain('populate=author');
    });
  });

  describe('getResource', () => {
    it('fetches a single resource', async () => {
      const resource = { _sys: { key: 'r1' }, data: { title: 'Hello' } };
      const fetchMock = setupMockFetch(resource);
      const client = createClient();
      const result = await client.getResource('articles', 'r1');

      expect(result).toEqual(resource);
      expect(fetchMock.mock.calls[0][0]).toBe('https://env-123.fxns.io/v1/articles/r1');
    });

    it('passes query params', async () => {
      const fetchMock = setupMockFetch({});
      const client = createClient();
      await client.getResource('articles', 'r1', { populate: 'category' });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('populate=category');
    });
  });

  describe('search', () => {
    it('posts search query', async () => {
      const data = { results: [{ _sys: { key: 'r1' } }] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const body = { where: { title: { $eq: 'Hello' } }, limit: 10 };
      const result = await client.search('articles', body);

      expect(result).toEqual(data);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://env-123.fxns.io/v1/articles/_search');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(body);
    });
  });

  describe('close', () => {
    it('does not throw', () => {
      const client = createClient();
      expect(() => client.close()).not.toThrow();
    });
  });

  describe('auth integration', () => {
    it('sends auth headers', async () => {
      const fetchMock = setupMockFetch({});
      const client = createClient();
      await client.listResources('articles');

      const [, init] = fetchMock.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Simple pub:sec');
    });
  });
});
