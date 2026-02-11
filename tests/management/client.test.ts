import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagementClient } from '../../src/management/client.js';
import type { AuthStrategy, RequestData } from '../../src/auth/types.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Bearer test-token' };
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
  return new ManagementClient({
    baseUrl: 'https://api.test.com',
    environmentKey: 'env-123',
    auth: dummyAuth,
    timeout: 1000,
    retryConfig: { attempts: 1, backoffFactor: 0, statusCodes: [], methods: [] },
  });
}

describe('ManagementClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws on empty environmentKey', () => {
      expect(
        () => new ManagementClient({ environmentKey: '', auth: dummyAuth }),
      ).toThrow('environmentKey must be provided');
    });

    it('uses default baseUrl', () => {
      const client = new ManagementClient({
        environmentKey: 'env-1',
        auth: dummyAuth,
      });
      expect(client.environmentKey).toBe('env-1');
    });
  });

  describe('Organizations', () => {
    it('listOrganizations', async () => {
      const orgs = [{ key: 'org-1', name: 'Org 1' }];
      setupMockFetch(orgs);
      const client = createClient();
      const result = await client.listOrganizations();
      expect(result).toEqual(orgs);
    });

    it('listOrganizations wraps single org in array', async () => {
      const org = { key: 'org-1', name: 'Org 1' };
      setupMockFetch(org);
      const client = createClient();
      const result = await client.listOrganizations();
      expect(result).toEqual([org]);
    });

    it('getOrganization', async () => {
      const org = { key: 'org-1', name: 'Org 1' };
      const fetchMock = setupMockFetch(org);
      const client = createClient();
      const result = await client.getOrganization('org-1');
      expect(result).toEqual(org);
      expect(fetchMock.mock.calls[0][0]).toContain('/organizations/org-1/');
    });

    it('updateOrganization', async () => {
      const org = { key: 'org-1', name: 'Updated' };
      setupMockFetch(org);
      const client = createClient();
      const result = await client.updateOrganization('org-1', { name: 'Updated' });
      expect(result).toEqual(org);
    });

    it('listRegions', async () => {
      const regions = [{ location: 'EU', name: 'Europe', code: 'eu-1' }];
      setupMockFetch(regions);
      const client = createClient();
      const result = await client.listRegions();
      expect(result).toEqual(regions);
    });

    it('getOrganizationPlan', async () => {
      const plan = { active_plan: { code: 'pro' }, next_plan: { code: 'pro' } };
      const fetchMock = setupMockFetch(plan);
      const client = createClient();
      const result = await client.getOrganizationPlan('org-1');
      expect(result).toEqual(plan);
      expect(fetchMock.mock.calls[0][0]).toContain('/organizations/org-1/plan/');
    });

    it('setOrganizationPlan', async () => {
      const plan = { active_plan: { code: 'enterprise' } };
      const fetchMock = setupMockFetch(plan);
      const client = createClient();
      await client.setOrganizationPlan('org-1', 'enterprise');
      expect(fetchMock.mock.calls[0][0]).toContain('/organizations/org-1/plan/enterprise/');
    });

    it('getOrganizationUsage', async () => {
      const usage = { units: { remained: 100 } };
      setupMockFetch(usage);
      const client = createClient();
      const result = await client.getOrganizationUsage('org-1');
      expect(result).toEqual(usage);
    });
  });

  describe('Management API Keys', () => {
    it('listManagementApiKeys', async () => {
      const data = { count: 1, next: null, previous: null, results: [{ key: 'k1' }] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.listManagementApiKeys();
      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toContain('/permissions/management-api/api-keys/');
    });

    it('createManagementApiKey', async () => {
      const key = { key: 'k1', public_key: 'pub' };
      setupMockFetch(key);
      const client = createClient();
      const result = await client.createManagementApiKey({ description: 'test' });
      expect(result).toEqual(key);
    });

    it('getManagementApiKey', async () => {
      const key = { key: 'k1' };
      setupMockFetch(key);
      const client = createClient();
      const result = await client.getManagementApiKey('k1');
      expect(result).toEqual(key);
    });

    it('updateManagementApiKey', async () => {
      const key = { key: 'k1', description: 'updated' };
      setupMockFetch(key);
      const client = createClient();
      const result = await client.updateManagementApiKey('k1', { description: 'updated' });
      expect(result).toEqual(key);
    });

    it('deleteManagementApiKey', async () => {
      const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
      globalThis.fetch = fetchMock;
      const client = createClient();
      await client.deleteManagementApiKey('k1');
      expect(fetchMock.mock.calls[0][0]).toContain('/api-keys/k1/');
    });
  });

  describe('Flux API Keys', () => {
    it('listFluxApiKeys', async () => {
      const data = { count: 0, next: null, previous: null, results: [] };
      setupMockFetch(data);
      const client = createClient();
      const result = await client.listFluxApiKeys();
      expect(result).toEqual(data);
    });

    it('CRUD flux api key', async () => {
      const key = { key: 'fk1' };
      setupMockFetch(key);
      const client = createClient();

      const created = await client.createFluxApiKey({ description: 'test' });
      expect(created).toEqual(key);

      const got = await client.getFluxApiKey('fk1');
      expect(got).toEqual(key);

      const updated = await client.updateFluxApiKey('fk1', { description: 'updated' });
      expect(updated).toEqual(key);
    });

    it('deleteFluxApiKey', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFluxApiKey('fk1');
    });
  });

  describe('APIs', () => {
    it('listApis', async () => {
      const data = { count: 0, next: null, previous: null, results: [] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.listApis();
      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/api/');
    });

    it('createApi', async () => {
      const api = { key: 'api-1', name: 'Test API' };
      setupMockFetch(api);
      const client = createClient();
      const result = await client.createApi({ name: 'Test API', prefix: 'v1' });
      expect(result).toEqual(api);
    });

    it('getApi / updateApi / deleteApi', async () => {
      const api = { key: 'api-1', name: 'API' };
      setupMockFetch(api);
      const client = createClient();

      expect(await client.getApi('api-1')).toEqual(api);
      expect(await client.updateApi('api-1', { name: 'New' })).toEqual(api);

      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      await client.deleteApi('api-1');
    });
  });

  describe('API Folders', () => {
    it('listApiFolders', async () => {
      const data = { count: 0, results: [] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      await client.listApiFolders('api-1');
      expect(fetchMock.mock.calls[0][0]).toContain('/api/api-1/folders/');
    });

    it('addApiFolder', async () => {
      const folder = { folder: 'f1', api: 'api-1' };
      const fetchMock = setupMockFetch(folder);
      const client = createClient();
      const result = await client.addApiFolder('api-1', 'f1', {
        allowedMethods: ['get_one', 'get_many'],
      });
      expect(result).toEqual(folder);
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.folder).toBe('f1');
      expect(body.allowed_methods).toEqual(['get_one', 'get_many']);
    });

    it('removeApiFolder', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.removeApiFolder('api-1', 'f1');
    });
  });

  describe('Management Roles', () => {
    it('CRUD management roles', async () => {
      const role = { key: 'role-1', name: 'Admin' };
      setupMockFetch(role);
      const client = createClient();

      expect(await client.createManagementRole({ name: 'Admin' })).toEqual(role);
      expect(await client.getManagementRole('role-1')).toEqual(role);
      expect(await client.updateManagementRole('role-1', { name: 'Super' })).toEqual(role);
    });

    it('listManagementRoles', async () => {
      const data = { count: 1, results: [{ key: 'role-1' }] };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.listManagementRoles()).toEqual(data);
    });

    it('deleteManagementRole', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteManagementRole('role-1');
    });
  });

  describe('Management Role Permissions', () => {
    it('listManagementRolePermissions', async () => {
      const perms = [{ content_type: 'folder', actions: ['read'], all_objects: true }];
      setupMockFetch(perms);
      const client = createClient();
      const result = await client.listManagementRolePermissions('role-1');
      expect(result).toEqual(perms);
    });

    it('upsertManagementRolePermission', async () => {
      const perm = { content_type: 'folder', actions: ['read', 'write'] };
      setupMockFetch(perm);
      const client = createClient();
      const result = await client.upsertManagementRolePermission('role-1', perm);
      expect(result).toEqual(perm);
    });

    it('replaceManagementRolePermissions', async () => {
      const perms = [{ content_type: 'folder', actions: ['read'] }];
      setupMockFetch(perms);
      const client = createClient();
      const result = await client.replaceManagementRolePermissions('role-1', perms);
      expect(result).toEqual(perms);
    });

    it('deleteManagementRolePermission', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteManagementRolePermission('role-1', 'folder');
    });
  });

  describe('Management Permission Objects', () => {
    it('listManagementPermissionObjects', async () => {
      const objs = [{ content_type: 'folder', object_key: 'f1' }];
      setupMockFetch(objs);
      const client = createClient();
      const result = await client.listManagementPermissionObjects('role-1', 'folder');
      expect(result).toEqual(objs);
    });

    it('addManagementPermissionObject', async () => {
      const obj = { content_type: 'folder', object_key: 'f1' };
      setupMockFetch(obj);
      const client = createClient();
      const result = await client.addManagementPermissionObject('role-1', obj);
      expect(result).toEqual(obj);
    });

    it('deleteManagementPermissionObject', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteManagementPermissionObject('role-1', {
        content_type: 'folder',
        object_key: 'f1',
      });
    });
  });

  describe('Flux Roles', () => {
    it('CRUD flux roles', async () => {
      const role = { key: 'fr-1', name: 'Reader' };
      setupMockFetch(role);
      const client = createClient();

      expect(await client.createFluxRole({ name: 'Reader' })).toEqual(role);
      expect(await client.getFluxRole('fr-1')).toEqual(role);
      expect(await client.updateFluxRole('fr-1', { name: 'Writer' })).toEqual(role);
    });

    it('listFluxRoles', async () => {
      const data = { count: 0, results: [] };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.listFluxRoles()).toEqual(data);
    });

    it('deleteFluxRole', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFluxRole('fr-1');
    });
  });

  describe('Flux Role Permissions', () => {
    it('listFluxRolePermissions', async () => {
      const perms = [{ content_type: 'folder', actions: ['read'] }];
      setupMockFetch(perms);
      const client = createClient();
      expect(await client.listFluxRolePermissions('fr-1')).toEqual(perms);
    });

    it('upsertFluxRolePermission', async () => {
      const perm = { content_type: 'folder', actions: ['read'] };
      setupMockFetch(perm);
      const client = createClient();
      expect(await client.upsertFluxRolePermission('fr-1', perm)).toEqual(perm);
    });

    it('replaceFluxRolePermissions', async () => {
      const perms = [{ content_type: 'folder', actions: ['read'] }];
      setupMockFetch(perms);
      const client = createClient();
      expect(await client.replaceFluxRolePermissions('fr-1', perms)).toEqual(perms);
    });

    it('deleteFluxRolePermission', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFluxRolePermission('fr-1', 'folder');
    });
  });

  describe('Flux Permission Objects', () => {
    it('listFluxPermissionObjects', async () => {
      const objs = [{ content_type: 'folder', object_key: 'f1' }];
      setupMockFetch(objs);
      const client = createClient();
      expect(await client.listFluxPermissionObjects('fr-1', 'folder')).toEqual(objs);
    });

    it('addFluxPermissionObject', async () => {
      const obj = { content_type: 'folder', object_key: 'f1' };
      setupMockFetch(obj);
      const client = createClient();
      expect(await client.addFluxPermissionObject('fr-1', obj)).toEqual(obj);
    });

    it('deleteFluxPermissionObject', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFluxPermissionObject('fr-1', { content_type: 'folder', object_key: 'f1' });
    });
  });

  describe('Folders', () => {
    it('listFolders', async () => {
      const data = { count: 2, results: [{ key: 'f1' }, { key: 'f2' }] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.listFolders();
      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/folders/');
    });

    it('getFolder', async () => {
      const folder = { key: 'f1', name: 'Articles' };
      const fetchMock = setupMockFetch(folder);
      const client = createClient();
      const result = await client.getFolder('f1');
      expect(result).toEqual(folder);
      expect(fetchMock.mock.calls[0][0]).toContain('/v1/env-123/folders/f1/');
    });

    it('getFolder with FolderSummary object', async () => {
      const folder = { key: 'f1', name: 'Articles' };
      setupMockFetch(folder);
      const client = createClient();
      const result = await client.getFolder({ key: 'f1' } as any);
      expect(result).toEqual(folder);
    });

    it('getFolderByPath', async () => {
      const folder = { key: 'f1', path: 'blog.articles' };
      const fetchMock = setupMockFetch(folder);
      const client = createClient();
      const result = await client.getFolderByPath('blog.articles');
      expect(result).toEqual(folder);
      expect(fetchMock.mock.calls[0][0]).toContain('path=blog.articles');
    });

    it('listFolderTree', async () => {
      const data = { count: 3, results: [] };
      setupMockFetch(data);
      const client = createClient();
      await client.listFolderTree({ key: 'root', mode: 'children' });
    });

    it('createFolder', async () => {
      const folder = { key: 'f-new', name: 'New Folder' };
      setupMockFetch(folder);
      const client = createClient();
      const result = await client.createFolder({ name: 'New Folder', alias: 'new' });
      expect(result).toEqual(folder);
    });

    it('updateFolder', async () => {
      const folder = { key: 'f1', name: 'Updated' };
      setupMockFetch(folder);
      const client = createClient();
      const result = await client.updateFolder('f1', { name: 'Updated' });
      expect(result).toEqual(folder);
    });

    it('deleteFolder', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFolder('f1');
    });
  });

  describe('Folder Versions', () => {
    it('listFolderVersions', async () => {
      const data = { count: 1, results: [{ key: 'v1' }] };
      setupMockFetch(data);
      const client = createClient();
      const result = await client.listFolderVersions('f1');
      expect(result).toEqual(data);
    });

    it('createFolderVersion', async () => {
      const version = { key: 'v-new', name: 'v2' };
      setupMockFetch(version);
      const client = createClient();
      const result = await client.createFolderVersion('f1', { name: 'v2' });
      expect(result).toEqual(version);
    });

    it('createFolderVersion with copyFrom', async () => {
      const version = { key: 'v-new' };
      const fetchMock = setupMockFetch(version);
      const client = createClient();
      await client.createFolderVersion('f1', { name: 'v2' }, { copyFrom: 'v1' });
      expect(fetchMock.mock.calls[0][0]).toContain('copy_from=v1');
    });

    it('updateFolderVersion', async () => {
      const version = { key: 'v1', name: 'Updated' };
      setupMockFetch(version);
      const client = createClient();
      const result = await client.updateFolderVersion('f1', 'v1', { name: 'Updated' });
      expect(result).toEqual(version);
    });

    it('getFolderVersion without includeSchema', async () => {
      const version = { key: 'v1' };
      const fetchMock = setupMockFetch(version);
      const client = createClient();
      await client.getFolderVersion('f1', 'v1');
      expect(fetchMock.mock.calls[0][0]).not.toContain('include_schema');
    });

    it('getFolderVersion with includeSchema', async () => {
      const version = { key: 'v1', json_schema: {} };
      const fetchMock = setupMockFetch(version);
      const client = createClient();
      await client.getFolderVersion('f1', 'v1', { includeSchema: true });
      expect(fetchMock.mock.calls[0][0]).toContain('include_schema=true');
    });

    it('publishFolderVersion', async () => {
      const version = { key: 'v1', published_at: '2024-01-01' };
      const fetchMock = setupMockFetch(version);
      const client = createClient();
      const result = await client.publishFolderVersion('f1', 'v1');
      expect(result).toEqual(version);
      expect(fetchMock.mock.calls[0][0]).toContain('/publish/');
    });

    it('deleteFolderVersion', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFolderVersion('f1', 'v1');
    });
  });

  describe('Folder Fields', () => {
    it('listFolderFields', async () => {
      const data = { count: 2, results: [{ key: 'field1' }] };
      setupMockFetch(data);
      const client = createClient();
      const result = await client.listFolderFields('f1', 'v1');
      expect(result).toEqual(data);
    });

    it('createFolderField', async () => {
      const field = { key: 'title', type: 'string' };
      setupMockFetch(field);
      const client = createClient();
      const result = await client.createFolderField('f1', 'v1', { name: 'Title', type: 'string' });
      expect(result).toEqual(field);
    });

    it('getFolderField', async () => {
      const field = { key: 'title', path: 'title' };
      setupMockFetch(field);
      const client = createClient();
      const result = await client.getFolderField('f1', 'v1', 'title');
      expect(result).toEqual(field);
    });

    it('updateFolderField', async () => {
      const field = { key: 'title', required: true };
      setupMockFetch(field);
      const client = createClient();
      const result = await client.updateFolderField('f1', 'v1', 'title', { required: true });
      expect(result).toEqual(field);
    });

    it('deleteFolderField', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteFolderField('f1', 'v1', 'title');
    });
  });

  describe('Components', () => {
    it('CRUD components', async () => {
      const comp = { key: 'c1', name: 'Header' };
      setupMockFetch(comp);
      const client = createClient();

      expect(await client.createComponent({ name: 'Header' })).toEqual(comp);
      expect(await client.getComponent('c1')).toEqual(comp);
      expect(await client.updateComponent('c1', { name: 'Footer' })).toEqual(comp);
    });

    it('listComponents', async () => {
      const data = { count: 1, results: [{ key: 'c1' }] };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.listComponents()).toEqual(data);
    });

    it('deleteComponent', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteComponent('c1');
    });
  });

  describe('Component Versions', () => {
    it('listComponentVersions', async () => {
      const data = { count: 1, results: [{ key: 'cv1' }] };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.listComponentVersions('c1')).toEqual(data);
    });

    it('createComponentVersion with copyFrom', async () => {
      const version = { key: 'cv-new' };
      const fetchMock = setupMockFetch(version);
      const client = createClient();
      await client.createComponentVersion('c1', { name: 'v2' }, { copyFrom: 'cv1' });
      expect(fetchMock.mock.calls[0][0]).toContain('copy_from=cv1');
    });

    it('publishComponentVersion', async () => {
      const version = { key: 'cv1', published_at: '2024-01-01' };
      const fetchMock = setupMockFetch(version);
      const client = createClient();
      await client.publishComponentVersion('c1', 'cv1');
      expect(fetchMock.mock.calls[0][0]).toContain('/publish/');
    });

    it('deleteComponentVersion', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteComponentVersion('c1', 'cv1');
    });
  });

  describe('Component Fields', () => {
    it('listComponentFields', async () => {
      const data = { count: 1, results: [] };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.listComponentFields('c1', 'cv1')).toEqual(data);
    });

    it('createComponentField', async () => {
      const field = { key: 'text', type: 'text' };
      setupMockFetch(field);
      const client = createClient();
      expect(await client.createComponentField('c1', 'cv1', { name: 'Text', type: 'text' })).toEqual(field);
    });

    it('deleteComponentField', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteComponentField('c1', 'cv1', 'text');
    });
  });

  describe('Resources', () => {
    it('listResources', async () => {
      const data = { count: 5, results: [{ key: 'r1' }] };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.listResources('f1');
      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toContain('/folders/f1/resources/');
    });

    it('getResource', async () => {
      const resource = { key: 'r1', folder: 'f1' };
      setupMockFetch(resource);
      const client = createClient();
      expect(await client.getResource('f1', 'r1')).toEqual(resource);
    });

    it('createResource with options', async () => {
      const resource = { key: 'r-new' };
      const fetchMock = setupMockFetch(resource);
      const client = createClient();
      await client.createResource('f1', { data: {} }, {
        component: 'comp-1',
        externalId: 'ext-1',
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.component).toBe('comp-1');
      expect(body.external_id).toBe('ext-1');
    });

    it('createResource without options', async () => {
      const resource = { key: 'r-new' };
      setupMockFetch(resource);
      const client = createClient();
      const result = await client.createResource('f1', { data: {} });
      expect(result).toEqual(resource);
    });

    it('upsertResource', async () => {
      const resource = { key: 'r1' };
      const fetchMock = setupMockFetch(resource);
      const client = createClient();
      await client.upsertResource('f1', { data: {} }, { externalId: 'ext-1' });
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.external_id).toBe('ext-1');
    });

    it('upsertResource with component', async () => {
      const resource = { key: 'r1' };
      const fetchMock = setupMockFetch(resource);
      const client = createClient();
      await client.upsertResource('f1', { data: {} }, {
        externalId: 'ext-1',
        component: 'comp-1',
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.component).toBe('comp-1');
    });

    it('updateResource', async () => {
      const resource = { key: 'r1' };
      setupMockFetch(resource);
      const client = createClient();
      expect(await client.updateResource('f1', 'r1', { name: 'Updated' })).toEqual(resource);
    });

    it('deleteResource', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteResource('f1', 'r1');
    });

    it('getResourceData', async () => {
      const data = { title: 'Hello', body: 'World' };
      const fetchMock = setupMockFetch(data);
      const client = createClient();
      const result = await client.getResourceData('f1', 'r1');
      expect(result).toEqual(data);
      expect(fetchMock.mock.calls[0][0]).toContain('/resources/r1/data/');
    });
  });

  describe('Batch Upsert', () => {
    it('batchUpsertResources succeeds', async () => {
      setupMockFetch({ key: 'r1', folder: 'f1' });
      const client = createClient();
      const items = [
        { external_id: 'ext-1', payload: { title: 'A' } },
        { external_id: 'ext-2', payload: { title: 'B' } },
      ];
      const result = await client.batchUpsertResources('f1', items);
      expect(result.succeeded.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('batchUpsertResources tracks failures', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ message: 'Error' }), { status: 422 });
        }
        return new Response(JSON.stringify({ key: 'r2' }), { status: 200 });
      });
      const client = createClient();
      const items = [
        { external_id: 'ext-1', payload: { title: 'A' } },
        { external_id: 'ext-2', payload: { title: 'B' } },
      ];
      const result = await client.batchUpsertResources('f1', items, { maxConcurrency: 1 });
      expect(result.failed.length).toBe(1);
      expect(result.succeeded.length).toBe(1);
    });

    it('batchUpsertResources calls onProgress', async () => {
      setupMockFetch({ key: 'r1' });
      const client = createClient();
      const progressCalls: Array<[number, number]> = [];
      const items = [
        { external_id: 'ext-1', payload: { title: 'A' } },
        { external_id: 'ext-2', payload: { title: 'B' } },
      ];
      await client.batchUpsertResources('f1', items, {
        maxConcurrency: 1,
        onProgress: (completed, total) => progressCalls.push([completed, total]),
      });
      expect(progressCalls.length).toBe(2);
      expect(progressCalls[1]).toEqual([2, 2]);
    });

    it('batchUpsertResources with failFast stops on first error', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ message: 'Error' }), { status: 422 });
        }
        return new Response(JSON.stringify({ key: 'r2' }), { status: 200 });
      });
      const client = createClient();
      const items = [
        { external_id: 'ext-1', payload: { title: 'A' } },
        { external_id: 'ext-2', payload: { title: 'B' } },
      ];
      const result = await client.batchUpsertResources('f1', items, {
        maxConcurrency: 1,
        failFast: true,
      });
      expect(result.failed.length).toBe(1);
    });

    it('batchUpsertResources with component in items', async () => {
      const fetchMock = setupMockFetch({ key: 'r1' });
      const client = createClient();
      const items = [
        { external_id: 'ext-1', payload: { title: 'A' }, component: 'comp-1' },
      ];
      await client.batchUpsertResources('f1', items);
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.component).toBe('comp-1');
    });
  });

  describe('Revisions', () => {
    it('listRevisions', async () => {
      const data = { count: 1, results: [{ key: 'rev1' }] };
      setupMockFetch(data);
      const client = createClient();
      const result = await client.listRevisions('f1', 'r1');
      expect(result).toEqual(data);
    });

    it('createRevision', async () => {
      const rev = { key: 'rev-new', status: 'draft' };
      setupMockFetch(rev);
      const client = createClient();
      expect(await client.createRevision('f1', 'r1', { data: {} })).toEqual(rev);
    });

    it('getRevision', async () => {
      const rev = { key: 'rev1' };
      setupMockFetch(rev);
      const client = createClient();
      expect(await client.getRevision('f1', 'r1', 'rev1')).toEqual(rev);
    });

    it('updateRevision', async () => {
      const rev = { key: 'rev1' };
      setupMockFetch(rev);
      const client = createClient();
      expect(await client.updateRevision('f1', 'r1', 'rev1', { data: {} })).toEqual(rev);
    });

    it('deleteRevision', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteRevision('f1', 'r1', 'rev1');
    });

    it('publishRevision', async () => {
      const rev = { key: 'rev1', status: 'published' };
      const fetchMock = setupMockFetch(rev);
      const client = createClient();
      const result = await client.publishRevision('f1', 'r1', 'rev1');
      expect(result).toEqual(rev);
      expect(fetchMock.mock.calls[0][0]).toContain('/publish/');
    });

    it('publishRevision with payload', async () => {
      const rev = { key: 'rev1', status: 'published' };
      const fetchMock = setupMockFetch(rev);
      const client = createClient();
      await client.publishRevision('f1', 'r1', 'rev1', { notify: true });
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.notify).toBe(true);
    });

    it('validateRevision', async () => {
      const validation = { is_valid: true, errors: [] };
      const fetchMock = setupMockFetch(validation);
      const client = createClient();
      const result = await client.validateRevision('f1', 'r1', 'rev1');
      expect(result).toEqual(validation);
      expect(fetchMock.mock.calls[0][0]).toContain('/validate/');
    });

    it('getRevisionData', async () => {
      const data = { title: 'Hello' };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.getRevisionData('f1', 'r1', 'rev1')).toEqual(data);
    });
  });

  describe('Locales', () => {
    it('listLocales', async () => {
      const locales = [{ code: 'en', name: 'English' }];
      setupMockFetch(locales);
      const client = createClient();
      expect(await client.listLocales()).toEqual(locales);
    });

    it('CRUD locales', async () => {
      const locale = { code: 'en', name: 'English' };
      setupMockFetch(locale);
      const client = createClient();

      expect(await client.createLocale({ code: 'en', name: 'English' })).toEqual(locale);
      expect(await client.getLocale('en')).toEqual(locale);
      expect(await client.updateLocale('en', { name: 'English (US)' })).toEqual(locale);
    });

    it('deleteLocale', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteLocale('en');
    });
  });

  describe('Projects', () => {
    it('listProjects', async () => {
      const data = { count: 1, results: [{ key: 'p1' }] };
      setupMockFetch(data);
      const client = createClient();
      expect(await client.listProjects('org-1')).toEqual(data);
    });

    it('CRUD projects', async () => {
      const project = { key: 'p1', name: 'Project' };
      setupMockFetch(project);
      const client = createClient();

      expect(await client.createProject('org-1', { name: 'Project' })).toEqual(project);
      expect(await client.getProject('org-1', 'p1')).toEqual(project);
      expect(await client.updateProject('org-1', 'p1', { name: 'New' })).toEqual(project);
    });

    it('deleteProject', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteProject('org-1', 'p1');
    });
  });

  describe('Environments', () => {
    it('listEnvironments', async () => {
      const envs = [{ key: 'env-1', name: 'Dev' }];
      setupMockFetch(envs);
      const client = createClient();
      expect(await client.listEnvironments('org-1', 'p1')).toEqual(envs);
    });

    it('listEnvironments handles paginated response', async () => {
      const data = { count: 1, results: [{ key: 'env-1' }] };
      setupMockFetch(data);
      const client = createClient();
      const result = await client.listEnvironments('org-1', 'p1');
      expect(result).toEqual([{ key: 'env-1' }]);
    });

    it('CRUD environments', async () => {
      const env = { key: 'env-1', name: 'Dev' };
      setupMockFetch(env);
      const client = createClient();

      expect(await client.createEnvironment('org-1', 'p1', { name: 'Dev' })).toEqual(env);
      expect(await client.getEnvironment('org-1', 'p1', 'env-1')).toEqual(env);
      expect(await client.updateEnvironment('org-1', 'p1', 'env-1', { name: 'Staging' })).toEqual(env);
    });

    it('deleteEnvironment', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const client = createClient();
      await client.deleteEnvironment('org-1', 'p1', 'env-1');
    });

    it('toggleEnvironment', async () => {
      const fetchMock = setupMockFetch({});
      const client = createClient();
      await client.toggleEnvironment('org-1', 'p1', 'env-1', true);
      expect(fetchMock.mock.calls[0][0]).toContain('/toggle/');
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.is_enabled).toBe(true);
    });

    it('updateEnvironmentProtection', async () => {
      const env = { key: 'env-1', protection_level: 'locked' };
      const fetchMock = setupMockFetch(env);
      const client = createClient();
      await client.updateEnvironmentProtection('org-1', 'p1', 'env-1', {
        protectionLevel: 'locked',
        protectionReason: 'maintenance',
      });
      expect(fetchMock.mock.calls[0][0]).toContain('/protect/');
    });

    it('clearEnvironmentProtection', async () => {
      const env = { key: 'env-1', protection_level: null };
      const fetchMock = setupMockFetch(env);
      const client = createClient();
      await client.clearEnvironmentProtection('org-1', 'p1', 'env-1');
      expect(fetchMock.mock.calls[0][0]).toContain('/unprotect/');
    });
  });

  describe('resolveKey', () => {
    it('accepts string key', async () => {
      const folder = { key: 'f1' };
      setupMockFetch(folder);
      const client = createClient();
      await client.getFolder('f1');
    });

    it('accepts object with key property', async () => {
      const folder = { key: 'f1' };
      setupMockFetch(folder);
      const client = createClient();
      await client.getFolder({ key: 'f1' } as any);
    });
  });

  it('request is a low-level escape hatch', async () => {
    setupMockFetch({ custom: true });
    const client = createClient();
    const result = await client.request('PATCH', '/custom/endpoint');
    expect(result).toEqual({ custom: true });
  });

  it('close does not throw', () => {
    const client = createClient();
    expect(() => client.close()).not.toThrow();
  });
});
