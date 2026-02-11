# @foxnose/sdk

[![npm version](https://img.shields.io/npm/v/@foxnose/sdk)](https://www.npmjs.com/package/@foxnose/sdk)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

Official TypeScript SDK for the [FoxNose](https://foxnose.net/?utm_source=github&utm_medium=repository&utm_campaign=foxnose-typescript) platform — a managed knowledge layer for RAG and AI agents.

## Features

- **Type-safe clients** with full TypeScript interfaces for all API responses
- **Async-only API** built on native `fetch` (Node 18+)
- **Automatic retries** with exponential backoff and Retry-After support
- **Four auth strategies** — Anonymous, JWT, Simple key, and Secure (ECDSA P-256)
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

// List folders
const folders = await client.listFolders();
console.log(folders.results);

// Create a resource
const resource = await client.createResource('my-folder-key', {
  data: { title: 'Hello World' },
});
console.log(resource.key);

// Clean up
client.close();
```

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

client.close();
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
  await client.getResource('folder', 'nonexistent-key');
} catch (err) {
  if (err instanceof FoxnoseAPIError) {
    console.error(err.statusCode);  // 404
    console.error(err.errorCode);   // "not_found"
    console.error(err.detail);      // Additional error details
  } else if (err instanceof FoxnoseTransportError) {
    console.error('Network error:', err.message);
  }
}
```

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
console.log(result.failed.length);    // Failed items with errors
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
