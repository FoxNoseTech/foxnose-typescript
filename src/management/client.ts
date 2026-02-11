import type { AuthStrategy } from '../auth/types.js';
import type { RetryConfig } from '../config.js';
import { createConfig } from '../config.js';
import { HttpTransport } from '../http.js';
import type {
  APIFolderList,
  APIFolderSummary,
  APIInfo,
  APIList,
  APIRef,
  BatchItemError,
  BatchUpsertItem,
  BatchUpsertResult,
  ComponentList,
  ComponentRef,
  ComponentSummary,
  EnvironmentList,
  EnvironmentRef,
  EnvironmentSummary,
  FieldList,
  FieldSummary,
  FluxAPIKeyList,
  FluxAPIKeyRef,
  FluxAPIKeySummary,
  FluxRoleList,
  FluxRoleRef,
  FluxRoleSummary,
  FolderList,
  FolderRef,
  FolderSummary,
  LocaleList,
  LocaleSummary,
  ManagementAPIKeyList,
  ManagementAPIKeyRef,
  ManagementAPIKeySummary,
  ManagementRoleList,
  ManagementRoleRef,
  ManagementRoleSummary,
  OrgRef,
  OrganizationList,
  OrganizationPlanStatus,
  OrganizationSummary,
  OrganizationUsage,
  ProjectList,
  ProjectRef,
  ProjectSummary,
  RegionInfo,
  ResourceList,
  ResourceRef,
  ResourceSummary,
  RevisionList,
  RevisionRef,
  RevisionSummary,
  RolePermission,
  RolePermissionObject,
  SchemaVersionList,
  SchemaVersionRef,
  SchemaVersionSummary,
} from './models.js';
import { resolveKey } from './models.js';
import { managementPaths } from './paths.js';
import type { ManagementPaths } from './paths.js';

export interface ManagementClientOptions {
  baseUrl?: string;
  environmentKey: string;
  auth: AuthStrategy;
  timeout?: number;
  retryConfig?: RetryConfig;
  defaultHeaders?: Record<string, string>;
}

/**
 * Client for the FoxNose Management API.
 *
 * All methods are async and return parsed response objects.
 */
export class ManagementClient {
  readonly environmentKey: string;
  private readonly transport: HttpTransport;
  private readonly paths: ManagementPaths;

  constructor(options: ManagementClientOptions) {
    if (!options.environmentKey) {
      throw new Error('environmentKey must be provided');
    }
    this.environmentKey = options.environmentKey;
    const config = createConfig({
      baseUrl: options.baseUrl ?? 'https://api.foxnose.net',
      timeout: options.timeout,
      defaultHeaders: options.defaultHeaders,
    });
    this.transport = new HttpTransport({
      config,
      auth: options.auth,
      retryConfig: options.retryConfig,
    });
    this.paths = managementPaths(options.environmentKey);
  }

  /**
   * Low-level escape hatch for calling arbitrary endpoints.
   */
  async request(
    method: string,
    path: string,
    options?: {
      params?: Record<string, any>;
      jsonBody?: any;
      headers?: Record<string, string>;
      parseJson?: boolean;
    },
  ): Promise<any> {
    return this.transport.request(method, path, options);
  }

  close(): void {
    this.transport.close();
  }

  // ------------------------------------------------------------------ //
  // Organization operations
  // ------------------------------------------------------------------ //

  async listOrganizations(): Promise<OrganizationList> {
    const payload = (await this.request('GET', '/organizations/')) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async getOrganization(orgKey: OrgRef): Promise<OrganizationSummary> {
    const key = resolveKey(orgKey);
    return this.request('GET', `${this.paths.orgRoot(key)}/`);
  }

  async updateOrganization(
    orgKey: OrgRef,
    payload: Record<string, any>,
  ): Promise<OrganizationSummary> {
    const key = resolveKey(orgKey);
    return this.request('PUT', `${this.paths.orgRoot(key)}/`, { jsonBody: payload });
  }

  async listRegions(): Promise<RegionInfo[]> {
    const payload = (await this.request('GET', '/regions/')) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async getAvailablePlans(): Promise<OrganizationPlanStatus> {
    return this.request('GET', '/plans/');
  }

  async getOrganizationPlan(orgKey: OrgRef): Promise<OrganizationPlanStatus> {
    const key = resolveKey(orgKey);
    return this.request('GET', `${this.paths.orgRoot(key)}/plan/`);
  }

  async setOrganizationPlan(
    orgKey: OrgRef,
    planCode: string,
  ): Promise<OrganizationPlanStatus> {
    const key = resolveKey(orgKey);
    return this.request('POST', `${this.paths.orgRoot(key)}/plan/${planCode}/`);
  }

  async getOrganizationUsage(orgKey: OrgRef): Promise<OrganizationUsage> {
    const key = resolveKey(orgKey);
    return this.request('GET', `${this.paths.orgRoot(key)}/usage/`);
  }

  // ------------------------------------------------------------------ //
  // Management API key operations
  // ------------------------------------------------------------------ //

  async listManagementApiKeys(params?: Record<string, any>): Promise<ManagementAPIKeyList> {
    return this.request('GET', `${this.paths.managementApiKeysRoot()}/`, { params });
  }

  async createManagementApiKey(payload: Record<string, any>): Promise<ManagementAPIKeySummary> {
    return this.request('POST', `${this.paths.managementApiKeysRoot()}/`, {
      jsonBody: payload,
    });
  }

  async getManagementApiKey(key: ManagementAPIKeyRef): Promise<ManagementAPIKeySummary> {
    const k = resolveKey(key);
    return this.request('GET', `${this.paths.managementApiKeyRoot(k)}/`);
  }

  async updateManagementApiKey(
    key: ManagementAPIKeyRef,
    payload: Record<string, any>,
  ): Promise<ManagementAPIKeySummary> {
    const k = resolveKey(key);
    return this.request('PUT', `${this.paths.managementApiKeyRoot(k)}/`, {
      jsonBody: payload,
    });
  }

  async deleteManagementApiKey(key: ManagementAPIKeyRef): Promise<void> {
    const k = resolveKey(key);
    await this.request('DELETE', `${this.paths.managementApiKeyRoot(k)}/`, {
      parseJson: false,
    });
  }

  // ------------------------------------------------------------------ //
  // Flux API key operations
  // ------------------------------------------------------------------ //

  async listFluxApiKeys(params?: Record<string, any>): Promise<FluxAPIKeyList> {
    return this.request('GET', `${this.paths.fluxApiKeysRoot()}/`, { params });
  }

  async createFluxApiKey(payload: Record<string, any>): Promise<FluxAPIKeySummary> {
    return this.request('POST', `${this.paths.fluxApiKeysRoot()}/`, { jsonBody: payload });
  }

  async getFluxApiKey(key: FluxAPIKeyRef): Promise<FluxAPIKeySummary> {
    const k = resolveKey(key);
    return this.request('GET', `${this.paths.fluxApiKeyRoot(k)}/`);
  }

  async updateFluxApiKey(
    key: FluxAPIKeyRef,
    payload: Record<string, any>,
  ): Promise<FluxAPIKeySummary> {
    const k = resolveKey(key);
    return this.request('PUT', `${this.paths.fluxApiKeyRoot(k)}/`, { jsonBody: payload });
  }

  async deleteFluxApiKey(key: FluxAPIKeyRef): Promise<void> {
    const k = resolveKey(key);
    await this.request('DELETE', `${this.paths.fluxApiKeyRoot(k)}/`, { parseJson: false });
  }

  // ------------------------------------------------------------------ //
  // API management operations
  // ------------------------------------------------------------------ //

  async listApis(params?: Record<string, any>): Promise<APIList> {
    return this.request('GET', `${this.paths.apisRoot()}/`, { params });
  }

  async createApi(payload: Record<string, any>): Promise<APIInfo> {
    return this.request('POST', `${this.paths.apisRoot()}/`, { jsonBody: payload });
  }

  async getApi(apiKey: APIRef): Promise<APIInfo> {
    const key = resolveKey(apiKey);
    return this.request('GET', `${this.paths.apiRoot(key)}/`);
  }

  async updateApi(apiKey: APIRef, payload: Record<string, any>): Promise<APIInfo> {
    const key = resolveKey(apiKey);
    return this.request('PUT', `${this.paths.apiRoot(key)}/`, { jsonBody: payload });
  }

  async deleteApi(apiKey: APIRef): Promise<void> {
    const key = resolveKey(apiKey);
    await this.request('DELETE', `${this.paths.apiRoot(key)}/`, { parseJson: false });
  }

  // ------------------------------------------------------------------ //
  // API Folder associations
  // ------------------------------------------------------------------ //

  async listApiFolders(apiKey: APIRef, params?: Record<string, any>): Promise<APIFolderList> {
    const key = resolveKey(apiKey);
    return this.request('GET', `${this.paths.apiFoldersRoot(key)}/`, { params });
  }

  async addApiFolder(
    apiKey: APIRef,
    folderKey: FolderRef,
    options?: { allowedMethods?: string[] },
  ): Promise<APIFolderSummary> {
    const aKey = resolveKey(apiKey);
    const fKey = resolveKey(folderKey);
    const body: Record<string, any> = { folder: fKey };
    if (options?.allowedMethods) {
      body.allowed_methods = options.allowedMethods;
    }
    return this.request('POST', `${this.paths.apiFoldersRoot(aKey)}/`, { jsonBody: body });
  }

  async getApiFolder(apiKey: APIRef, folderKey: FolderRef): Promise<APIFolderSummary> {
    const aKey = resolveKey(apiKey);
    const fKey = resolveKey(folderKey);
    return this.request('GET', `${this.paths.apiFoldersRoot(aKey)}/${fKey}/`);
  }

  async updateApiFolder(
    apiKey: APIRef,
    folderKey: FolderRef,
    options?: { allowedMethods?: string[] },
  ): Promise<APIFolderSummary> {
    const aKey = resolveKey(apiKey);
    const fKey = resolveKey(folderKey);
    const body: Record<string, any> = {};
    if (options?.allowedMethods) {
      body.allowed_methods = options.allowedMethods;
    }
    return this.request('PUT', `${this.paths.apiFoldersRoot(aKey)}/${fKey}/`, {
      jsonBody: body,
    });
  }

  async removeApiFolder(apiKey: APIRef, folderKey: FolderRef): Promise<void> {
    const aKey = resolveKey(apiKey);
    const fKey = resolveKey(folderKey);
    await this.request('DELETE', `${this.paths.apiFoldersRoot(aKey)}/${fKey}/`, {
      parseJson: false,
    });
  }

  // ------------------------------------------------------------------ //
  // Management role operations
  // ------------------------------------------------------------------ //

  async listManagementRoles(params?: Record<string, any>): Promise<ManagementRoleList> {
    return this.request('GET', `${this.paths.managementRolesRoot()}/`, { params });
  }

  async createManagementRole(payload: Record<string, any>): Promise<ManagementRoleSummary> {
    return this.request('POST', `${this.paths.managementRolesRoot()}/`, {
      jsonBody: payload,
    });
  }

  async getManagementRole(roleKey: ManagementRoleRef): Promise<ManagementRoleSummary> {
    const key = resolveKey(roleKey);
    return this.request('GET', `${this.paths.managementRoleRoot(key)}/`);
  }

  async updateManagementRole(
    roleKey: ManagementRoleRef,
    payload: Record<string, any>,
  ): Promise<ManagementRoleSummary> {
    const key = resolveKey(roleKey);
    return this.request('PUT', `${this.paths.managementRoleRoot(key)}/`, {
      jsonBody: payload,
    });
  }

  async deleteManagementRole(roleKey: ManagementRoleRef): Promise<void> {
    const key = resolveKey(roleKey);
    await this.request('DELETE', `${this.paths.managementRoleRoot(key)}/`, {
      parseJson: false,
    });
  }

  // Management role permissions

  async listManagementRolePermissions(roleKey: ManagementRoleRef): Promise<RolePermission[]> {
    const key = resolveKey(roleKey);
    const payload = (await this.request('GET', `${this.paths.rolePermissionsRoot(key)}/`)) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async upsertManagementRolePermission(
    roleKey: ManagementRoleRef,
    payload: Record<string, any>,
  ): Promise<RolePermission> {
    const key = resolveKey(roleKey);
    return this.request('PUT', `${this.paths.rolePermissionsRoot(key)}/`, {
      jsonBody: payload,
    });
  }

  async deleteManagementRolePermission(
    roleKey: ManagementRoleRef,
    contentType: string,
  ): Promise<void> {
    const key = resolveKey(roleKey);
    await this.request('DELETE', `${this.paths.rolePermissionsRoot(key)}/${contentType}/`, {
      parseJson: false,
    });
  }

  async replaceManagementRolePermissions(
    roleKey: ManagementRoleRef,
    permissions: Array<Record<string, any>>,
  ): Promise<RolePermission[]> {
    const key = resolveKey(roleKey);
    const payload = await this.request('PUT', `${this.paths.rolePermissionsBatch(key)}/`, {
      jsonBody: permissions,
    });
    return Array.isArray(payload) ? payload : [payload];
  }

  // Management permission objects

  async listManagementPermissionObjects(
    roleKey: ManagementRoleRef,
    contentType: string,
  ): Promise<RolePermissionObject[]> {
    const key = resolveKey(roleKey);
    const payload =
      (await this.request('GET', `${this.paths.rolePermissionObjectsRoot(key)}/`, {
        params: { content_type: contentType },
      })) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async addManagementPermissionObject(
    roleKey: ManagementRoleRef,
    payload: Record<string, any>,
  ): Promise<RolePermissionObject> {
    const key = resolveKey(roleKey);
    return this.request('POST', `${this.paths.rolePermissionObjectsRoot(key)}/`, {
      jsonBody: payload,
    });
  }

  async deleteManagementPermissionObject(
    roleKey: ManagementRoleRef,
    payload: Record<string, any>,
  ): Promise<void> {
    const key = resolveKey(roleKey);
    await this.request('DELETE', `${this.paths.rolePermissionObjectsRoot(key)}/`, {
      jsonBody: payload,
      parseJson: false,
    });
  }

  // ------------------------------------------------------------------ //
  // Flux role operations
  // ------------------------------------------------------------------ //

  async listFluxRoles(params?: Record<string, any>): Promise<FluxRoleList> {
    return this.request('GET', `${this.paths.fluxRolesRoot()}/`, { params });
  }

  async createFluxRole(payload: Record<string, any>): Promise<FluxRoleSummary> {
    return this.request('POST', `${this.paths.fluxRolesRoot()}/`, { jsonBody: payload });
  }

  async getFluxRole(roleKey: FluxRoleRef): Promise<FluxRoleSummary> {
    const key = resolveKey(roleKey);
    return this.request('GET', `${this.paths.fluxRoleRoot(key)}/`);
  }

  async updateFluxRole(
    roleKey: FluxRoleRef,
    payload: Record<string, any>,
  ): Promise<FluxRoleSummary> {
    const key = resolveKey(roleKey);
    return this.request('PUT', `${this.paths.fluxRoleRoot(key)}/`, { jsonBody: payload });
  }

  async deleteFluxRole(roleKey: FluxRoleRef): Promise<void> {
    const key = resolveKey(roleKey);
    await this.request('DELETE', `${this.paths.fluxRoleRoot(key)}/`, { parseJson: false });
  }

  // Flux role permissions

  async listFluxRolePermissions(roleKey: FluxRoleRef): Promise<RolePermission[]> {
    const key = resolveKey(roleKey);
    const payload =
      (await this.request('GET', `${this.paths.fluxRolePermissionsRoot(key)}/`)) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async upsertFluxRolePermission(
    roleKey: FluxRoleRef,
    payload: Record<string, any>,
  ): Promise<RolePermission> {
    const key = resolveKey(roleKey);
    return this.request('PUT', `${this.paths.fluxRolePermissionsRoot(key)}/`, {
      jsonBody: payload,
    });
  }

  async deleteFluxRolePermission(roleKey: FluxRoleRef, contentType: string): Promise<void> {
    const key = resolveKey(roleKey);
    await this.request(
      'DELETE',
      `${this.paths.fluxRolePermissionsRoot(key)}/${contentType}/`,
      { parseJson: false },
    );
  }

  async replaceFluxRolePermissions(
    roleKey: FluxRoleRef,
    permissions: Array<Record<string, any>>,
  ): Promise<RolePermission[]> {
    const key = resolveKey(roleKey);
    const payload = await this.request('PUT', `${this.paths.fluxRolePermissionsBatch(key)}/`, {
      jsonBody: permissions,
    });
    return Array.isArray(payload) ? payload : [payload];
  }

  // Flux permission objects

  async listFluxPermissionObjects(
    roleKey: FluxRoleRef,
    contentType: string,
  ): Promise<RolePermissionObject[]> {
    const key = resolveKey(roleKey);
    const payload =
      (await this.request('GET', `${this.paths.fluxRolePermissionObjectsRoot(key)}/`, {
        params: { content_type: contentType },
      })) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async addFluxPermissionObject(
    roleKey: FluxRoleRef,
    payload: Record<string, any>,
  ): Promise<RolePermissionObject> {
    const key = resolveKey(roleKey);
    return this.request('POST', `${this.paths.fluxRolePermissionObjectsRoot(key)}/`, {
      jsonBody: payload,
    });
  }

  async deleteFluxPermissionObject(
    roleKey: FluxRoleRef,
    payload: Record<string, any>,
  ): Promise<void> {
    const key = resolveKey(roleKey);
    await this.request('DELETE', `${this.paths.fluxRolePermissionObjectsRoot(key)}/`, {
      jsonBody: payload,
      parseJson: false,
    });
  }

  // ------------------------------------------------------------------ //
  // Folder operations
  // ------------------------------------------------------------------ //

  async listFolders(params?: Record<string, any>): Promise<FolderList> {
    return this.request('GET', `${this.paths.foldersRoot()}/`, { params });
  }

  async getFolder(folderKey: FolderRef): Promise<FolderSummary> {
    const key = resolveKey(folderKey);
    return this.request('GET', `${this.paths.folderRoot(key)}/`);
  }

  async getFolderByPath(path: string): Promise<FolderSummary> {
    return this.request('GET', `${this.paths.foldersTreeItem()}/`, {
      params: { path },
    });
  }

  async listFolderTree(options?: {
    key?: string;
    mode?: string;
  }): Promise<FolderList> {
    const params: Record<string, any> = {};
    if (options?.key) params.key = options.key;
    if (options?.mode) params.mode = options.mode;
    return this.request('GET', `${this.paths.foldersTreeRoot()}/`, { params });
  }

  async createFolder(payload: Record<string, any>): Promise<FolderSummary> {
    return this.request('POST', `${this.paths.foldersTreeRoot()}/`, { jsonBody: payload });
  }

  async updateFolder(
    folderKey: FolderRef,
    payload: Record<string, any>,
  ): Promise<FolderSummary> {
    const key = resolveKey(folderKey);
    return this.request('PUT', `${this.paths.folderRoot(key)}/`, { jsonBody: payload });
  }

  async deleteFolder(folderKey: FolderRef): Promise<void> {
    const key = resolveKey(folderKey);
    await this.request('DELETE', `${this.paths.folderRoot(key)}/`, { parseJson: false });
  }

  // ------------------------------------------------------------------ //
  // Folder version operations
  // ------------------------------------------------------------------ //

  async listFolderVersions(
    folderKey: FolderRef,
    params?: Record<string, any>,
  ): Promise<SchemaVersionList> {
    const key = resolveKey(folderKey);
    return this.request('GET', `${this.paths.folderVersionsBase(key)}/`, { params });
  }

  async createFolderVersion(
    folderKey: FolderRef,
    payload: Record<string, any>,
    options?: { copyFrom?: SchemaVersionRef },
  ): Promise<SchemaVersionSummary> {
    const key = resolveKey(folderKey);
    const params: Record<string, any> = {};
    if (options?.copyFrom) {
      params.copy_from = resolveKey(options.copyFrom);
    }
    return this.request('POST', `${this.paths.folderVersionsBase(key)}/`, {
      jsonBody: payload,
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  async getFolderVersion(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    options?: { includeSchema?: boolean },
  ): Promise<SchemaVersionSummary> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    const params: Record<string, any> = {};
    if (options?.includeSchema !== undefined) {
      params.include_schema = options.includeSchema;
    }
    return this.request('GET', `${this.paths.folderVersionsBase(fKey)}/${vKey}/`, {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  async updateFolderVersion(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    payload: Record<string, any>,
  ): Promise<SchemaVersionSummary> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    return this.request('PUT', `${this.paths.folderVersionsBase(fKey)}/${vKey}/`, {
      jsonBody: payload,
    });
  }

  async deleteFolderVersion(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
  ): Promise<void> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    await this.request('DELETE', `${this.paths.folderVersionsBase(fKey)}/${vKey}/`, {
      parseJson: false,
    });
  }

  async publishFolderVersion(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
  ): Promise<SchemaVersionSummary> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    return this.request(
      'POST',
      `${this.paths.folderVersionsBase(fKey)}/${vKey}/publish/`,
    );
  }

  // ------------------------------------------------------------------ //
  // Folder field operations
  // ------------------------------------------------------------------ //

  async listFolderFields(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    params?: Record<string, any>,
  ): Promise<FieldList> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    return this.request('GET', `${this.paths.folderSchemaTree(fKey, vKey)}/`, { params });
  }

  async createFolderField(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    payload: Record<string, any>,
  ): Promise<FieldSummary> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    return this.request('POST', `${this.paths.folderSchemaTree(fKey, vKey)}/`, {
      jsonBody: payload,
    });
  }

  async getFolderField(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    fieldPath: string,
  ): Promise<FieldSummary> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    return this.request(
      'GET',
      `${this.paths.folderSchemaTree(fKey, vKey)}/${fieldPath}/`,
    );
  }

  async updateFolderField(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    fieldPath: string,
    payload: Record<string, any>,
  ): Promise<FieldSummary> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    return this.request(
      'PUT',
      `${this.paths.folderSchemaTree(fKey, vKey)}/${fieldPath}/`,
      { jsonBody: payload },
    );
  }

  async deleteFolderField(
    folderKey: FolderRef,
    versionKey: SchemaVersionRef,
    fieldPath: string,
  ): Promise<void> {
    const fKey = resolveKey(folderKey);
    const vKey = resolveKey(versionKey);
    await this.request(
      'DELETE',
      `${this.paths.folderSchemaTree(fKey, vKey)}/${fieldPath}/`,
      { parseJson: false },
    );
  }

  // ------------------------------------------------------------------ //
  // Component operations
  // ------------------------------------------------------------------ //

  async listComponents(params?: Record<string, any>): Promise<ComponentList> {
    return this.request('GET', `${this.paths.componentsRoot()}/`, { params });
  }

  async getComponent(componentKey: ComponentRef): Promise<ComponentSummary> {
    const key = resolveKey(componentKey);
    return this.request('GET', `${this.paths.componentRoot(key)}/`);
  }

  async createComponent(payload: Record<string, any>): Promise<ComponentSummary> {
    return this.request('POST', `${this.paths.componentsRoot()}/`, { jsonBody: payload });
  }

  async updateComponent(
    componentKey: ComponentRef,
    payload: Record<string, any>,
  ): Promise<ComponentSummary> {
    const key = resolveKey(componentKey);
    return this.request('PUT', `${this.paths.componentRoot(key)}/`, { jsonBody: payload });
  }

  async deleteComponent(componentKey: ComponentRef): Promise<void> {
    const key = resolveKey(componentKey);
    await this.request('DELETE', `${this.paths.componentRoot(key)}/`, { parseJson: false });
  }

  // ------------------------------------------------------------------ //
  // Component version operations
  // ------------------------------------------------------------------ //

  async listComponentVersions(
    componentKey: ComponentRef,
    params?: Record<string, any>,
  ): Promise<SchemaVersionList> {
    const key = resolveKey(componentKey);
    return this.request('GET', `${this.paths.componentVersionsBase(key)}/`, { params });
  }

  async createComponentVersion(
    componentKey: ComponentRef,
    payload: Record<string, any>,
    options?: { copyFrom?: SchemaVersionRef },
  ): Promise<SchemaVersionSummary> {
    const key = resolveKey(componentKey);
    const params: Record<string, any> = {};
    if (options?.copyFrom) {
      params.copy_from = resolveKey(options.copyFrom);
    }
    return this.request('POST', `${this.paths.componentVersionsBase(key)}/`, {
      jsonBody: payload,
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  async getComponentVersion(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    options?: { includeSchema?: boolean },
  ): Promise<SchemaVersionSummary> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    const params: Record<string, any> = {};
    if (options?.includeSchema !== undefined) {
      params.include_schema = options.includeSchema;
    }
    return this.request('GET', `${this.paths.componentVersionsBase(cKey)}/${vKey}/`, {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  async publishComponentVersion(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
  ): Promise<SchemaVersionSummary> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    return this.request(
      'POST',
      `${this.paths.componentVersionsBase(cKey)}/${vKey}/publish/`,
    );
  }

  async updateComponentVersion(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    payload: Record<string, any>,
  ): Promise<SchemaVersionSummary> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    return this.request('PUT', `${this.paths.componentVersionsBase(cKey)}/${vKey}/`, {
      jsonBody: payload,
    });
  }

  async deleteComponentVersion(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
  ): Promise<void> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    await this.request('DELETE', `${this.paths.componentVersionsBase(cKey)}/${vKey}/`, {
      parseJson: false,
    });
  }

  // ------------------------------------------------------------------ //
  // Component field operations
  // ------------------------------------------------------------------ //

  async listComponentFields(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    params?: Record<string, any>,
  ): Promise<FieldList> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    return this.request('GET', `${this.paths.componentSchemaTree(cKey, vKey)}/`, { params });
  }

  async createComponentField(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    payload: Record<string, any>,
  ): Promise<FieldSummary> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    return this.request('POST', `${this.paths.componentSchemaTree(cKey, vKey)}/`, {
      jsonBody: payload,
    });
  }

  async getComponentField(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    fieldPath: string,
  ): Promise<FieldSummary> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    return this.request(
      'GET',
      `${this.paths.componentSchemaTree(cKey, vKey)}/${fieldPath}/`,
    );
  }

  async updateComponentField(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    fieldPath: string,
    payload: Record<string, any>,
  ): Promise<FieldSummary> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    return this.request(
      'PUT',
      `${this.paths.componentSchemaTree(cKey, vKey)}/${fieldPath}/`,
      { jsonBody: payload },
    );
  }

  async deleteComponentField(
    componentKey: ComponentRef,
    versionKey: SchemaVersionRef,
    fieldPath: string,
  ): Promise<void> {
    const cKey = resolveKey(componentKey);
    const vKey = resolveKey(versionKey);
    await this.request(
      'DELETE',
      `${this.paths.componentSchemaTree(cKey, vKey)}/${fieldPath}/`,
      { parseJson: false },
    );
  }

  // ------------------------------------------------------------------ //
  // Resource operations
  // ------------------------------------------------------------------ //

  async listResources(
    folderKey: FolderRef,
    params?: Record<string, any>,
  ): Promise<ResourceList> {
    const key = resolveKey(folderKey);
    return this.request('GET', `${this.paths.resourceBase(key)}/`, { params });
  }

  async getResource(folderKey: FolderRef, resourceKey: ResourceRef): Promise<ResourceSummary> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    return this.request('GET', `${this.paths.resourceBase(fKey)}/${rKey}/`);
  }

  async createResource(
    folderKey: FolderRef,
    payload: Record<string, any>,
    options?: { component?: ComponentRef; externalId?: string },
  ): Promise<ResourceSummary> {
    const key = resolveKey(folderKey);
    const body = { ...payload };
    if (options?.component) {
      body.component = resolveKey(options.component);
    }
    if (options?.externalId) {
      body.external_id = options.externalId;
    }
    return this.request('POST', `${this.paths.resourceBase(key)}/`, { jsonBody: body });
  }

  async upsertResource(
    folderKey: FolderRef,
    payload: Record<string, any>,
    options: { externalId: string; component?: ComponentRef },
  ): Promise<ResourceSummary> {
    const key = resolveKey(folderKey);
    const body: Record<string, any> = { ...payload, external_id: options.externalId };
    if (options.component) {
      body.component = resolveKey(options.component);
    }
    return this.request('PUT', `${this.paths.resourceBase(key)}/`, { jsonBody: body });
  }

  async batchUpsertResources(
    folderKey: FolderRef,
    items: BatchUpsertItem[],
    options?: {
      maxConcurrency?: number;
      failFast?: boolean;
      onProgress?: (completed: number, total: number) => void;
    },
  ): Promise<BatchUpsertResult> {
    const fKey = resolveKey(folderKey);
    const maxConcurrency = options?.maxConcurrency ?? 5;
    const failFast = options?.failFast ?? false;
    const onProgress = options?.onProgress;

    const succeeded: ResourceSummary[] = [];
    const failed: BatchItemError[] = [];
    let completed = 0;

    const queue = [...items.entries()];

    const processItem = async (index: number, item: BatchUpsertItem): Promise<void> => {
      try {
        const body: Record<string, any> = {
          ...item.payload,
          external_id: item.external_id,
        };
        if (item.component) {
          body.component = item.component;
        }
        const result: ResourceSummary = await this.request(
          'PUT',
          `${this.paths.resourceBase(fKey)}/`,
          { jsonBody: body },
        );
        succeeded.push(result);
      } catch (err) {
        failed.push({
          index,
          external_id: item.external_id,
          error: err instanceof Error ? err : new Error(String(err)),
        });
        if (failFast) {
          throw err;
        }
      } finally {
        completed++;
        onProgress?.(completed, items.length);
      }
    };

    // Process in batches of maxConcurrency
    let i = 0;
    while (i < queue.length) {
      const batch = queue.slice(i, i + maxConcurrency);
      try {
        await Promise.all(batch.map(([index, item]) => processItem(index, item)));
      } catch {
        if (failFast) break;
      }
      i += maxConcurrency;
    }

    return { succeeded, failed };
  }

  async updateResource(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    payload: Record<string, any>,
  ): Promise<ResourceSummary> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    return this.request('PUT', `${this.paths.resourceBase(fKey)}/${rKey}/`, {
      jsonBody: payload,
    });
  }

  async deleteResource(folderKey: FolderRef, resourceKey: ResourceRef): Promise<void> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    await this.request('DELETE', `${this.paths.resourceBase(fKey)}/${rKey}/`, {
      parseJson: false,
    });
  }

  async getResourceData(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
  ): Promise<Record<string, any>> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    return this.request('GET', `${this.paths.resourceBase(fKey)}/${rKey}/data/`);
  }

  // ------------------------------------------------------------------ //
  // Revision operations
  // ------------------------------------------------------------------ //

  async listRevisions(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    params?: Record<string, any>,
  ): Promise<RevisionList> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    return this.request('GET', `${this.paths.revisionBase(fKey, rKey)}/`, { params });
  }

  async createRevision(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    payload: Record<string, any>,
  ): Promise<RevisionSummary> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    return this.request('POST', `${this.paths.revisionBase(fKey, rKey)}/`, {
      jsonBody: payload,
    });
  }

  async getRevision(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    revisionKey: RevisionRef,
  ): Promise<RevisionSummary> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    const rvKey = resolveKey(revisionKey);
    return this.request('GET', `${this.paths.revisionBase(fKey, rKey)}/${rvKey}/`);
  }

  async updateRevision(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    revisionKey: RevisionRef,
    payload: Record<string, any>,
  ): Promise<RevisionSummary> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    const rvKey = resolveKey(revisionKey);
    return this.request('PUT', `${this.paths.revisionBase(fKey, rKey)}/${rvKey}/`, {
      jsonBody: payload,
    });
  }

  async deleteRevision(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    revisionKey: RevisionRef,
  ): Promise<void> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    const rvKey = resolveKey(revisionKey);
    await this.request('DELETE', `${this.paths.revisionBase(fKey, rKey)}/${rvKey}/`, {
      parseJson: false,
    });
  }

  async publishRevision(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    revisionKey: RevisionRef,
    payload?: Record<string, any>,
  ): Promise<RevisionSummary> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    const rvKey = resolveKey(revisionKey);
    return this.request(
      'POST',
      `${this.paths.revisionBase(fKey, rKey)}/${rvKey}/publish/`,
      payload ? { jsonBody: payload } : undefined,
    );
  }

  async validateRevision(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    revisionKey: RevisionRef,
  ): Promise<Record<string, any>> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    const rvKey = resolveKey(revisionKey);
    return this.request(
      'POST',
      `${this.paths.revisionBase(fKey, rKey)}/${rvKey}/validate/`,
    );
  }

  async getRevisionData(
    folderKey: FolderRef,
    resourceKey: ResourceRef,
    revisionKey: RevisionRef,
  ): Promise<Record<string, any>> {
    const fKey = resolveKey(folderKey);
    const rKey = resolveKey(resourceKey);
    const rvKey = resolveKey(revisionKey);
    return this.request('GET', `${this.paths.revisionBase(fKey, rKey)}/${rvKey}/data/`);
  }

  // ------------------------------------------------------------------ //
  // Locale operations
  // ------------------------------------------------------------------ //

  async listLocales(): Promise<LocaleList> {
    const payload = (await this.request('GET', `${this.paths.localesRoot()}/`)) ?? [];
    return Array.isArray(payload) ? payload : [payload];
  }

  async createLocale(payload: Record<string, any>): Promise<LocaleSummary> {
    return this.request('POST', `${this.paths.localesRoot()}/`, { jsonBody: payload });
  }

  async getLocale(code: string): Promise<LocaleSummary> {
    return this.request('GET', `${this.paths.localeRoot(code)}/`);
  }

  async updateLocale(code: string, payload: Record<string, any>): Promise<LocaleSummary> {
    return this.request('PUT', `${this.paths.localeRoot(code)}/`, { jsonBody: payload });
  }

  async deleteLocale(code: string): Promise<void> {
    await this.request('DELETE', `${this.paths.localeRoot(code)}/`, { parseJson: false });
  }

  // ------------------------------------------------------------------ //
  // Project operations
  // ------------------------------------------------------------------ //

  async listProjects(orgKey: OrgRef, params?: Record<string, any>): Promise<ProjectList> {
    const key = resolveKey(orgKey);
    return this.request('GET', `${this.paths.projectsBase(key)}/`, { params });
  }

  async getProject(orgKey: OrgRef, projectKey: ProjectRef): Promise<ProjectSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    return this.request('GET', `${this.paths.projectRoot(oKey, pKey)}/`);
  }

  async createProject(orgKey: OrgRef, payload: Record<string, any>): Promise<ProjectSummary> {
    const key = resolveKey(orgKey);
    return this.request('POST', `${this.paths.projectsBase(key)}/`, { jsonBody: payload });
  }

  async updateProject(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    payload: Record<string, any>,
  ): Promise<ProjectSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    return this.request('PUT', `${this.paths.projectRoot(oKey, pKey)}/`, {
      jsonBody: payload,
    });
  }

  async deleteProject(orgKey: OrgRef, projectKey: ProjectRef): Promise<void> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    await this.request('DELETE', `${this.paths.projectRoot(oKey, pKey)}/`, {
      parseJson: false,
    });
  }

  // ------------------------------------------------------------------ //
  // Environment operations
  // ------------------------------------------------------------------ //

  async listEnvironments(
    orgKey: OrgRef,
    projectKey: ProjectRef,
  ): Promise<EnvironmentList> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const payload =
      (await this.request('GET', `${this.paths.environmentsBase(oKey, pKey)}/`)) ?? [];
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && typeof payload === 'object' && 'results' in payload) {
      return (payload as { results: EnvironmentSummary[] }).results;
    }
    return [payload];
  }

  async getEnvironment(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    envKey: EnvironmentRef,
  ): Promise<EnvironmentSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const eKey = resolveKey(envKey);
    return this.request('GET', `${this.paths.environmentRoot(oKey, pKey, eKey)}/`);
  }

  async createEnvironment(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    payload: Record<string, any>,
  ): Promise<EnvironmentSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    return this.request('POST', `${this.paths.environmentsBase(oKey, pKey)}/`, {
      jsonBody: payload,
    });
  }

  async updateEnvironment(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    envKey: EnvironmentRef,
    payload: Record<string, any>,
  ): Promise<EnvironmentSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const eKey = resolveKey(envKey);
    return this.request('PUT', `${this.paths.environmentRoot(oKey, pKey, eKey)}/`, {
      jsonBody: payload,
    });
  }

  async deleteEnvironment(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    envKey: EnvironmentRef,
  ): Promise<void> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const eKey = resolveKey(envKey);
    await this.request('DELETE', `${this.paths.environmentRoot(oKey, pKey, eKey)}/`, {
      parseJson: false,
    });
  }

  async toggleEnvironment(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    envKey: EnvironmentRef,
    isEnabled: boolean,
  ): Promise<void> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const eKey = resolveKey(envKey);
    await this.request(
      'POST',
      `${this.paths.environmentRoot(oKey, pKey, eKey)}/toggle/`,
      { jsonBody: { is_enabled: isEnabled } },
    );
  }

  async updateEnvironmentProtection(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    envKey: EnvironmentRef,
    options: { protectionLevel: string; protectionReason?: string },
  ): Promise<EnvironmentSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const eKey = resolveKey(envKey);
    const body: Record<string, any> = { protection_level: options.protectionLevel };
    if (options.protectionReason) {
      body.protection_reason = options.protectionReason;
    }
    return this.request(
      'POST',
      `${this.paths.environmentRoot(oKey, pKey, eKey)}/protect/`,
      { jsonBody: body },
    );
  }

  async clearEnvironmentProtection(
    orgKey: OrgRef,
    projectKey: ProjectRef,
    envKey: EnvironmentRef,
  ): Promise<EnvironmentSummary> {
    const oKey = resolveKey(orgKey);
    const pKey = resolveKey(projectKey);
    const eKey = resolveKey(envKey);
    return this.request(
      'POST',
      `${this.paths.environmentRoot(oKey, pKey, eKey)}/unprotect/`,
    );
  }
}
