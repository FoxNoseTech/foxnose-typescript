import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxClient } from '../../src/flux/client.js';
import { SearchMode, buildSearchBody, mergeExtra } from '../../src/flux/models.js';
import type { AuthStrategy, RequestData } from '../../src/auth/types.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Simple pub:sec' };
  },
};

function setupMockFetch(response: any = {}, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(response), { status }));
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

  describe('introspection', () => {
    it('getRouter fetches router catalog', async () => {
      const data = { api: 'v1', routes: [] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.getRouter();

      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toBe('https://env-123.fxns.io/v1/_router');
    });

    it('getSchema fetches folder schema', async () => {
      const data = {
        json_schema: { type: 'object' },
        searchable_fields: ['title'],
        non_searchable_fields: [],
        path: '/v1/articles',
        actions: ['get_many', 'get_one'],
      };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.getSchema('articles');

      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toBe('https://env-123.fxns.io/v1/articles/_schema');
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

  describe('vectorSearch', () => {
    it('sends correct body', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.vectorSearch('articles', { query: 'semantic query', top_k: 5 });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://env-123.fxns.io/v1/articles/_search');
      const body = JSON.parse(init?.body as string);
      expect(body.search_mode).toBe('vector');
      expect(body.vector_search.query).toBe('semantic query');
      expect(body.vector_search.top_k).toBe(5);
      expect(body.vector_field_search).toBeUndefined();
    });

    it('forwards extra body params', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.vectorSearch('articles', {
        query: 'hello',
        sort: '-score',
        where: { category: 'tech' },
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.sort).toBe('-score');
      expect(body.where).toEqual({ category: 'tech' });
    });
  });

  describe('vectorFieldSearch', () => {
    it('sends correct body', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.vectorFieldSearch('articles', {
        field: 'speaker_embedding',
        query_vector: [0.1, 0.2, 0.3],
        similarity_threshold: 0.8,
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.search_mode).toBe('vector');
      expect(body.vector_field_search.field).toBe('speaker_embedding');
      expect(body.vector_field_search.query_vector).toEqual([0.1, 0.2, 0.3]);
      expect(body.vector_field_search.similarity_threshold).toBe(0.8);
    });
  });

  describe('hybridSearch', () => {
    it('sends correct body', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.hybridSearch('articles', {
        query: 'semantic query',
        find_text: { query: 'keyword' },
        vector_weight: 0.7,
        text_weight: 0.3,
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.search_mode).toBe('hybrid');
      expect(body.find_text).toEqual({ query: 'keyword' });
      expect(body.vector_search.query).toBe('semantic query');
      expect(body.hybrid_config.vector_weight).toBe(0.7);
      expect(body.hybrid_config.text_weight).toBe(0.3);
    });
  });

  describe('boostedSearch', () => {
    it('sends correct body with auto-embeddings', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.boostedSearch('articles', {
        find_text: { query: 'keyword' },
        query: 'semantic boost',
        boost_factor: 2.0,
        max_boost_results: 10,
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.search_mode).toBe('vector_boosted');
      expect(body.find_text).toEqual({ query: 'keyword' });
      expect(body.vector_search.query).toBe('semantic boost');
      expect(body.vector_boost_config.boost_factor).toBe(2.0);
    });

    it('sends correct body with custom vector', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.boostedSearch('articles', {
        find_text: { query: 'keyword' },
        field: 'emb',
        query_vector: [0.1, 0.2],
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.vector_field_search.field).toBe('emb');
      expect(body.vector_search).toBeUndefined();
    });

    it('rejects both query and field+vector', async () => {
      const client = createClient();
      setupMockFetch({});
      await expect(
        client.boostedSearch('articles', {
          find_text: { query: 'keyword' },
          query: 'auto',
          field: 'emb',
          query_vector: [0.1],
        }),
      ).rejects.toThrow('not both');
    });

    it('rejects neither query nor field+vector', async () => {
      const client = createClient();
      setupMockFetch({});
      await expect(
        client.boostedSearch('articles', {
          find_text: { query: 'keyword' },
        }),
      ).rejects.toThrow('Provide either');
    });
  });

  describe('default values parity', () => {
    it('vectorSearch defaults top_k to 10', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.vectorSearch('articles', { query: 'hello' });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.vector_search.top_k).toBe(10);
    });

    it('hybridSearch defaults weights and rerank', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.hybridSearch('articles', {
        query: 'hello',
        find_text: { query: 'test' },
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.hybrid_config.vector_weight).toBe(0.6);
      expect(body.hybrid_config.text_weight).toBe(0.4);
      expect(body.hybrid_config.rerank_results).toBe(true);
      expect(body.vector_search.top_k).toBe(10);
    });

    it('boostedSearch defaults boost_factor and max_boost_results', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.boostedSearch('articles', {
        find_text: { query: 'test' },
        query: 'hello',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.vector_boost_config.boost_factor).toBe(1.5);
      expect(body.vector_boost_config.max_boost_results).toBe(20);
      expect(body.vector_search.top_k).toBe(10);
    });
  });

  describe('search backward compatibility', () => {
    it('raw search still works with plain objects', async () => {
      const fetchMock = setupMockFetch({ results: [] });
      const client = createClient();
      await client.search('articles', { find_text: { query: 'old style' }, limit: 5 });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body).toEqual({ find_text: { query: 'old style' }, limit: 5 });
    });
  });
});

// ---------------------------------------------------------------------------
// Vector search models — validation tests
// ---------------------------------------------------------------------------

describe('buildSearchBody', () => {
  it('validates text mode rejects vector configs', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.TEXT,
        vector_search: { query: 'hello' },
      }),
    ).toThrow('not allowed in text');
  });

  it('validates vector mode requires vector config', () => {
    expect(() => buildSearchBody({ search_mode: SearchMode.VECTOR })).toThrow(
      'requires vector_search',
    );
  });

  it('validates mutual exclusion', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello' },
        vector_field_search: { field: 'emb', query_vector: [1.0] },
      }),
    ).toThrow('mutually exclusive');
  });

  it('validates hybrid rejects vector_field_search', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.HYBRID,
        find_text: { query: 'test' },
        vector_field_search: { field: 'emb', query_vector: [1.0] },
      }),
    ).toThrow('not allowed in hybrid');
  });

  it('validates hybrid requires find_text', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.HYBRID,
        vector_search: { query: 'hello' },
      }),
    ).toThrow('requires find_text');
  });

  it('validates vector_boosted requires find_text', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR_BOOSTED,
        vector_search: { query: 'hello' },
        vector_boost_config: {},
      }),
    ).toThrow('requires find_text');
  });

  it('rejects NaN in similarity_threshold', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello', similarity_threshold: NaN },
      }),
    ).toThrow('finite');
  });

  it('rejects empty query_vector', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_field_search: { field: 'emb', query_vector: [] },
      }),
    ).toThrow('must not be empty');
  });

  it('rejects Infinity in query_vector', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_field_search: { field: 'emb', query_vector: [Infinity, 1.0] },
      }),
    ).toThrow('finite');
  });

  it('rejects boost_factor <= 0', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR_BOOSTED,
        find_text: { query: 'test' },
        vector_search: { query: 'hello' },
        vector_boost_config: { boost_factor: 0 },
      }),
    ).toThrow('must be > 0');
  });

  it('rejects weights that dont sum to 1', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.HYBRID,
        find_text: { query: 'test' },
        vector_search: { query: 'hello' },
        hybrid_config: { vector_weight: 0.3, text_weight: 0.3 },
      }),
    ).toThrow('must equal 1.0');
  });

  it('rejects similarity_threshold > 1', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello', similarity_threshold: 1.5 },
      }),
    ).toThrow('between 0.0 and 1.0');
  });

  it('rejects text_weight > 1', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.HYBRID,
        find_text: { query: 'test' },
        vector_search: { query: 'hello' },
        hybrid_config: { vector_weight: 0.4, text_weight: 1.5 },
      }),
    ).toThrow('between 0.0 and 1.0');
  });

  it('rejects vector_weight > 1', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.HYBRID,
        find_text: { query: 'test' },
        vector_search: { query: 'hello' },
        hybrid_config: { vector_weight: 1.5, text_weight: -0.5 },
      }),
    ).toThrow('between 0.0 and 1.0');
  });

  it('text mode rejects vector_field_search', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.TEXT,
        vector_field_search: { field: 'emb', query_vector: [1.0] },
      }),
    ).toThrow('not allowed in text');
  });

  it('text mode rejects boost_config', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.TEXT,
        vector_boost_config: { boost_factor: 1.5 },
      }),
    ).toThrow('not allowed in text');
  });

  it('text mode rejects hybrid_config', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.TEXT,
        hybrid_config: { vector_weight: 0.6, text_weight: 0.4 },
      }),
    ).toThrow('not allowed in text');
  });

  it('vector mode rejects boost_config', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello' },
        vector_boost_config: { boost_factor: 1.5 },
      }),
    ).toThrow('not allowed in vector');
  });

  it('vector mode rejects hybrid_config', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello' },
        hybrid_config: { vector_weight: 0.6, text_weight: 0.4 },
      }),
    ).toThrow('not allowed in vector');
  });

  it('vector_boosted requires vector config', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR_BOOSTED,
        find_text: { query: 'test' },
      }),
    ).toThrow('requires vector_search');
  });

  it('vector_boosted rejects hybrid_config', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR_BOOSTED,
        find_text: { query: 'test' },
        vector_search: { query: 'hello' },
        hybrid_config: { vector_weight: 0.6, text_weight: 0.4 },
      }),
    ).toThrow('not allowed in vector_boosted');
  });

  it('defaults search_mode when omitted', () => {
    const body = buildSearchBody({ find_text: { query: 'test' } });
    expect(body.search_mode).toBe('text');
  });

  it('rejects fractional top_k', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello', top_k: 1.5 },
      }),
    ).toThrow('positive integer');
  });

  it('rejects NaN in top_k', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR,
        vector_search: { query: 'hello', top_k: NaN },
      }),
    ).toThrow('finite');
  });

  it('rejects Infinity in max_boost_results', () => {
    expect(() =>
      buildSearchBody({
        search_mode: SearchMode.VECTOR_BOOSTED,
        find_text: { query: 'test' },
        vector_search: { query: 'hello' },
        vector_boost_config: { max_boost_results: Infinity },
      }),
    ).toThrow('finite');
  });

  it('rejects unknown search_mode', () => {
    expect(() =>
      buildSearchBody({
        search_mode: 'invalid_mode' as any,
        vector_search: { query: 'hello' },
      }),
    ).toThrow('Unknown search_mode');
  });

  it('builds valid vector request', () => {
    const body = buildSearchBody({
      search_mode: SearchMode.VECTOR,
      vector_search: { query: 'hello', top_k: 5 },
      limit: 10,
    });
    expect(body.search_mode).toBe('vector');
    expect(body.vector_search.query).toBe('hello');
    expect(body.limit).toBe(10);
  });

  it('strips undefined values', () => {
    const body = buildSearchBody({
      search_mode: SearchMode.VECTOR,
      vector_search: { query: 'hello' },
      find_text: undefined,
    });
    expect('find_text' in body).toBe(false);
  });
});

describe('mergeExtra', () => {
  it('rejects conflicting keys', () => {
    expect(() => mergeExtra({ search_mode: 'vector' }, { search_mode: 'text' })).toThrow(
      'conflict',
    );
  });

  it('merges non-conflicting keys', () => {
    const result = mergeExtra({ search_mode: 'vector' }, { where: { x: 1 } });
    expect(result).toEqual({ search_mode: 'vector', where: { x: 1 } });
  });
});
