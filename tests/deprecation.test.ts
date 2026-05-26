import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetWarned, warnDeprecatedMethod } from '../src/_deprecation.js';

describe('warnDeprecatedMethod', () => {
  beforeEach(() => {
    _resetWarned();
    vi.restoreAllMocks();
  });

  it('warns only once per process per old name', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnDeprecatedMethod('listFolders', 'listCollections');
    warnDeprecatedMethod('listFolders', 'listCollections');
    warnDeprecatedMethod('listFolders', 'listCollections');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('listFolders');
    expect(spy.mock.calls[0][0]).toContain('listCollections');
  });

  it('warns once per distinct method', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnDeprecatedMethod('getFolder', 'getCollection');
    warnDeprecatedMethod('createFolder', 'createCollection');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('mentions removal version', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnDeprecatedMethod('foo', 'bar', '2.0');
    expect(spy.mock.calls[0][0]).toContain('2.0');
  });
});
