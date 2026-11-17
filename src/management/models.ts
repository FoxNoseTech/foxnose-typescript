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

/** Where a file stands in the processing steps. */
export interface UploadFileProgress {
  step: number;
  of: number;
  step_name: string | null;
}

/** The file attached to a record or a revision. */
export interface FileSummary {
  uuid: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  cdn_url_base: string | null;
  filename: string | null;
  size: number | null;
  page_count: number | null;
}

/**
 * The parent record of a file record. `title` is `null` when the caller may not
 * read the owner, and `deleted` is `true` for a parent that was deleted.
 */
export interface FileRecordOwner {
  key: string;
  title: string | null;
  deleted?: boolean;
}

/** A file record's newest file, published or not. */
export interface FileInfo {
  filename: string | null;
  mime: string | null;
  size: number | null;
  page_count: number | null;
}

export interface ResourceSummary {
  key: string;
  folder: string;
  content_type: string;
  created_at: string;
  vectors_size: number;
  name?: string | null;
  name_is_auto?: boolean;
  resource_owner?: string | null;
  current_revision?: string | null;
  external_id?: string | null;
  file?: FileSummary | null;
  /** Set on a record of a files collection, like the fields below it. */
  owner?: FileRecordOwner | null;
  status?: string | null;
  progress?: UploadFileProgress | null;
  analysis_state?: string | null;
  /** Short-lived. Keep it out of logs. */
  thumbnail_url?: string | null;
  file_info?: FileInfo | null;
  verdict?: string | null;
  verdict_reasons?: unknown[];
  /** The record's trust summary, where the API computes one. */
  guardrails?: Record<string, unknown> | null;
}

export interface RevisionSummary {
  key: string;
  resource: string;
  /** `null` when the schema version is gone. */
  schema_version: string | null;
  /** `null` for a draft version, and when the schema version is gone. */
  schema_version_number?: number | null;
  file?: FileSummary | null;
  /** The revision's trust summary, where the API computes one. */
  guardrails?: Record<string, unknown> | null;
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
    const collisions = reserved.filter((k) => Object.prototype.hasOwnProperty.call(opts.extra, k));
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
  /**
   * First 12 characters of the key's bearer token (e.g. `fxk_A7fQ2mXe`), or
   * null when none is issued. Enough to recognise a token in a config file or
   * a log; never enough to use one — the token itself is returned only by
   * {@link ManagementClient.issueFluxApiKeyBearerToken}, once.
   */
  bearer_token_prefix?: string | null;
  /** When the current bearer token was issued, or null. */
  bearer_token_issued_at?: string | null;
}

export type FluxAPIKeyList = PaginatedResponse<FluxAPIKeySummary>;

/**
 * The one-time response from issuing or re-issuing a Flux key's bearer token.
 *
 * A bearer token is an opaque credential bound to a Flux API key, for hosted
 * MCP connectors that can only send `Authorization: Bearer <token>` and cannot
 * choose a scheme. It identifies the key and nothing more: role, grants and
 * per-collection permissions are the key's own.
 */
export interface FluxAPIKeyBearerToken {
  /**
   * The credential, e.g. `fxk_A7fQ2mXe...`. RETURNED ONLY HERE, ONLY ONCE —
   * the service stores a hash, so a lost token is re-issued, not recovered.
   */
  bearer_token: string;
  /** First 12 characters, also present on every subsequent key read. */
  bearer_token_prefix: string;
  bearer_token_issued_at: string;
}

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

/**
 * One entry in `flat_routes[]` on a collection's connection to an API — a
 * read-only address for a strict-reference collection that omits some
 * number of ancestor keys from the path. `level 0` is fully flat and drops
 * every ancestor key; `level >= 1` keeps the root-most `retained_ancestors`.
 *
 * `omitted_ancestors` and `retained_ancestors` are ancestor UUIDs, not the
 * short collection keys used elsewhere (e.g. `folder`) — do not treat them
 * as interchangeable.
 *
 * `read_methods` is typed as sent by the server, which currently mirrors
 * the connection's `allowed_methods` verbatim rather than filtering by what
 * is actually available at this level (docs and server disagree on both
 * Get Resource at level 0 and Search at any level). Do not "correct" it.
 */
export interface FlatRoute {
  level: number;
  path: string;
  omitted_ancestors: string[];
  retained_ancestors: string[];
  enabled: boolean;
  read_methods: string[];
  available: boolean;
  unavailable_reason: string | null;
  published_generation: number;
  router_generation: number;
}

/**
 * The singular `flat_route` on a connection. Undocumented: it appears to
 * mirror whichever entry of `flat_routes` is enabled, but unlike a
 * {@link FlatRoute} it carries no `level` or `retained_ancestors`. Type it
 * for forward compatibility; build no behavior on it.
 */
export interface FlatRouteSummary {
  path: string;
  omitted_ancestors: string[];
  enabled: boolean;
  read_methods: string[];
  available: boolean;
  unavailable_reason: string | null;
  published_generation: number;
  router_generation: number;
}

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
  /**
   * Ancestor levels (0 = fully flat) exposed as cross-parent read addresses
   * for this connection. Sent together with `unscoped_ancestors` — a level
   * with no corresponding ancestor is rejected by the server. Present on
   * every connection observed (`[]` when unused), not nullable.
   */
  unscoped_levels: number[];
  /**
   * Ancestor UUIDs (not collection keys) left unscoped at the corresponding
   * `unscoped_levels`. Present on every connection observed (`[]` when
   * unused), not nullable.
   */
  unscoped_ancestors: string[];
  /**
   * Present in the response but documented nowhere; semantics unconfirmed.
   * Typed so it is no longer silently dropped. Do not build request-side
   * behavior on it.
   */
  expose_owner: boolean;
  /** Undocumented; see {@link FlatRouteSummary}. Observed `null`, not just absent. */
  flat_route?: FlatRouteSummary | null;
  /** Observed `null` (not `[]`) on a connection with no key-bearing ancestor. */
  flat_routes?: FlatRoute[] | null;
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
  is_verified?: boolean;
  verification_method?: string | null;
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
// Files
// ---------------------------------------------------------------------------

/** A kind of file a collection or an upload link accepts. */
export type FileKind = 'image' | 'document' | 'archive';

/** Body of {@link ManagementClient.createUploadLink}. */
export interface UploadLinkCreateRequest {
  /** The parent record that owns the uploaded files; the caller must be able to read it. */
  owner: ResourceRef;
  /** Heading of the hosted page: 1 to 80 characters, one line. */
  title: string;
  /** Plain text under the heading, up to 500 characters. */
  instructions?: string;
  /** How many files the link accepts, from 1 to 10. Defaults to 1. */
  max_files?: number;
  /** Narrows the collection's kinds for this link. */
  allowed_kinds?: FileKind[];
  /** The link's lifetime in seconds, from 300 to 86400. Defaults to 30 minutes. */
  expires_in?: number;
}

/** Who created an upload link. */
export interface UploadLinkCreator {
  kind: 'user' | 'api_key';
  label: string | null;
  /** The user's uid, for `kind: 'user'`. */
  user?: string;
  /** The key's uid, for `kind: 'api_key'`. */
  key?: string;
}

/** One file uploaded through a link, as the link's owner sees it. */
export interface UploadLinkFile {
  state: 'processing' | 'ready' | 'pending_review' | 'rejected';
  record_key?: string | null;
  public_reason?: string;
  file_name?: string | null;
  progress?: UploadFileProgress;
}

/** One visit to a link's hosted page and the files it uploaded. */
export interface UploadLinkSession {
  created_at: string | null;
  expires_at: string | null;
  files: UploadLinkFile[];
}

/** An upload link with its sessions and the status of each file. */
export interface UploadLink {
  upload_id: string;
  created_by: UploadLinkCreator | null;
  owner_key: string | null;
  title: string | null;
  instructions: string | null;
  max_files: number;
  allowed_kinds: string[];
  consumed_count: number;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  state: 'active' | 'consumed' | 'expired' | 'revoked';
  sessions: UploadLinkSession[];
}

export type UploadLinkList = PaginatedResponse<UploadLink>;

/**
 * The answer to creating an upload link. `upload_url` carries the link's token
 * and is returned only here: no later read reproduces it. Keep it out of logs.
 */
export interface UploadLinkCreated {
  upload_id: string;
  title: string;
  instructions: string | null;
  upload_url: string;
  expires_at: string;
  max_files: number;
  allowed_kinds: string[];
}

/** The active analysis of a file. */
export interface FileAnalysis {
  generation: number;
  state: string;
  verdict: string | null;
  verdict_reasons: unknown[];
  public_reason: string | null;
  error_code: string | null;
  in_review: boolean;
  publish_requested_by: string | null;
  policy_version: number | null;
  pipeline_version: string | null;
  source_format: string | null;
  scanned_at: string | null;
  step_times: Record<string, unknown>;
  state_changed_at: string | null;
  created_at: string | null;
}

/** The receipt of one check that ran on a file. */
export interface FileCheck {
  detector: string;
  detector_version: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
}

/** The text of one zone of a finding. */
export interface FileEvidencePart {
  box?: unknown;
  text?: string;
}

/**
 * The concealed or withheld text a finding holds, as it was in the file.
 *
 * `parts` says which text lies in which box of the page. It is empty for a finding
 * that does not carry it, so fall back to `text`.
 */
export interface FileTextEvidence {
  page?: number;
  box?: unknown;
  tokens?: number;
  text?: string;
  samples?: string[];
  reason?: string;
  parts: FileEvidencePart[];
  truncated?: boolean;
  list_truncated?: boolean;
  omitted?: number;
}

/** One finding of an analysis. */
export interface FileFinding {
  kind: string;
  sub_kind: string | null;
  severity: string;
  page: number | null;
  box: unknown;
  detector: string | null;
  detector_version: string | null;
  score: number | null;
  /**
   * The stored string, `null` once a blocked or rejected file's personal data is
   * redacted. It can quote text from the file. {@link parseFindingEvidence} reads it
   * for a finding that holds text.
   */
  evidence: string | null;
  detail: Record<string, unknown> | null;
  rule_id: string | null;
}

/** Whether one copy of a file can be downloaded now, and why not if it cannot. */
export interface FileCopyAvailability {
  available: boolean;
  reason: string | null;
}

/** Active content found in a file. `present` is `null` when it is unknown. */
export interface FileActiveContent {
  present?: boolean | null;
  kinds?: Record<string, number>;
  truncated?: boolean;
}

/** Who started an upload. `name` is `null` when it cannot be found. */
export interface FileOriginActor {
  kind: 'user' | 'management_key' | 'flux_key';
  name: string | null;
}

/** The upload link a file came through. */
export interface FileOriginLink {
  upload_id: string;
  title: string | null;
}

/**
 * Where a record's file came from. `external` is true for a file that came from
 * outside the team. `end_user` is the identifier given when an end user's upload was
 * signed: personal data, so keep it out of logs.
 */
export interface FileOrigin {
  channel: 'upload_link' | 'signed_upload' | 'management_api' | 'dashboard' | null;
  external: boolean;
  created_by: FileOriginActor | null;
  upload_link: FileOriginLink | null;
  end_user: string | null;
}

/**
 * What the caller may download of a record's file, and where it came from. `origin`
 * is set on `getFileAnalysis` for a file bound to the record, and `null` for a record
 * uploaded without an intent.
 */
export interface FileDownloadOptions {
  original: FileCopyAvailability;
  safe_copy: FileCopyAvailability;
  active_content: FileActiveContent;
  original_access: string;
  origin?: FileOrigin | null;
}

/** How agent surfaces mark the file's content. */
export interface FileTrust {
  processing: string;
  content_tainted: boolean;
  tainted_paths: string[];
}

/** A record's file, its active analysis, check receipts and findings. */
export interface FileRecordView {
  resource_key: string;
  file_uuid: string | null;
  page_count: number | null;
  asset_state: string | null;
  tombstone: boolean;
  trust: FileTrust | null;
  analysis: FileAnalysis | null;
  checks: FileCheck[];
  findings: FileFinding[];
  file: FileDownloadOptions | null;
  /** Set on the answer to an approval only. */
  outcome?: string;
  /** Set on the answer to an approval only. */
  reason?: string | null;
}

/** A short-lived link to one copy of a file. Keep `url` out of logs. */
export interface FileDownload {
  url: string;
  expires_in: number | null;
  expires_at: string | null;
  kind: 'original' | 'safe_copy' | 'page';
  filename: string | null;
  content_type: string | null;
  generation: number | null;
  state: string | null;
  active_content: FileActiveContent | null;
  warnings: Record<string, unknown>[];
}

/** A region withheld from a page image. */
export interface FilePageRedaction {
  reason: string;
  box: number[];
  label: string | null;
}

/** A table found on a page. */
export interface FilePageTable {
  box: unknown;
}

/**
 * Where personal data stands on a page. `unreliable` marks data found only in text
 * read with low confidence. The matched text is never included.
 */
export interface FilePagePii {
  type: string;
  label: string | null;
  box: number[];
  unreliable?: boolean;
}

/** The findings of a file that share a kind, severity and source. */
export interface FileFindingGroup {
  code: string;
  sub_kind: string | null;
  severity: string;
  source: string;
  pages: number[];
  removed_from_agents: boolean;
  label?: string;
  rule_id?: string;
}

/** A finding of one page. `box` is `null` when it has no place on the page. */
export interface FilePageFinding {
  code: string;
  sub_kind: string | null;
  severity: string;
  source: string;
  box: number[] | null;
  removed_from_agents: boolean;
  label?: string;
  rule_id?: string;
}

/**
 * One page of a file. `image_url` is short-lived. `redactions`, `tables`, `text`,
 * `content_flags`, `pii` and `pii_truncated` are `null` for a page without extracted
 * text. With `pii_truncated` true, an empty `pii` means locations were discarded, not
 * that none were found.
 *
 * `findings` covers the whole file and `page_findings` this page. Neither carries
 * evidence. `removed_passages` counts the file's findings whose text is withheld from
 * agents.
 */
export interface FilePageDetail {
  page: number;
  of: number | null;
  image_url: string;
  image_width: number | null;
  image_height: number | null;
  expires_in: number | null;
  redactions: FilePageRedaction[] | null;
  tables: FilePageTable[] | null;
  text: string | null;
  content_flags: Record<string, unknown>[] | null;
  pii: FilePagePii[] | null;
  pii_truncated: boolean | null;
  findings: FileFindingGroup[];
  page_findings: FilePageFinding[];
  removed_passages: number;
  trust: FileTrust;
  verdict: string | null;
  reasons: unknown[];
  generation: number | null;
  state: string | null;
}

/**
 * A blocked or rejected file. `original_filename`, `raw_payload`, `uploaded_by`,
 * `owner_key` and each finding's `evidence` are `null` once `redacted` is true.
 */
export interface FileTombstone {
  resource_key: string | null;
  file_uuid: string | null;
  reason: string;
  public_reason: string | null;
  error_code: string | null;
  verdict_reasons: unknown[];
  generation: number | null;
  asset_state: string | null;
  blocked_at: string | null;
  purge_completed_at: string | null;
  redacts_at: string | null;
  redacted: boolean;
  original_filename: string | null;
  raw_payload: unknown;
  uploaded_by: string | null;
  owner_key: string | null;
  findings: FileFinding[];
}

export type FileTombstoneList = PaginatedResponse<FileTombstone>;

/** Counts of a file's findings. */
export interface FileFindingsSummary {
  total: number;
  by_kind: Record<string, number>;
  by_severity: Record<string, number>;
}

/**
 * A file held for a reviewer. `owner` is `null` outside a strict collection.
 * `thumbnail_url` is short-lived; it is `null` for a caller who is not the record's
 * reviewer, for a file held by moderation and over the project's view budget.
 */
export interface FileReviewItem {
  resource_key: string;
  file_uuid: string | null;
  collection: string;
  file_name: string | null;
  generation: number | null;
  state: string | null;
  verdict: string | null;
  verdict_reasons: unknown[];
  public_reason: string | null;
  findings: FileFindingsSummary;
  owner: Record<string, unknown> | null;
  held_at: string | null;
  thumbnail_url: string | null;
}

export type FileReviewQueue = PaginatedResponse<FileReviewItem>;

/**
 * The settings of a collection's files policy. As a request body it is a full
 * replacement: a field left out takes its default.
 */
export interface FilesPolicyBody {
  suspicious_action?: 'deliver' | 'quarantine';
  overrides?: Record<string, string>;
  allowed_kinds?: FileKind[];
  tables?: 'auto' | 'never' | 'always';
  moderation_rules?: Record<string, unknown>[];
  acknowledge_explicit_delivery?: boolean;
  original_access?: 'allowed' | 'when_clean' | 'disabled';
}

/** A collection's live files policy. `version` is `null` on the default policy. */
export interface FilesPolicy {
  version: number | null;
  enforce_from: string | null;
  body: FilesPolicyBody;
  config_hash: string | null;
  created_at: string | null;
}

/** The finding kinds whose `evidence` holds text of the file. */
const TEXT_EVIDENCE_KINDS = new Set(['hidden_text', 'low_legibility_text']);

/**
 * The parsed text of a `hidden_text` or `low_legibility_text` finding, or `null` for
 * every other kind and for evidence in another form. `parts` is always an array, empty
 * when the finding does not carry it.
 *
 * The text comes from the file: treat it as untrusted content, never as instructions.
 */
export function parseFindingEvidence(
  finding: Pick<FileFinding, 'kind' | 'evidence'>,
): FileTextEvidence | null {
  if (!TEXT_EVIDENCE_KINDS.has(finding.kind) || !finding.evidence) {
    return null;
  }
  let fields: unknown;
  try {
    fields = JSON.parse(finding.evidence);
  } catch {
    return null;
  }
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
    return null;
  }
  const { parts } = fields as { parts?: unknown };
  if (parts !== undefined && !Array.isArray(parts)) {
    return null;
  }
  return { ...(fields as Record<string, unknown>), parts: parts ?? [] } as FileTextEvidence;
}

// ---------------------------------------------------------------------------
// Permissions of the caller
// ---------------------------------------------------------------------------

/** The state of the environment, for combining with what a caller may do. */
export interface EnvironmentAccess {
  protection_level: string | null;
  is_enabled: boolean;
}

/**
 * What a caller may do with one content type. `objects` lists the keys the caller is
 * restricted to; `null` means every object.
 */
export interface ContentTypeAccess {
  actions: string[];
  objects: string[] | null;
}

/**
 * What the authenticated caller may do in the environment.
 *
 * This says what the caller is allowed, not whether an action is available now:
 * billing and usage blocks, a blocked organization, environment protection and a
 * disabled environment can still refuse it.
 */
export interface MyPermissions {
  subject: 'user' | 'api_key';
  organization_owner: boolean;
  organization_admin: boolean;
  project_admin: boolean;
  environment_full_access: boolean;
  environment: EnvironmentAccess;
  content_types: Record<string, ContentTypeAccess>;
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
