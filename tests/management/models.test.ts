import { describe, expect, it } from 'vitest';
import { resolveKey } from '../../src/management/models.js';

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
