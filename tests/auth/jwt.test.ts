import { describe, expect, it } from 'vitest';
import { JWTAuth, StaticTokenProvider } from '../../src/auth/jwt.js';
import type { RequestData } from '../../src/auth/types.js';

const dummyRequest: RequestData = {
  method: 'GET',
  url: 'https://api.example.com/test',
  path: '/test',
  body: new Uint8Array(0),
};

describe('StaticTokenProvider', () => {
  it('returns the token', () => {
    const provider = new StaticTokenProvider('abc123');
    expect(provider.getToken()).toBe('abc123');
  });
});

describe('JWTAuth', () => {
  it('builds Bearer authorization header', () => {
    const auth = new JWTAuth(new StaticTokenProvider('mytoken'));
    const headers = auth.buildHeaders(dummyRequest);
    expect(headers).toEqual({ Authorization: 'Bearer mytoken' });
  });

  it('supports custom scheme', () => {
    const auth = new JWTAuth(new StaticTokenProvider('tok'), { scheme: 'Token' });
    const headers = auth.buildHeaders(dummyRequest);
    expect(headers).toEqual({ Authorization: 'Token tok' });
  });

  it('throws on empty token', () => {
    const auth = new JWTAuth(new StaticTokenProvider(''));
    expect(() => auth.buildHeaders(dummyRequest)).toThrow('empty token');
  });

  describe('fromStaticToken', () => {
    it('creates JWTAuth from static token', () => {
      const auth = JWTAuth.fromStaticToken('static-tok');
      const headers = auth.buildHeaders(dummyRequest);
      expect(headers).toEqual({ Authorization: 'Bearer static-tok' });
    });

    it('accepts custom scheme', () => {
      const auth = JWTAuth.fromStaticToken('static-tok', { scheme: 'Custom' });
      const headers = auth.buildHeaders(dummyRequest);
      expect(headers).toEqual({ Authorization: 'Custom static-tok' });
    });
  });

  it('works with a custom token provider', () => {
    let counter = 0;
    const provider = {
      getToken() {
        counter++;
        return `token-${counter}`;
      },
    };
    const auth = new JWTAuth(provider);

    expect(auth.buildHeaders(dummyRequest)).toEqual({ Authorization: 'Bearer token-1' });
    expect(auth.buildHeaders(dummyRequest)).toEqual({ Authorization: 'Bearer token-2' });
  });
});
