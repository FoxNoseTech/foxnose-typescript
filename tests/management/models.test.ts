import { describe, expect, it } from 'vitest';
import { resolveKey, nestedFieldMeta } from '../../src/management/models.js';
import type { APIFolderSummary } from '../../src/management/models.js';

describe('resolveKey', () => {
  it('returns string as-is', () => {
    expect(resolveKey('my-key')).toBe('my-key');
  });

  it('extracts key from object', () => {
    expect(resolveKey({ key: 'obj-key' })).toBe('obj-key');
  });

  it('throws on non-string non-object', () => {
    expect(() => resolveKey(42 as any)).toThrow();
  });

  it('throws on object without key', () => {
    expect(() => resolveKey({ name: 'no-key' } as any)).toThrow();
  });

  it('throws on object with non-string key', () => {
    expect(() => resolveKey({ key: 123 } as any)).toThrow();
  });
});

describe('nestedFieldMeta', () => {
  it('maps camelCase options to snake_case wire shape', () => {
    expect(
      nestedFieldMeta({
        component: 'cmp-abc',
        componentVersion: 'ver-xyz',
        autoUpdate: true,
      }),
    ).toEqual({
      component: 'cmp-abc',
      component_version: 'ver-xyz',
      auto_update: true,
    });
  });

  it('defaults auto_update to false', () => {
    expect(
      nestedFieldMeta({ component: 'cmp-abc', componentVersion: 'ver-xyz' }),
    ).toEqual({
      component: 'cmp-abc',
      component_version: 'ver-xyz',
      auto_update: false,
    });
  });

  it('preserves extra meta keys', () => {
    expect(
      nestedFieldMeta({
        component: 'cmp-abc',
        componentVersion: 'ver-xyz',
        extra: { title: 'My Title', description: 'desc' },
      }),
    ).toEqual({
      component: 'cmp-abc',
      component_version: 'ver-xyz',
      auto_update: false,
      title: 'My Title',
      description: 'desc',
    });
  });

  it('throws when extra collides with reserved keys', () => {
    expect(() =>
      nestedFieldMeta({
        component: 'cmp-abc',
        componentVersion: 'ver-xyz',
        extra: { component: 'other-cmp' } as any,
      }),
    ).toThrow(/component/);

    expect(() =>
      nestedFieldMeta({
        component: 'cmp-abc',
        componentVersion: 'ver-xyz',
        extra: { component_version: 'other-ver' } as any,
      }),
    ).toThrow(/component_version/);

    expect(() =>
      nestedFieldMeta({
        component: 'cmp-abc',
        componentVersion: 'ver-xyz',
        extra: { auto_update: true } as any,
      }),
    ).toThrow(/auto_update/);
  });
});

// ---------------------------------------------------------------------------
// APIFolderSummary — connection object, cross-parent read fields.
//
// TypeScript has no runtime parsing: Management methods return raw JSON
// typed by interfaces, nothing validates it at runtime. So these tests
// verify compile-time assignability of the verified production shape (see
// sdk-update-plan.md, "Established facts > Cross-parent reads") to
// APIFolderSummary — they are not "parsing" tests, nothing parses.
// ---------------------------------------------------------------------------

describe('APIFolderSummary — connection object shape', () => {
  it('accepts the full production connection object with flat_routes populated', () => {
    const connection: APIFolderSummary = {
      folder: '9wjjtw76dyj0',
      api: '949sr5xz7kcj',
      created_at: '2026-08-01T06:43:11.331505-05:00',
      allowed_methods: ['get_one', 'get_many'],
      description_get_one: 'Returns one resource by id.',
      description_get_many: 'Returns a paginated list of resources.',
      description_search: 'Searches resources by filters.',
      description_schema: 'Returns JSON schema for this resource.',
      unscoped_ancestors: [
        '01debe0d-0325-42b1-9bfd-ef52046cd785',
        '432880c9-ae43-4462-b4f3-f16c18068ea5',
      ],
      unscoped_levels: [0],
      expose_owner: false,
      flat_route: {
        path: '/realty/accounts/listings/photos',
        omitted_ancestors: [
          '01debe0d-0325-42b1-9bfd-ef52046cd785',
          '432880c9-ae43-4462-b4f3-f16c18068ea5',
        ],
        enabled: true,
        read_methods: ['get_one', 'get_many'],
        available: true,
        unavailable_reason: null,
        published_generation: 18,
        router_generation: 18,
      },
      flat_routes: [
        {
          level: 0,
          path: '/realty/accounts/listings/photos',
          omitted_ancestors: [
            '01debe0d-0325-42b1-9bfd-ef52046cd785',
            '432880c9-ae43-4462-b4f3-f16c18068ea5',
          ],
          retained_ancestors: [],
          enabled: true,
          read_methods: ['get_one', 'get_many'],
          available: true,
          unavailable_reason: null,
          published_generation: 18,
          router_generation: 18,
        },
        {
          level: 1,
          path: '/realty/accounts/{accounts_key}/listings/photos',
          omitted_ancestors: ['432880c9-ae43-4462-b4f3-f16c18068ea5'],
          retained_ancestors: ['01debe0d-0325-42b1-9bfd-ef52046cd785'],
          enabled: false,
          read_methods: ['get_one', 'get_many'],
          available: true,
          unavailable_reason: null,
          published_generation: 18,
          router_generation: 18,
        },
      ],
    };

    expect(connection.flat_routes).toHaveLength(2);
    expect(connection.flat_routes?.[1].retained_ancestors).toEqual([
      '01debe0d-0325-42b1-9bfd-ef52046cd785',
    ]);
    expect(connection.flat_route?.path).toBe('/realty/accounts/listings/photos');
    expect(connection.unscoped_levels).toEqual([0]);
  });

  it('accepts flat_route and flat_routes as null (observed with no key-bearing ancestor)', () => {
    const connection: APIFolderSummary = {
      folder: 'c1',
      unscoped_levels: [],
      unscoped_ancestors: [],
      expose_owner: false,
      flat_route: null,
      flat_routes: null,
    };

    expect(connection.flat_route).toBeNull();
    expect(connection.flat_routes).toBeNull();
  });

  it('accepts flat_route and flat_routes omitted entirely', () => {
    const connection: APIFolderSummary = {
      folder: 'c1',
      unscoped_levels: [],
      unscoped_ancestors: [],
      expose_owner: false,
    };

    expect(connection.flat_route).toBeUndefined();
    expect(connection.flat_routes).toBeUndefined();
  });
});
