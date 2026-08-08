# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-08-08

### Added

- `FluxClient.search()` accepts a third `options: { params?: Record<string, any> }`
  argument, forwarded as query-string parameters (e.g. `truncate_text`). Additive:
  `search()` had no escape hatch for query parameters before this.
- `vectorSearch`, `vectorFieldSearch`, `hybridSearch`, and `boostedSearch` accept a
  `queryParams` option, forwarded to the query string of the underlying `search()`
  call. Named `queryParams` rather than `params` because these option objects
  already funnel unknown keys into the JSON body via `mergeExtra` — an explicit
  `params` field would have silently rerouted an existing `params` body extra to
  the query string. `mergeExtra` now throws if handed a `truncate_text` body
  extra, naming `queryParams` as the correct place for it.
- `APIFolderSummary` (and its `APICollectionSummary` alias) now types the
  cross-parent read address fields returned by the Management API for a
  strict-reference collection's connection to an API: `unscoped_levels`,
  `unscoped_ancestors`, `expose_owner`, `flat_route` (undocumented, exported as
  `FlatRouteSummary`), and `flat_routes` (exported as `FlatRoute[]`). The first
  three are required (present on every connection observed); `flat_route` and
  `flat_routes` are optional and nullable, since both were observed `null`.
- `ApiFolderOptions` — and therefore `addApiCollection`, `updateApiCollection`,
  and the deprecated `addApiFolder` / `updateApiFolder` twins, which now share
  one payload serializer — accept `unscopedLevels` / `unscopedAncestors` to
  configure cross-parent read addresses. Not validated client-side: the server
  rejects a level with no corresponding ancestor.

### Changed

- **Potentially breaking for source that builds `APIFolderSummary` /
  `APICollectionSummary` as an object literal**: `unscoped_levels`,
  `unscoped_ancestors`, and `expose_owner` are now required fields on these
  types (matching the server, which always sends them), not optional. Code
  that constructs one of these objects by hand — e.g. in a test fixture or
  mock — will fail to compile until it supplies the three fields; values
  received from the API and merely read are unaffected. The Python SDK is
  not affected: its equivalent fields carry defaults.

### Fixed

- The deprecated `addApiFolder` / `updateApiFolder` no longer risk silently
  discarding new `ApiFolderOptions` fields — all four API-collection-association
  writers now build their request body through one shared serializer instead of
  four independent field allowlists.

## [0.5.1] - 2026-07-24

### Added

- `APIInfo` now types three previously-undocumented fields on the Management API
  "API" object, all optional for forward/backward compatibility with older
  servers:
  - `mcp_enabled?: boolean` — whether the MCP endpoint is exposed (default true)
  - `router_introspection_enabled?: boolean` — whether router introspection is
    exposed (default true)
  - `cors_origins?: string[]` — allowed browser origins for cross-origin reads
    (empty = off, `["*"]` = any origin); server-validated and normalized. Covers
    public read traffic only — writes still require a key.
  Setting these via `createApi` / `updateApi` already worked (the payload is
  passed through); this only adds the types.

## [0.5.0] - 2026-07-22

### Added

- Flux write methods on `FluxClient`:
  - `createResource(folderPath, data, { key })` — create and immediately publish a
    resource; optional `key` is an external deduplication identifier. Returns
    `resource_key`, `revision_key`, `write_units`, `published`.
  - `updateResource(folderPath, resourceKey, data)` — full-document replace that
    publishes a new revision.
  - Both work with nested collection paths (e.g. `users/usr_1/memories`), require a
    write-capable key, and are never retried automatically.
- Typed write errors, all subclasses of `FoxnoseAPIError`:
  `CollectionNotWritableError` (403), `ExternalIdConflictError` (409),
  `ContentValidationFailedError` (422, with `errors` and `errorsTruncated`), and
  `UpstreamError` (502). Exported from the package root.

### Changed

- `UsageBreakdown` now exposes `projects`, `resources`, and `users`.

## [0.4.0] - 2026-07-16

### Added

- Collection API surface: `createCollection`, `listCollections`, `updateCollection`,
  `deleteCollection`, `getCollectionTree`, `getCollectionModel`, `listCollectionVersions`,
  and related methods on `ManagementClient`, plus `Collection`-prefixed types
  (`CollectionSummary`, `CollectionList`, `CollectionRef`, ...).
- Nested fields and Components: `nestedFieldMeta()` helper and `NestedFieldMeta`
  interface for building the `meta` block of a Collection nested field, with
  camelCase inputs mapped to the wire shape.
- `ManagementClient.syncCollectionComponent()` for advancing pinned Component
  versions, with response types `SyncComponentResponse`, `SyncComponentSkippedItem`,
  and `ComponentSyncConflictDetail`.
- Typed billing exceptions, all extending `FoxnoseAPIError`:
  - `SpendCapExceededError` (HTTP 402) — `capUsd`, `cycleResetsAt`, `raiseCapUrl`.
  - `PlanExhaustedError` (HTTP 402) — `axis`, `windowResetsAt`, `upgradeUrl`.
  - `PlanLimitExceededError` (HTTP 403) — `entity`, `limit`, `current`, `upgradeUrl`.
  - `RateLimitExceededError` (HTTP 429) — `retryAfter`.

### Changed

- Renamed the `Folder` concept to `Collection` across the Management API surface.
  Wire payloads are unchanged.

### Deprecated

- `Folder`-prefixed methods and types are retained as aliases for the equivalent
  `Collection` members and log a one-time warning on first use.
