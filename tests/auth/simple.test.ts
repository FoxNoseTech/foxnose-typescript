import { describe, expect, it } from 'vitest';
import { SimpleKeyAuth } from '../../src/auth/simple.js';
import type { RequestData } from '../../src/auth/types.js';

const dummyRequest: RequestData = {
  method: 'GET',
  url: 'https://api.example.com/test',
  path: '/test',
  body: new Uint8Array(0),
};

describe('SimpleKeyAuth', () => {
  it('builds Simple authorization header', () => {
    const auth = new SimpleKeyAuth('pub123', 'sec456');
    const headers = auth.buildHeaders(dummyRequest);
    expect(headers).toEqual({ Authorization: 'Simple pub123:sec456' });
  });

  it('throws on empty publicKey', () => {
    expect(() => new SimpleKeyAuth('', 'sec')).toThrow('publicKey and secretKey are required');
  });

  it('throws on empty secretKey', () => {
    expect(() => new SimpleKeyAuth('pub', '')).toThrow('publicKey and secretKey are required');
  });

  it('ignores request data', () => {
    const auth = new SimpleKeyAuth('pub', 'sec');
    const headers1 = auth.buildHeaders(dummyRequest);
    const headers2 = auth.buildHeaders({
      ...dummyRequest,
      method: 'POST',
      url: 'https://different.com/other',
      body: new TextEncoder().encode('some body'),
    });
    expect(headers1).toEqual(headers2);
  });
});
