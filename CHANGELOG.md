# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
