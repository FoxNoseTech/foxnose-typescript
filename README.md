# @foxnose/sdk

[![npm version](https://img.shields.io/npm/v/@foxnose/sdk)](https://www.npmjs.com/package/@foxnose/sdk)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![codecov](https://codecov.io/gh/FoxNoseTech/foxnose-typescript/branch/main/graph/badge.svg)](https://codecov.io/gh/FoxNoseTech/foxnose-typescript)

Official TypeScript SDK for the [FoxNose](https://foxnose.net/?utm_source=github&utm_medium=repository&utm_campaign=foxnose-typescript) platform — a managed knowledge layer for RAG and AI agents.

## Features

- **Type-safe clients** with full TypeScript interfaces for all API responses
- **Async-only API** built on native `fetch` (Node 18+)
- **Automatic retries** with exponential backoff and Retry-After support
- **Four auth strategies** — Anonymous, JWT, Simple key, and Secure (ECDSA P-256)
- **Flux introspection** — discover route contracts with `/_router` and `/_schema`
- **Zero dependencies** — uses only Node.js built-in modules
- **Dual output** — ESM and CommonJS builds with full `.d.ts` declarations

## Documentation

- [FoxNose Platform Documentation](https://foxnose.net/docs?utm_source=github&utm_medium=repository&utm_campaign=foxnose-typescript)
- [Management API Reference](https://foxnose.net/docs/management-api/v1/get-started?utm_source=github&utm_medium=repository&utm_campaign=foxnose-typescript)
- [Flux API Reference](https://foxnose.net/docs/flux-api/v1/get-started?utm_source=github&utm_medium=repository&utm_campaign=foxnose-typescript)

## Installation

```bash
npm install @foxnose/sdk
# or
pnpm add @foxnose/sdk
# or
yarn add @foxnose/sdk
```

## Quick Start

### Management Client

```typescript
import { ManagementClient, JWTAuth } from '@foxnose/sdk';

const auth = JWTAuth.fromStaticToken('your-access-token');

const client = new ManagementClient({
  baseUrl: 'https://api.foxnose.net',
  environmentKey: 'your-environment-key',
  auth,
});

// List collections
const collections = await client.listCollections();
console.log(collections.results);

// Create a public API
const api = await client.createApi({
  name: 'Storefront',
  prefix: 'shop',
  is_auth_required: false,
  cors_origins: ['*'], // browser CORS for public APIs (reads only)
});
console.log(api.key);

// Create a resource
const resource = await client.createResource('my-collection-key', {
  data: { title: 'Hello World' },
});
console.log(resource.key);

// Clean up
client.close();
```

> **Note (0.4.0):** Folder-named methods (`listFolders`, `createFolder`,
> `addApiFolder`, `listFolderVersions`, `listFolderFields`, etc.) remain as
> `@deprecated` aliases that emit a one-shot `console.warn` on first use per
> process. They keep their original wire behaviour (hitting the legacy
> `/folders/...` URL alias on the server) and will be removed in **1.0**.
> Prefer the `*Collection*` names in new code.

### Components on Collections

Collections can embed Components as nested fields with explicit pin
semantics (`component`, `component_version`, `auto_update`). The
`nestedFieldMeta` helper builds the `meta` block with camelCase
ergonomics, and `syncCollectionComponent` advances pinned fields to a
target Component version on demand.

```typescript
import { ManagementClient, JWTAuth, nestedFieldMeta } from '@foxnose/sdk';

const client = new ManagementClient({
  config: { baseUrl: 'https://api.foxnose.com' },
  environmentKey: 'prod',
  auth: new JWTAuth('ACCESS_TOKEN'),
});

// Embed a Component as a pinned nested field on a Collection draft.
await client.createCollectionField('articles', 'v2-draft', {
  key: 'seo',
  name: 'SEO',
  type: 'nested',
  required: true,
  meta: nestedFieldMeta({
    component: 'cmp-seo-metadata',
    componentVersion: 'ver-abc12345',
    autoUpdate: false, // default — pin until explicit sync
  }),
});

// Later, advance every pinned nested field to its Component's
// current version (empty body = sync all pinned).
const result = await client.syncCollectionComponent('articles');
console.log(result.synced_paths, result.schema_version);

// Advance specific paths to a chosen Component version.
await client.syncCollectionComponent('articles', {
  fieldPaths: ['seo'],
  toVersions: { seo: 'ver-def67890' },
});
```

`syncCollectionComponent` returns a `SyncComponentResponse` with
`synced_paths`, `skipped` (per-path reasons), and `schema_version`
(UID of the newly published Collection schema version, or `null` if no
field needed advancing). On compatibility conflict the server returns
409 `component_sync_conflict`; quota exhaustion returns 422
`too_many_versions`. Both surface as `FoxnoseAPIError`.

### Flux Client

```typescript
import { FluxClient, SimpleKeyAuth } from '@foxnose/sdk';

const auth = new SimpleKeyAuth('your-public-key', 'your-secret-key');

const client = new FluxClient({
  baseUrl: 'https://your-env.fxns.io',
  apiPrefix: 'v1',
  auth,
});

// List resources from a folder
const resources = await client.listResources('articles');
console.log(resources.results);

// Get a single resource
const article = await client.getResource('articles', 'resource-key');
console.log(article);

// Search
const results = await client.search('articles', {
  query: { match_all: {} },
  size: 10,
});

// Discover available routes for this API prefix
const router = await client.getRouter();
console.log(router.routes.length);

// Get live schema metadata for a folder route
const schema = await client.getSchema('articles');
console.log(schema.searchable_fields);

// Writes require a write-capable key. Create publishes immediately; `key` is an
// optional external id used to deduplicate. updateResource is a full replace.
const created = await client.createResource('articles', { title: 'Hello' }, { key: 'my-id' });
await client.updateResource('articles', created.resource_key, { title: 'Hello (edited)' });

client.close();
```

### Truncating long text fields

`truncate_text` is a query parameter on List Resources and Search that caps
every `text`-typed field to a maximum length. It is off by default, ignored
when `raw=true`, and the SDK does not validate it client-side — a value below
1 or a non-integer surfaces as a server `422 validation_error`.

```typescript
// List Resources: truncate_text is a plain query param
const page = await client.listResources('articles', { truncate_text: 200 });

// Search: pass it via the third `options.params` argument, not the body
const results = await client.search(
  'articles',
  { find_text: { query: 'machine learning' } },
  { params: { truncate_text: 200 } },
);

// Truncated fields are reported per-resource under `_sys.truncated`; fields
// within the limit get no entry. `locale` is null for non-localized fields.
console.log(page.results[0]._sys.truncated);
// [{ field: 'body', locale: null, original_length: 850 }]
```

`next` is a full absolute URL and preserves `truncate_text` across pages.
The SDK does not follow `next` automatically — `buildUrl` always resolves
paths against the configured `baseUrl`, so a server-returned absolute URL
cannot be fed back in directly. Extract the cursor yourself:

```typescript
const cursor = page.next ? new URL(page.next).searchParams.get('next') : null;
if (cursor) {
  const nextPage = await client.listResources('articles', {
    truncate_text: 200,
    next: cursor,
  });
}
```

### Cross-parent addressing

A strict-reference collection can be reached at additional, read-only
addresses that omit some number of ancestor keys from the path — fully-flat
(drops every ancestor key) or partially-flat (keeps the root-most ancestor
keys). `folderPath` is always an opaque string that the SDK slash-trims and
interpolates without parsing, so any address the API exposes works unchanged
with `listResources`, `getResource`, `search`, and `getSchema`:

```typescript
// Standard nested path
await client.listResources('realty/accounts/acc_1/listings/lst_1/photos');

// Partially-flat: keeps the root-most ancestor key
await client.listResources('realty/accounts/acc_1/listings/photos');

// Fully-flat: drops every ancestor key
await client.listResources('realty/accounts/listings/photos');
```

These addresses are read-only; the server rejects writes on a flat path.
Before relying on a given address, check `enabled`, `available`, and
`read_methods` on the connection's `flat_routes` (see
`ManagementClient.getApiCollection`) rather than assuming every read method
is available at every level — the API has known discrepancies here (Get
Resource reported at level 0; Search absent from `read_methods` at every
level) that the SDK types as sent, without correcting.

### Vector Search

The Flux client provides typed convenience methods for all vector search modes:

```typescript
import { FluxClient, SearchMode, buildSearchBody } from '@foxnose/sdk';

// Semantic search (auto-generated embeddings)
const results = await client.vectorSearch('articles', {
  query: 'machine learning in healthcare',
  top_k: 10,
  similarity_threshold: 0.7,
});

// Custom embedding search
const results = await client.vectorFieldSearch('articles', {
  field: 'content_embedding',
  query_vector: [0.012, -0.034, 0.056 /* ... */],
  top_k: 20,
});

// Hybrid text + vector search
const results = await client.hybridSearch('articles', {
  query: 'ML applications',
  find_text: { query: 'machine learning' },
  vector_weight: 0.7,
  text_weight: 0.3,
});

// Boosted search (keywords boosted by vector similarity)
const results = await client.boostedSearch('articles', {
  find_text: { query: 'python tutorial' },
  query: 'beginner programming guide',
  boost_factor: 1.5,
});

// Extra parameters (where, sort) are forwarded to the API
const results = await client.vectorSearch('articles', {
  query: 'climate change',
  limit: 5,
  sort: '-published_at',
  where: { category: 'science' },
});

// queryParams forwards to the query string of the underlying search() call —
// it is named queryParams, not params, because unknown keys on this options
// object are otherwise merged into the JSON body.
const truncated = await client.vectorSearch('articles', {
  query: 'climate change',
  queryParams: { truncate_text: 200 },
});
```

You can also use `buildSearchBody()` for full control with the raw `search()` method:

```typescript
const body = buildSearchBody({
  search_mode: SearchMode.HYBRID,
  find_text: { query: 'python' },
  vector_search: { query: 'programming tutorials', top_k: 10 },
  hybrid_config: { vector_weight: 0.6, text_weight: 0.4 },
  limit: 20,
});
const results = await client.search('articles', body);
```

### API Folder Route Descriptions

You can configure per-route descriptions when connecting a folder to an API.
These descriptions are returned by Flux `/_router` introspection.

```typescript
await managementClient.addApiFolder(api.key, folder.key, {
  allowedMethods: ['get_many', 'get_one'],
  descriptionGetOne: 'Get one article by key',
  descriptionGetMany: 'List published articles',
  descriptionSearch: 'Search published articles',
  descriptionSchema: 'Read article schema',
});
```

## Authentication

The SDK supports four authentication strategies:

### JWT Auth

Best for server-side applications with user tokens.

```typescript
import { JWTAuth } from '@foxnose/sdk';

// From a static token
const auth = JWTAuth.fromStaticToken('your-access-token');

// With a custom token provider
const auth = new JWTAuth({
  getToken() {
    return fetchTokenFromSomewhere();
  },
});
```

### Simple Key Auth

For development and Flux API access.

```typescript
import { SimpleKeyAuth } from '@foxnose/sdk';

const auth = new SimpleKeyAuth('public-key', 'secret-key');
```

### Secure Key Auth

ECDSA P-256 signature-based authentication (Node.js only).

```typescript
import { SecureKeyAuth } from '@foxnose/sdk';

const auth = new SecureKeyAuth('public-key', 'base64-der-private-key');
```

### Anonymous Auth

For unauthenticated endpoints.

```typescript
import { AnonymousAuth } from '@foxnose/sdk';

const auth = new AnonymousAuth();
```

## Error Handling

All API errors are thrown as typed exceptions:

```typescript
import { FoxnoseAPIError, FoxnoseTransportError } from '@foxnose/sdk';

try {
  await client.getResource('collection', 'nonexistent-key');
} catch (err) {
  if (err instanceof FoxnoseAPIError) {
    console.error(err.statusCode); // 404
    console.error(err.errorCode); // "not_found"
    console.error(err.detail); // Additional error details
  } else if (err instanceof FoxnoseTransportError) {
    console.error('Network error:', err.message);
  }
}
```

### Billing errors

Billing-related responses are thrown as typed subclasses of `FoxnoseAPIError`,
so an existing `catch (err) { if (err instanceof FoxnoseAPIError) ... }` keeps
working. Narrow to a subclass to read its typed fields:

```typescript
import {
  FoxnoseAPIError,
  SpendCapExceededError,
  PlanExhaustedError,
  PlanLimitExceededError,
  RateLimitExceededError,
} from '@foxnose/sdk';

try {
  await client.createResource('collection', payload);
} catch (err) {
  if (err instanceof SpendCapExceededError) {
    // HTTP 402
    console.error(err.capUsd); // Spend cap in USD (or null)
    console.error(err.cycleResetsAt); // ISO timestamp
    console.error(err.raiseCapUrl); // Where to raise the cap
  } else if (err instanceof PlanExhaustedError) {
    // HTTP 402
    console.error(err.axis); // e.g. "retrievals", "writes"
    console.error(err.windowResetsAt); // ISO timestamp
    console.error(err.upgradeUrl);
  } else if (err instanceof PlanLimitExceededError) {
    // HTTP 403
    console.error(err.entity); // e.g. "collections"
    console.error(err.current, err.limit);
    console.error(err.upgradeUrl); // May be undefined
  } else if (err instanceof RateLimitExceededError) {
    // HTTP 429
    console.error(err.retryAfter); // Seconds to wait (from Retry-After)
  } else if (err instanceof FoxnoseAPIError) {
    console.error(err.statusCode, err.errorCode);
  }
}
```

### Write errors

Resource writes (`createResource` / `updateResource`) can throw these typed
subclasses of `FoxnoseAPIError`:

```typescript
import {
  CollectionNotWritableError,
  ExternalIdConflictError,
  ContentValidationFailedError,
  UpstreamError,
} from '@foxnose/sdk';

try {
  await client.createResource('articles', { title: 'Hi' }, { key: 'ext-1' });
} catch (err) {
  if (err instanceof ExternalIdConflictError) {
    // HTTP 409 — a resource with that key already exists
  } else if (err instanceof ContentValidationFailedError) {
    // HTTP 422 — err.errors[] each carry a json_path; err.errorsTruncated
    console.error(err.errors, err.errorsTruncated);
  } else if (err instanceof CollectionNotWritableError) {
    // HTTP 403 — this key cannot write to that collection
  } else if (err instanceof UpstreamError) {
    // HTTP 502 — outcome unknown; re-read with a GET before retrying
  }
}
```

Writes are never retried automatically (they are not idempotent).

## Batch Operations

Efficiently upsert multiple resources with concurrency control:

```typescript
const items = [
  { external_id: 'article-1', payload: { data: { title: 'First' } } },
  { external_id: 'article-2', payload: { data: { title: 'Second' } } },
];

const result = await client.batchUpsertResources('folder-key', items, {
  maxConcurrency: 5,
  onProgress: (completed, total) => {
    console.log(`${completed}/${total}`);
  },
});

console.log(result.succeeded.length); // Successfully upserted
console.log(result.failed.length); // Failed items with errors
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint

# Type check
pnpm typecheck

# Format
pnpm format
```

## License

[Apache-2.0](LICENSE)
