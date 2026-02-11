/**
 * URL path builders for Management API endpoints.
 * Equivalent to Python SDK's _ManagementPathsMixin.
 */
export function managementPaths(environmentKey: string) {
  return {
    // Organization paths
    orgRoot: (orgKey: string) => `/organizations/${orgKey}`,
    projectsBase: (orgKey: string) => `/organizations/${orgKey}/projects`,
    projectRoot: (orgKey: string, projectKey: string) =>
      `/organizations/${orgKey}/projects/${projectKey}`,
    environmentsBase: (orgKey: string, projectKey: string) =>
      `/organizations/${orgKey}/projects/${projectKey}/environments`,
    environmentRoot: (orgKey: string, projectKey: string, envKey: string) =>
      `/organizations/${orgKey}/projects/${projectKey}/environments/${envKey}`,

    // Folder paths
    foldersRoot: () => `/v1/${environmentKey}/folders`,
    foldersTreeRoot: () => `/v1/${environmentKey}/folders/tree`,
    foldersTreeItem: () => `/v1/${environmentKey}/folders/tree/folder`,
    folderRoot: (folderKey: string) => `/v1/${environmentKey}/folders/${folderKey}`,
    folderVersionsBase: (folderKey: string) =>
      `/v1/${environmentKey}/folders/${folderKey}/model/versions`,
    folderSchemaTree: (folderKey: string, versionKey: string) =>
      `/v1/${environmentKey}/folders/${folderKey}/model/versions/${versionKey}/schema/tree`,

    // Component paths
    componentsRoot: () => `/v1/${environmentKey}/components`,
    componentRoot: (componentKey: string) => `/v1/${environmentKey}/components/${componentKey}`,
    componentVersionsBase: (componentKey: string) =>
      `/v1/${environmentKey}/components/${componentKey}/model/versions`,
    componentSchemaTree: (componentKey: string, versionKey: string) =>
      `/v1/${environmentKey}/components/${componentKey}/model/versions/${versionKey}/schema/tree`,

    // Resource paths
    resourceBase: (folderKey: string) =>
      `/v1/${environmentKey}/folders/${folderKey}/resources`,
    revisionBase: (folderKey: string, resourceKey: string) =>
      `/v1/${environmentKey}/folders/${folderKey}/resources/${resourceKey}/revisions`,

    // Management API key paths
    managementApiKeysRoot: () =>
      `/v1/${environmentKey}/permissions/management-api/api-keys`,
    managementApiKeyRoot: (apiKey: string) =>
      `/v1/${environmentKey}/permissions/management-api/api-keys/${apiKey}`,

    // Flux API key paths
    fluxApiKeysRoot: () => `/v1/${environmentKey}/permissions/flux-api/api-keys`,
    fluxApiKeyRoot: (apiKey: string) =>
      `/v1/${environmentKey}/permissions/flux-api/api-keys/${apiKey}`,

    // API management paths
    apisRoot: () => `/v1/${environmentKey}/api`,
    apiRoot: (apiKey: string) => `/v1/${environmentKey}/api/${apiKey}`,
    apiFoldersRoot: (apiKey: string) => `/v1/${environmentKey}/api/${apiKey}/folders`,

    // Management role paths
    managementRolesRoot: () => `/v1/${environmentKey}/permissions/management-api/roles`,
    managementRoleRoot: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/management-api/roles/${roleKey}`,
    rolePermissionsRoot: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/management-api/roles/${roleKey}/permissions`,
    rolePermissionsBatch: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/management-api/roles/${roleKey}/permissions/batch`,
    rolePermissionObjectsRoot: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/management-api/roles/${roleKey}/permissions/objects`,

    // Flux role paths
    fluxRolesRoot: () => `/v1/${environmentKey}/permissions/flux-api/roles`,
    fluxRoleRoot: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/flux-api/roles/${roleKey}`,
    fluxRolePermissionsRoot: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/flux-api/roles/${roleKey}/permissions`,
    fluxRolePermissionsBatch: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/flux-api/roles/${roleKey}/permissions/batch`,
    fluxRolePermissionObjectsRoot: (roleKey: string) =>
      `/v1/${environmentKey}/permissions/flux-api/roles/${roleKey}/permissions/objects`,

    // Locale paths
    localesRoot: () => `/v1/${environmentKey}/locales`,
    localeRoot: (code: string) => `/v1/${environmentKey}/locales/${code}`,
  };
}

export type ManagementPaths = ReturnType<typeof managementPaths>;
