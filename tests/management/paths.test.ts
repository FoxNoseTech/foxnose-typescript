import { describe, expect, it } from 'vitest';
import { managementPaths } from '../../src/management/paths.js';

describe('managementPaths', () => {
  const paths = managementPaths('env-abc');

  it('orgRoot', () => {
    expect(paths.orgRoot('org-1')).toBe('/organizations/org-1');
  });

  it('projectsBase', () => {
    expect(paths.projectsBase('org-1')).toBe('/organizations/org-1/projects');
  });

  it('projectRoot', () => {
    expect(paths.projectRoot('org-1', 'proj-1')).toBe('/organizations/org-1/projects/proj-1');
  });

  it('environmentsBase', () => {
    expect(paths.environmentsBase('org-1', 'proj-1')).toBe(
      '/organizations/org-1/projects/proj-1/environments',
    );
  });

  it('environmentRoot', () => {
    expect(paths.environmentRoot('org-1', 'proj-1', 'env-1')).toBe(
      '/organizations/org-1/projects/proj-1/environments/env-1',
    );
  });

  it('foldersTreeRoot', () => {
    expect(paths.foldersTreeRoot()).toBe('/v1/env-abc/folders/tree');
  });

  it('folderVersionsBase', () => {
    expect(paths.folderVersionsBase('f1')).toBe('/v1/env-abc/folders/f1/model/versions');
  });

  it('folderSchemaTree', () => {
    expect(paths.folderSchemaTree('f1', 'v1')).toBe(
      '/v1/env-abc/folders/f1/model/versions/v1/schema/tree',
    );
  });

  it('componentsRoot', () => {
    expect(paths.componentsRoot()).toBe('/v1/env-abc/components');
  });

  it('componentRoot', () => {
    expect(paths.componentRoot('c1')).toBe('/v1/env-abc/components/c1');
  });

  it('componentVersionsBase', () => {
    expect(paths.componentVersionsBase('c1')).toBe('/v1/env-abc/components/c1/model/versions');
  });

  it('componentSchemaTree', () => {
    expect(paths.componentSchemaTree('c1', 'v1')).toBe(
      '/v1/env-abc/components/c1/model/versions/v1/schema/tree',
    );
  });

  it('resourceBase', () => {
    expect(paths.resourceBase('f1')).toBe('/v1/env-abc/folders/f1/resources');
  });

  it('revisionBase', () => {
    expect(paths.revisionBase('f1', 'r1')).toBe(
      '/v1/env-abc/folders/f1/resources/r1/revisions',
    );
  });

  it('managementApiKeysRoot', () => {
    expect(paths.managementApiKeysRoot()).toBe(
      '/v1/env-abc/permissions/management-api/api-keys',
    );
  });

  it('fluxApiKeysRoot', () => {
    expect(paths.fluxApiKeysRoot()).toBe('/v1/env-abc/permissions/flux-api/api-keys');
  });

  it('apisRoot', () => {
    expect(paths.apisRoot()).toBe('/v1/env-abc/api');
  });

  it('apiFoldersRoot', () => {
    expect(paths.apiFoldersRoot('api-1')).toBe('/v1/env-abc/api/api-1/folders');
  });

  it('managementRolesRoot', () => {
    expect(paths.managementRolesRoot()).toBe(
      '/v1/env-abc/permissions/management-api/roles',
    );
  });

  it('rolePermissionsRoot', () => {
    expect(paths.rolePermissionsRoot('r1')).toBe(
      '/v1/env-abc/permissions/management-api/roles/r1/permissions',
    );
  });

  it('rolePermissionsBatch', () => {
    expect(paths.rolePermissionsBatch('r1')).toBe(
      '/v1/env-abc/permissions/management-api/roles/r1/permissions/batch',
    );
  });

  it('rolePermissionObjectsRoot', () => {
    expect(paths.rolePermissionObjectsRoot('r1')).toBe(
      '/v1/env-abc/permissions/management-api/roles/r1/permissions/objects',
    );
  });

  it('fluxRolesRoot', () => {
    expect(paths.fluxRolesRoot()).toBe('/v1/env-abc/permissions/flux-api/roles');
  });

  it('fluxRolePermissionsRoot', () => {
    expect(paths.fluxRolePermissionsRoot('fr1')).toBe(
      '/v1/env-abc/permissions/flux-api/roles/fr1/permissions',
    );
  });

  it('fluxRolePermissionsBatch', () => {
    expect(paths.fluxRolePermissionsBatch('fr1')).toBe(
      '/v1/env-abc/permissions/flux-api/roles/fr1/permissions/batch',
    );
  });

  it('fluxRolePermissionObjectsRoot', () => {
    expect(paths.fluxRolePermissionObjectsRoot('fr1')).toBe(
      '/v1/env-abc/permissions/flux-api/roles/fr1/permissions/objects',
    );
  });

  it('localesRoot', () => {
    expect(paths.localesRoot()).toBe('/v1/env-abc/locales');
  });

  it('localeRoot', () => {
    expect(paths.localeRoot('en')).toBe('/v1/env-abc/locales/en');
  });
});
