import { describe, expect, it } from 'vitest';
import { AnonymousAuth } from '../../src/auth/anonymous.js';
import type { RequestData } from '../../src/auth/types.js';

const dummyRequest: RequestData = {
  method: 'GET',
  url: 'https://api.example.com/test',
  path: '/test',
  body: new Uint8Array(0),
};

describe('AnonymousAuth', () => {
  it('returns empty headers', () => {
    const auth = new AnonymousAuth();
    const headers = auth.buildHeaders(dummyRequest);
    expect(headers).toEqual({});
  });

  it('returns empty headers for POST with body', () => {
    const auth = new AnonymousAuth();
    const headers = auth.buildHeaders({
      ...dummyRequest,
      method: 'POST',
      body: new TextEncoder().encode('{"key": "value"}'),
    });
    expect(headers).toEqual({});
  });
});
