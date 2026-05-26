import { describe, expect, it } from 'vitest';
import { resolveKey, nestedFieldMeta } from '../../src/management/models.js';

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
