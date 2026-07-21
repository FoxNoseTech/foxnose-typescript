/**
 * Tests for the Collection method surface.
 *
 * Covers canonical Collection methods (CRUD + api-assoc + versions + fields)
 * and verifies that Folder-named aliases emit a one-shot console.warn while
 * keeping their original wire behaviour (hitting /v1/{env}/folders/...).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetWarned } from '../../src/_deprecation.js';
import type { AuthStrategy, RequestData } from '../../src/auth/types.js';
import { ManagementClient } from '../../src/management/client.js';
import type {
  APICollectionList,
  APICollectionSummary,
  CollectionList,
  CollectionSummary,
} from '../../src/management/models.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Bearer test-token' };
  },
};

function setupMockFetch(response: any = {}, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(response), { status }));
  globalThis.fetch = fetchMock;
  return fetchMock;
}

function createClient() {
  return new ManagementClient({
    baseUrl: 'https://api.test.com',
    environmentKey: 'env-123',
    auth: dummyAuth,
    timeout: 1000,
    retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
  });
}

describe('ManagementClient — Collection methods', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetWarned();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    _resetWarned();
  });

  // ----- canonical CRUD -----

  it('listCollections hits /v1/{env}/collections/tree/', async () => {
    const fetchMock = setupMockFetch({ count: 0, results: [] });
    const client = createClient();
    const res = await client.listCollections();
    expect(res).toEqual({ count: 0, results: [] });
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/collections/tree/');
  });

  it('getCollection passes ?key=', async () => {
    const fetchMock = setupMockFetch({ key: 'c1' });
    const client = createClient();
    await client.getCollection('c1');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/tree/collection/');
    expect(url).toContain('key=c1');
  });

  it('getCollectionByPath passes ?path=', async () => {
    const fetchMock = setupMockFetch({ key: 'c1' });
    const client = createClient();
    await client.getCollectionByPath('/nested/path');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('path=');
  });

  it('listCollectionTree passes ?key and ?mode', async () => {
    const fetchMock = setupMockFetch({ count: 0, results: [] });
    const client = createClient();
    await client.listCollectionTree({ key: 'c1', mode: 'children' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('key=c1');
    expect(url).toContain('mode=children');
  });

  it('createCollection POSTs to collections/tree/', async () => {
    const fetchMock = setupMockFetch({ key: 'c1' });
    const client = createClient();
    await client.createCollection({
      name: 'Articles',
      alias: 'articles',
      content_type: 'document',
    });
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/collections/tree/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('Articles');
    expect(body.alias).toBe('articles');
    expect(body.content_type).toBe('document');
  });

  it('updateCollection PUTs to tree/collection/?key', async () => {
    const fetchMock = setupMockFetch({ key: 'c1' });
    const client = createClient();
    await client.updateCollection('c1', { name: 'Renamed' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/tree/collection/');
    expect(url).toContain('key=c1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
  });

  it('deleteCollection DELETEs at tree/collection/?key', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const client = createClient();
    await client.deleteCollection('c1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/tree/collection/');
  });

  // ----- canonical API ↔ Collection -----

  it('addApiCollection POSTs with wire field "folder"', async () => {
    const fetchMock = setupMockFetch({ folder: 'c1', api: 'my-api' });
    const client = createClient();
    await client.addApiCollection('my-api', 'c1', {
      allowedMethods: ['get_one'],
      descriptionGetOne: 'one',
      descriptionGetMany: 'many',
      descriptionSearch: 'search',
      descriptionSchema: 'schema',
    });
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/my-api/collections/');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.folder).toBe('c1');
    expect(body.allowed_methods).toEqual(['get_one']);
    expect(body.description_get_one).toBe('one');
    expect(body.description_get_many).toBe('many');
    expect(body.description_search).toBe('search');
    expect(body.description_schema).toBe('schema');
  });

  it('listApiCollections hits the /api/{api}/collections/ subroute', async () => {
    const fetchMock = setupMockFetch({ count: 0, results: [] });
    const client = createClient();
    await client.listApiCollections('my-api');
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/my-api/collections/');
  });

  it('removeApiCollection DELETEs at /api/{api}/collections/{key}/', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const client = createClient();
    await client.removeApiCollection('my-api', 'c1');
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/my-api/collections/c1/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });

  // ----- canonical schema versions + fields -----

  it('publishCollectionVersion POSTs to the publish subpath', async () => {
    const fetchMock = setupMockFetch({ key: 'v1', published_at: '2026-01-11T00:00:00Z' });
    const client = createClient();
    await client.publishCollectionVersion('c1', 'v1');
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/v1/env-123/collections/c1/model/versions/v1/publish/',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('listCollectionFields hits the collection schema_tree path', async () => {
    const fetchMock = setupMockFetch({ count: 0, results: [] });
    const client = createClient();
    await client.listCollectionFields('c1', 'v1');
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/v1/env-123/collections/c1/model/versions/v1/schema/tree/',
    );
  });

  it('createCollectionField POSTs payload', async () => {
    const fetchMock = setupMockFetch({ key: 'f1', name: 'title' });
    const client = createClient();
    await client.createCollectionField('c1', 'v1', { name: 'title', type: 'string' });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('title');
  });

  // ----- canonical API ↔ Collection read/update -----

  it('getApiCollection GETs /api/{api}/collections/{key}/', async () => {
    const fetchMock = setupMockFetch({ folder: 'c1', api: 'my-api' });
    const client = createClient();
    await client.getApiCollection('my-api', 'c1');
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/my-api/collections/c1/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('updateApiCollection PUTs allowed_methods and descriptions', async () => {
    const fetchMock = setupMockFetch({ folder: 'c1', api: 'my-api' });
    const client = createClient();
    await client.updateApiCollection('my-api', 'c1', {
      allowedMethods: ['get_one', 'get_many'],
      descriptionGetOne: 'one',
      descriptionGetMany: 'many',
      descriptionSearch: 'search',
      descriptionSchema: 'schema',
    });
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/my-api/collections/c1/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.allowed_methods).toEqual(['get_one', 'get_many']);
    expect(body.description_get_one).toBe('one');
    expect(body.description_get_many).toBe('many');
    expect(body.description_search).toBe('search');
    expect(body.description_schema).toBe('schema');
  });

  // ----- canonical Collection schema versions -----

  it('listCollectionVersions GETs the versions base path', async () => {
    const fetchMock = setupMockFetch({ count: 0, results: [] });
    const client = createClient();
    await client.listCollectionVersions('c1');
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/collections/c1/model/versions/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('createCollectionVersion POSTs payload and passes ?copy_from', async () => {
    const fetchMock = setupMockFetch({ key: 'v2' });
    const client = createClient();
    await client.createCollectionVersion('c1', { name: 'draft' }, { copyFrom: 'v1' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/c1/model/versions/');
    expect(url).toContain('copy_from=v1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('draft');
  });

  it('getCollectionVersion passes ?include_schema when requested', async () => {
    const fetchMock = setupMockFetch({ key: 'v1' });
    const client = createClient();
    await client.getCollectionVersion('c1', 'v1', { includeSchema: true });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/c1/model/versions/v1/');
    expect(url).toContain('include_schema=true');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('updateCollectionVersion PUTs payload to the version path', async () => {
    const fetchMock = setupMockFetch({ key: 'v1' });
    const client = createClient();
    await client.updateCollectionVersion('c1', 'v1', { name: 'renamed' });
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/v1/env-123/collections/c1/model/versions/v1/',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('renamed');
  });

  it('deleteCollectionVersion DELETEs the version path', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const client = createClient();
    await client.deleteCollectionVersion('c1', 'v1');
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/v1/env-123/collections/c1/model/versions/v1/',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });

  // ----- canonical Collection field read/update/delete -----

  it('getCollectionField GETs schema/tree/field/ with ?path', async () => {
    const fetchMock = setupMockFetch({ key: 'f1' });
    const client = createClient();
    await client.getCollectionField('c1', 'v1', 'title');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/c1/model/versions/v1/schema/tree/field/');
    expect(url).toContain('path=title');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('updateCollectionField PUTs payload with ?path', async () => {
    const fetchMock = setupMockFetch({ key: 'f1' });
    const client = createClient();
    await client.updateCollectionField('c1', 'v1', 'title', { name: 'heading' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/c1/model/versions/v1/schema/tree/field/');
    expect(url).toContain('path=title');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('heading');
  });

  it('deleteCollectionField DELETEs schema/tree/field/ with ?path', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const client = createClient();
    await client.deleteCollectionField('c1', 'v1', 'title');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/collections/c1/model/versions/v1/schema/tree/field/');
    expect(url).toContain('path=title');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });

  // ----- Component schema versions + fields -----

  it('getComponentVersion passes ?include_schema when requested', async () => {
    const fetchMock = setupMockFetch({ key: 'v1' });
    const client = createClient();
    await client.getComponentVersion('cmp1', 'v1', { includeSchema: true });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/components/cmp1/model/versions/v1/');
    expect(url).toContain('include_schema=true');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('updateComponentVersion PUTs payload to the version path', async () => {
    const fetchMock = setupMockFetch({ key: 'v1' });
    const client = createClient();
    await client.updateComponentVersion('cmp1', 'v1', { name: 'renamed' });
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/v1/env-123/components/cmp1/model/versions/v1/',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('renamed');
  });

  it('getComponentField GETs schema/tree/field/ with ?path', async () => {
    const fetchMock = setupMockFetch({ key: 'f1' });
    const client = createClient();
    await client.getComponentField('cmp1', 'v1', 'title');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/components/cmp1/model/versions/v1/schema/tree/field/');
    expect(url).toContain('path=title');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('updateComponentField PUTs payload with ?path', async () => {
    const fetchMock = setupMockFetch({ key: 'f1' });
    const client = createClient();
    await client.updateComponentField('cmp1', 'v1', 'title', { name: 'heading' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/v1/env-123/components/cmp1/model/versions/v1/schema/tree/field/');
    expect(url).toContain('path=title');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe('heading');
  });

  // ----- type alias sanity -----

  it('CollectionSummary type alias is structurally usable', () => {
    const x: CollectionSummary = {
      key: 'c1',
      name: 'Articles',
      alias: 'articles',
      content_type: 'document',
      strict_reference: false,
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(x.key).toBe('c1');
    const list: CollectionList = { count: 1, results: [x], next: null, previous: null };
    expect(list.results[0]).toBe(x);
    const api: APICollectionSummary = { folder: 'c1' };
    expect(api.folder).toBe('c1');
    const apiList: APICollectionList = {
      count: 1,
      results: [api],
      next: null,
      previous: null,
    };
    expect(apiList.results.length).toBe(1);
  });
});

describe('ManagementClient — Folder deprecation aliases', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetWarned();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    _resetWarned();
  });

  it('listFolders emits a one-shot console.warn', async () => {
    setupMockFetch({ count: 0, results: [] });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient();
    await client.listFolders();
    await client.listFolders();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('listFolders');
    expect(warn.mock.calls[0][0]).toContain('listCollections');
  });

  it('listFolders still hits the /v1/{env}/folders/ legacy URL', async () => {
    const fetchMock = setupMockFetch({ count: 0, results: [] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient();
    await client.listFolders();
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/folders/tree/');
  });

  it('addApiFolder emits deprecation warn', async () => {
    setupMockFetch({ folder: 'c1' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient();
    await client.addApiFolder('my-api', 'c1', { allowedMethods: ['get_one'] });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('addApiFolder');
  });

  it('getApiFolder warns and hits the legacy /api/{api}/folders/ URL', async () => {
    const fetchMock = setupMockFetch({ folder: 'c1', api: 'my-api' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient();
    await client.getApiFolder('my-api', 'c1');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('getApiFolder');
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/my-api/folders/c1/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('publishFolderVersion emits deprecation warn', async () => {
    setupMockFetch({ key: 'v1', published_at: '2026-01-11T00:00:00Z' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient();
    await client.publishFolderVersion('c1', 'v1');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('publishFolderVersion');
  });

  it('listFolderFields emits deprecation warn', async () => {
    setupMockFetch({ count: 0, results: [] });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient();
    await client.listFolderFields('c1', 'v1');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('listFolderFields');
  });
});
