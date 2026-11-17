import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UploadSignature } from '../../src/flux/models.js';
import type { FolderSummary, ResourceSummary } from '../../src/management/models.js';

const here = dirname(fileURLToPath(import.meta.url));
const modelsSrc = fs.readFileSync(path.resolve(here, '../../src/management/models.ts'), 'utf-8');

describe('SDK shape after composite removal — source regex', () => {
  it('FolderSummary does not declare folder_type', () => {
    const block = modelsSrc.match(/interface\s+FolderSummary\s*\{[^}]*\}/s);
    expect(block).not.toBeNull();
    expect(block![0]).not.toContain('folder_type');
  });

  it('ResourceSummary does not declare component', () => {
    const block = modelsSrc.match(/interface\s+ResourceSummary\s*\{[^}]*\}/s);
    expect(block).not.toBeNull();
    expect(block![0]).not.toContain('component');
  });
});

// Type-level guard: these tests compile only if the legacy fields are absent
// from the interfaces. The `@ts-expect-error` directive itself fails to
// compile when no error is produced, so if `folder_type` / `component` ever
// reappear on the interface, the test file will refuse to typecheck.
describe('SDK shape after composite removal — type-level', () => {
  it('FolderSummary does not declare folder_type', () => {
    const folder: FolderSummary = {
      key: 'f1',
      name: 'Folder',
      alias: 'folder',
      content_type: 'document',
      strict_reference: false,
      created_at: '2026-01-01T00:00:00Z',
      // @ts-expect-error folder_type must be removed from FolderSummary
      folder_type: 'collection',
    };
    expect(folder.key).toBe('f1');
  });

  it('ResourceSummary does not declare component', () => {
    const resource: ResourceSummary = {
      key: 'r1',
      folder: 'f1',
      content_type: 'document',
      created_at: '2026-01-01T00:00:00Z',
      vectors_size: 0,
      // @ts-expect-error component must be removed from ResourceSummary
      component: 'cmp-xyz',
    };
    expect(resource.key).toBe('r1');
  });
});

// Type-level guard: every field of a grant is always present, and `pnpm typecheck`
// compiles this file, so a field that turns optional refuses to compile here.
describe('UploadSignature — type-level', () => {
  it('has no optional field', () => {
    const grant: UploadSignature = {
      publicKey: 'public-key',
      uploadBaseUrl: 'https://upload.foxnose.net',
      authToken: 'token',
      tokenExpire: 1793450000,
      store: 'auto',
      metadata: {},
      upload_id: 'up_eu1_1',
      status_token: 'status',
      rotation: 1,
    };
    const complete: Required<UploadSignature> = grant;
    expect(complete.upload_id).toBe('up_eu1_1');
  });
});
