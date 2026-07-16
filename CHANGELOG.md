# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
