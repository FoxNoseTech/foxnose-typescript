// Auth
export {
  AnonymousAuth,
  JWTAuth,
  SecureKeyAuth,
  SimpleKeyAuth,
  StaticTokenProvider,
} from './auth/index.js';
export type { AuthStrategy, RequestData, TokenProvider } from './auth/index.js';

// Config
export type { FoxnoseConfig, RetryConfig } from './config.js';
export { createConfig, DEFAULT_RETRY_CONFIG, DEFAULT_USER_AGENT } from './config.js';

// Errors
export {
  FoxnoseError,
  FoxnoseAPIError,
  FoxnoseAuthError,
  FoxnoseTransportError,
} from './errors.js';

// HTTP Transport
export { HttpTransport } from './http.js';

// Management Client
export { ManagementClient } from './management/index.js';
export type { ManagementClientOptions } from './management/index.js';

// Flux Client
export { FluxClient } from './flux/index.js';
export type { FluxClientOptions } from './flux/index.js';

// Models
export type {
  PaginatedResponse,
  ResourceSummary,
  ResourceList,
  RevisionSummary,
  RevisionList,
  FolderSummary,
  FolderList,
  ComponentSummary,
  ComponentList,
  SchemaVersionSummary,
  SchemaVersionList,
  FieldSummary,
  FieldList,
  RegionInfo,
  ProjectSummary,
  ProjectList,
  UserReference,
  EnvironmentSummary,
  EnvironmentList,
  LocaleSummary,
  LocaleList,
  ManagementAPIKeySummary,
  ManagementAPIKeyList,
  FluxAPIKeySummary,
  FluxAPIKeyList,
  ManagementRoleSummary,
  ManagementRoleList,
  RolePermission,
  RolePermissionObject,
  FluxRoleSummary,
  FluxRoleList,
  APIInfo,
  APIList,
  APIFolderSummary,
  APIFolderList,
  OrganizationOwner,
  OrganizationSummary,
  OrganizationList,
  PlanLimits,
  PlanDetails,
  OrganizationPlanStatus,
  OrganizationUsage,
  BatchUpsertItem,
  BatchItemError,
  BatchUpsertResult,
  // Ref types
  FolderRef,
  ResourceRef,
  RevisionRef,
  ComponentRef,
  SchemaVersionRef,
  OrgRef,
  ProjectRef,
  EnvironmentRef,
  ManagementRoleRef,
  FluxRoleRef,
  ManagementAPIKeyRef,
  FluxAPIKeyRef,
  APIRef,
} from './management/models.js';

export { resolveKey } from './management/models.js';

export const VERSION = '0.1.0';
