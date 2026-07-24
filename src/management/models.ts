// ---------------------------------------------------------------------------
// Generic pagination
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---------------------------------------------------------------------------
// Resources & Revisions
// ---------------------------------------------------------------------------

export interface ResourceSummary {
  key: string;
  folder: string;
  content_type: string;
  created_at: string;
  vectors_size: number;
  name?: string | null;
  resource_owner?: string | null;
  current_revision?: string | null;
  external_id?: string | null;
}

export interface RevisionSummary {
  key: string;
  resource: string;
  schema_version: string;
  number: number;
  size: number;
  created_at: string;
  status: string;
  is_valid: boolean | null;
  published_at: string | null;
  unpublished_at: string | null;
}

export type ResourceList = PaginatedResponse<ResourceSummary>;
export type RevisionList = PaginatedResponse<RevisionSummary>;

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export interface FolderSummary {
  key: string;
  name: string;
  alias: string;
  content_type: string;
  strict_reference: boolean;
  created_at: string;
  parent?: string | null;
  mode?: string | null;
  path?: string | null;
  auto_remove_revisions?: number | null;
  auto_remove_schema_versions?: number | null;
  embedding_model?: string | null;
  embedding_dimension?: number | null;
}

export type FolderList = PaginatedResponse<FolderSummary>;

// Collection-named aliases — same shape, preferred name in new code.
/** @public Alias of {@link FolderSummary}. */
export type CollectionSummary = FolderSummary;
/** @public Alias of {@link FolderList}. */
export type CollectionList = FolderList;

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export interface ComponentSummary {
  key: string;
  name: string;
  description?: string | null;
  environment: string;
  content_type: string;
  created_at: string;
  current_version?: string | null;
}

export type ComponentList = PaginatedResponse<ComponentSummary>;

// ---------------------------------------------------------------------------
// Schema versions & fields
// ---------------------------------------------------------------------------

export interface SchemaVersionSummary {
  key: string;
  name: string;
  description: string | null;
  version_number: number | null;
  created_at: string;
  published_at: string | null;
  archived_at: string | null;
  json_schema?: Record<string, any> | null;
}

export interface FieldSummary {
  key: string;
  name: string;
  description: string | null;
  path: string;
  parent: string | null;
  type: string;
  meta: Record<string, any>;
  json_schema?: Record<string, any> | null;
  required: boolean;
  nullable: boolean;
  multiple?: boolean | null;
  localizable?: boolean | null;
  searchable?: boolean | null;
  private: boolean;
  vectorizable?: boolean | null;
  [extra: string]: any;
}

export type SchemaVersionList = PaginatedResponse<SchemaVersionSummary>;
export type FieldList = PaginatedResponse<FieldSummary>;

// ---------------------------------------------------------------------------
// Component composition: nested field meta + sync_component
// ---------------------------------------------------------------------------

/**
 * Helper shape for the `meta` block of a Collection `nested` field.
 *
 * A `nested` field on a Collection schema embeds a Component schema at a
 * specific published version. The pin is required: even in auto-update
 * mode, `component_version` stores the most recently resolved version and
 * acts as a fallback if a future Component publish fails compatibility.
 *
 * Pass an object of this shape (or use {@link nestedFieldMeta}) as the
 * `meta` value when calling
 * {@link ManagementClient.createCollectionField} or
 * {@link ManagementClient.updateCollectionField}.
 *
 * @example
 * ```ts
 * await client.createCollectionField('articles', 'v1-draft', {
 *   key: 'seo',
 *   name: 'SEO',
 *   type: 'nested',
 *   required: true,
 *   meta: nestedFieldMeta({
 *     component: 'cmp-seo-metadata',
 *     componentVersion: 'ver-abc12345',
 *     autoUpdate: true,
 *   }),
 * });
 * ```
 */
export interface NestedFieldMeta {
  component: string;
  component_version: string;
  auto_update?: boolean;
  [extra: string]: any;
}

/**
 * Build a {@link NestedFieldMeta} payload from camelCase ergonomics.
 *
 * The wire shape uses snake_case keys (`component_version`, `auto_update`);
 * this helper lets callers pass `componentVersion` / `autoUpdate` and
 * emits the right object.
 */
export function nestedFieldMeta(opts: {
  component: string;
  componentVersion: string;
  autoUpdate?: boolean;
  /**
   * Any additional meta keys (title, description, …) the API accepts.
   * `component`, `component_version`, and `auto_update` are reserved and
   * cannot be overridden via `extra` — passing them throws so callers see
   * the conflict at the call-site rather than silently winning the merge.
   */
  extra?: Record<string, any>;
}): NestedFieldMeta {
  if (opts.extra) {
    const reserved = ['component', 'component_version', 'auto_update'];
    const collisions = reserved.filter((k) =>
      Object.prototype.hasOwnProperty.call(opts.extra, k),
    );
    if (collisions.length > 0) {
      throw new Error(
        `nestedFieldMeta: 'extra' must not include reserved keys: ${collisions.join(', ')}`,
      );
    }
  }
  return {
    ...(opts.extra ?? {}),
    component: opts.component,
    component_version: opts.componentVersion,
    auto_update: opts.autoUpdate ?? false,
  };
}

/**
 * One entry in the `skipped` list of a sync_component response.
 *
 * `reason` is one of:
 *   - `"not_requested"` — `field_paths` was supplied and this path was not in it.
 *   - `"auto_update_mode"` — the field has `meta.auto_update=true`.
 *   - `"already_at_target"` — the field is already pinned to the requested
 *     target version.
 *   - `"component_not_found"` — referenced Component does not exist in this
 *     environment.
 *   - `"component_unpublished"` — Component has no published `current_version`.
 */
export interface SyncComponentSkippedItem {
  path: string;
  reason: string;
  [extra: string]: any;
}

/**
 * Response payload from
 * `POST /v1/{env}/collections/{key}/sync_component/`.
 *
 * - `syncedPaths` — field paths whose `meta.component_version` was advanced.
 * - `skipped` — per-path skip records explaining why each was left alone.
 * - `schemaVersion` — UID of the newly published Collection schema version.
 *   `null` when no advance was needed (every requested path was skipped).
 */
export interface SyncComponentResponse {
  synced_paths: string[];
  skipped: SyncComponentSkippedItem[];
  schema_version: string | null;
  [extra: string]: any;
}

/**
 * One structured conflict entry inside a 409 `component_sync_conflict`
 * error detail. `blocking_reason` is one of:
 *   - `"required_field_added_no_default"`
 *   - `"type_narrowed"`
 *   - `"field_removed"`
 */
export interface ComponentSyncConflictDetail {
  field_path: string;
  blocking_reason: string;
  [extra: string]: any;
}

// ---------------------------------------------------------------------------
// Regions & Projects
// ---------------------------------------------------------------------------

export interface RegionInfo {
  location: string;
  name: string;
  code: string;
}

export interface ProjectSummary {
  key: string;
  name: string;
  organization: string;
  region: RegionInfo | string;
  environments: Array<Record<string, any>>;
  gdpr?: boolean | null;
  created_at?: string | null;
  [extra: string]: any;
}

export type ProjectList = PaginatedResponse<ProjectSummary>;

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

export interface UserReference {
  key: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface EnvironmentSummary {
  key: string;
  name: string;
  project: string;
  host: string;
  is_enabled: boolean;
  created_at: string;
  protection_level?: string | null;
  protection_level_display?: string | null;
  protected_by_user?: UserReference | null;
  protected_at?: string | null;
  protection_reason?: string | null;
}

export type EnvironmentList = EnvironmentSummary[];

// ---------------------------------------------------------------------------
// Locales
// ---------------------------------------------------------------------------

export interface LocaleSummary {
  name: string;
  code: string;
  environment: string;
  is_default: boolean;
  created_at: string;
}

export type LocaleList = LocaleSummary[];

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ManagementAPIKeySummary {
  key: string;
  description?: string | null;
  public_key: string;
  secret_key: string;
  role?: string | null;
  environment: string;
  created_at: string;
}

export type ManagementAPIKeyList = PaginatedResponse<ManagementAPIKeySummary>;

export interface FluxAPIKeySummary {
  key: string;
  description?: string | null;
  public_key: string;
  secret_key: string;
  role?: string | null;
  environment: string;
  created_at: string;
}

export type FluxAPIKeyList = PaginatedResponse<FluxAPIKeySummary>;

// ---------------------------------------------------------------------------
// Roles & Permissions
// ---------------------------------------------------------------------------

export interface ManagementRoleSummary {
  key: string;
  name: string;
  description?: string | null;
  full_access: boolean;
  environment: string;
  created_at: string;
}

export type ManagementRoleList = PaginatedResponse<ManagementRoleSummary>;

export interface RolePermission {
  content_type: string;
  actions: string[];
  all_objects: boolean;
  objects?: string[] | null;
}

export interface RolePermissionObject {
  content_type: string;
  object_key: string;
}

export interface FluxRoleSummary {
  key: string;
  name: string;
  description?: string | null;
  environment: string;
  created_at: string;
}

export type FluxRoleList = PaginatedResponse<FluxRoleSummary>;

// ---------------------------------------------------------------------------
// APIs
// ---------------------------------------------------------------------------

export interface APIInfo {
  key: string;
  name: string;
  prefix: string;
  description?: string | null;
  environment: string;
  version?: string | null;
  is_auth_required: boolean;
  /** Whether the MCP endpoint (`/{prefix}/_mcp`) is exposed. Defaults to true. */
  mcp_enabled?: boolean;
  /** Whether router introspection (`/{prefix}/_router`) is exposed. Defaults to true. */
  router_introspection_enabled?: boolean;
  /**
   * Allowed browser origins for cross-origin reads. Empty (the default) means
   * CORS is off; `["*"]` allows any origin. Server-validated and normalized.
   * Covers public read traffic only — writes still require a key.
   */
  cors_origins?: string[];
  created_at: string;
  path?: string | null;
}

export type APIList = PaginatedResponse<APIInfo>;

export interface APIFolderSummary {
  folder: string;
  api?: string | null;
  path?: string | null;
  allowed_methods?: string[] | null;
  description_get_one?: string | null;
  description_get_many?: string | null;
  description_search?: string | null;
  description_schema?: string | null;
  created_at?: string | null;
}

export type APIFolderList = PaginatedResponse<APIFolderSummary>;

// Collection-named aliases.
/** @public Alias of {@link APIFolderSummary}. */
export type APICollectionSummary = APIFolderSummary;
/** @public Alias of {@link APIFolderList}. */
export type APICollectionList = APIFolderList;

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface OrganizationOwner {
  key: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface OrganizationSummary {
  key: string;
  name: string;
  owner: OrganizationOwner;
  tax_num: string;
  city: string;
  province: string;
  address: string;
  country_iso: string | null;
  zip_code: string;
  legal_name: string;
  created_at: string;
  block_dt?: string | null;
  block_reason?: string | null;
  is_blocked: boolean;
}

export type OrganizationList = OrganizationSummary[];

// ---------------------------------------------------------------------------
// Plans & Usage
// ---------------------------------------------------------------------------

export interface PlanLimits {
  units_included?: string | null;
  projects?: number | null;
  environments?: number | null;
  folders?: number | null;
  resources?: number | null;
  users?: number | null;
  components?: number | null;
  allow_negative?: boolean | null;
  negative_limit?: number | null;
  unit_cost?: number | null;
  api_keys_max_count?: number | null;
  roles_max_count?: number | null;
  locales_max_count?: number | null;
  schemas_max_count?: number | null;
  schemas_fields_max_count?: number | null;
  flux_api_max_count?: number | null;
  max_component_inheritance_depth?: number | null;
}

export interface PlanDetails {
  code: string;
  name: string;
  price: number;
  from?: string | null;
  to?: string | null;
  transferred?: string | null;
  limits: PlanLimits;
}

export interface OrganizationPlanStatus {
  active_plan: PlanDetails;
  next_plan: PlanDetails;
}

export interface UnitsUsage {
  remained?: string | number | null;
  unit_cost?: number | null;
  allow_negative: boolean;
  negative_limit?: string | null;
}

export interface StorageUsage {
  data_storage: number;
  vector_storage: number;
}

export interface UsageMetric {
  max: number | null;
  current: number;
}

export interface UsageBreakdown {
  projects: UsageMetric;
  resources: UsageMetric;
  users: UsageMetric;
}

export interface CurrentUsage {
  api_requests: number;
  embedding_tokens: Record<string, any>;
}

export interface OrganizationUsage {
  units: UnitsUsage;
  storage: StorageUsage;
  usage: UsageBreakdown;
  current_usage: CurrentUsage;
}

// ---------------------------------------------------------------------------
// Batch upsert helpers
// ---------------------------------------------------------------------------

export interface BatchUpsertItem {
  external_id: string;
  payload: Record<string, any>;
}

export interface BatchItemError {
  index: number;
  external_id: string;
  error: Error;
}

export interface BatchUpsertResult {
  succeeded: ResourceSummary[];
  failed: BatchItemError[];
}

// ---------------------------------------------------------------------------
// Reference types (allow string key or model object)
// ---------------------------------------------------------------------------

export type FolderRef = string | FolderSummary;
/** @public Alias of {@link FolderRef} — preferred name in new code. */
export type CollectionRef = FolderRef;
export type ResourceRef = string | ResourceSummary;
export type RevisionRef = string | RevisionSummary;
export type ComponentRef = string | ComponentSummary;
export type SchemaVersionRef = string | SchemaVersionSummary;
export type OrgRef = string | OrganizationSummary;
export type ProjectRef = string | ProjectSummary;
export type EnvironmentRef = string | EnvironmentSummary;
export type ManagementRoleRef = string | ManagementRoleSummary;
export type FluxRoleRef = string | FluxRoleSummary;
export type ManagementAPIKeyRef = string | ManagementAPIKeySummary;
export type FluxAPIKeyRef = string | FluxAPIKeySummary;
export type APIRef = string | APIInfo;

/**
 * Extract a string key from a value that is either a string or
 * an object with a `key` attribute.
 */
export function resolveKey(value: string | { key: string }): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'key' in value && typeof value.key === 'string') {
    return value.key;
  }
  throw new TypeError(`Expected a string or an object with a 'key' attribute, got ${typeof value}`);
}
