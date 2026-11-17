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
export { createConfig, DEFAULT_RETRY_CONFIG, DEFAULT_USER_AGENT, SDK_VERSION } from './config.js';

// Errors
export {
  FoxnoseError,
  FoxnoseAPIError,
  FoxnoseAuthError,
  FoxnoseTransportError,
  SpendCapExceededError,
  PlanExhaustedError,
  FilesQuotaExceededError,
  FilesQuotaUnavailableError,
  PlanLimitExceededError,
  RateLimitExceededError,
  CollectionNotWritableError,
  ExternalIdConflictError,
  ContentValidationFailedError,
  UpstreamError,
} from './errors.js';

// HTTP Transport
export { HttpTransport } from './http.js';

// Management Client
export { ManagementClient } from './management/index.js';
export type {
  ApiFolderOptions,
  ApiFolderRouteDescriptionOptions,
  ManagementClientOptions,
} from './management/index.js';

// Flux Client
export { FluxClient } from './flux/index.js';
export { SearchMode, buildSearchBody } from './flux/index.js';
export type {
  FluxClientOptions,
  VectorSearchOptions,
  VectorFieldSearchOptions,
  HybridSearchOptions,
  BoostedSearchOptions,
} from './flux/index.js';
export type {
  VectorSearch,
  VectorFieldSearch,
  VectorBoostConfig,
  HybridConfig,
  SearchRequest,
  UploadFileStatus,
  UploadSignature,
  UploadStatus,
} from './flux/index.js';

// Models
export type {
  PaginatedResponse,
  ResourceSummary,
  ResourceList,
  RevisionSummary,
  RevisionList,
  FolderSummary,
  FolderList,
  CollectionSummary,
  CollectionList,
  ComponentSummary,
  ComponentList,
  SchemaVersionSummary,
  SchemaVersionList,
  FieldSummary,
  FieldList,
  NestedFieldMeta,
  SyncComponentSkippedItem,
  SyncComponentResponse,
  ComponentSyncConflictDetail,
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
  FluxAPIKeyBearerToken,
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
  APICollectionSummary,
  APICollectionList,
  FlatRoute,
  FlatRouteSummary,
  OrganizationOwner,
  OrganizationSummary,
  OrganizationList,
  PlanLimits,
  PlanDetails,
  OrganizationPlanStatus,
  OrganizationUsage,
  UnitsUsage,
  StorageUsage,
  UsageMetric,
  UsageBreakdown,
  CurrentUsage,
  BatchUpsertItem,
  BatchItemError,
  BatchUpsertResult,
  FileKind,
  UploadLinkCreateRequest,
  UploadLinkCreator,
  UploadFileProgress,
  UploadLinkFile,
  UploadLinkSession,
  UploadLink,
  UploadLinkList,
  UploadLinkCreated,
  FileAnalysis,
  FileCheck,
  FileFinding,
  FileCopyAvailability,
  FileActiveContent,
  FileDownloadOptions,
  FileRecordView,
  FileDownload,
  FilePageRedaction,
  FilePageTable,
  FilePageDetail,
  FileTombstone,
  FileTombstoneList,
  FileFindingsSummary,
  FileReviewItem,
  FileReviewQueue,
  FilesPolicyBody,
  FilesPolicy,
  FileSummary,
  FileRecordOwner,
  FileInfo,
  FileEvidencePart,
  FileTextEvidence,
  FileTrust,
  FilePagePii,
  FileFindingGroup,
  FilePageFinding,
  EnvironmentAccess,
  ContentTypeAccess,
  MyPermissions,
  FileOrigin,
  FileOriginActor,
  FileOriginLink,
  // Ref types
  FolderRef,
  CollectionRef,
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

export { resolveKey, nestedFieldMeta, parseFindingEvidence } from './management/models.js';

export { SDK_VERSION as VERSION } from './config.js';
