import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SecureKeyAuth } from '../../src/auth/secure.js';
import type { RequestData } from '../../src/auth/types.js';

function generateTestKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'sec1', format: 'der' },
  });
  const privateKeyB64 = (privateKey as Buffer).toString('base64');
  // Extract a simple public key identifier (just use first 16 chars of base64)
  const pubKeyB64 = Buffer.from(publicKey as string).toString('base64').substring(0, 16);
  return { publicKey: pubKeyB64, privateKey: privateKeyB64 };
}

const dummyRequest: RequestData = {
  method: 'GET',
  url: 'https://api.example.com/v1/test',
  path: '/v1/test',
  body: new Uint8Array(0),
};

describe('SecureKeyAuth', () => {
  it('generates Authorization and Date headers', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    const headers = auth.buildHeaders(dummyRequest);

    expect(headers.Authorization).toMatch(new RegExp(`^Secure ${keys.publicKey}:.+`));
    expect(headers.Date).toBe('2024-06-15T12:00:00Z');
  });

  it('signature changes with different bodies', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    const headers1 = auth.buildHeaders(dummyRequest);
    const headers2 = auth.buildHeaders({
      ...dummyRequest,
      body: new TextEncoder().encode('{"data": "value"}'),
    });

    // Different body = different signature
    expect(headers1.Authorization).not.toBe(headers2.Authorization);
  });

  it('signature changes with different paths', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    const headers1 = auth.buildHeaders(dummyRequest);
    const headers2 = auth.buildHeaders({
      ...dummyRequest,
      url: 'https://api.example.com/v1/other',
      path: '/v1/other',
    });

    expect(headers1.Authorization).not.toBe(headers2.Authorization);
  });

  it('signature changes with different timestamps', () => {
    const keys = generateTestKeyPair();
    let callCount = 0;
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => {
        callCount++;
        return callCount === 1
          ? new Date('2024-06-15T12:00:00Z')
          : new Date('2024-06-15T12:01:00Z');
      },
    });

    const headers1 = auth.buildHeaders(dummyRequest);
    const headers2 = auth.buildHeaders(dummyRequest);

    expect(headers1.Date).toBe('2024-06-15T12:00:00Z');
    expect(headers2.Date).toBe('2024-06-15T12:01:00Z');
    expect(headers1.Authorization).not.toBe(headers2.Authorization);
  });

  it('includes query string in signed path', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    const headers1 = auth.buildHeaders(dummyRequest);
    const headers2 = auth.buildHeaders({
      ...dummyRequest,
      url: 'https://api.example.com/v1/test?page=2',
      path: '/v1/test?page=2',
    });

    // Different query string means different signature
    expect(headers1.Authorization).not.toBe(headers2.Authorization);
  });

  it('throws on empty publicKey', () => {
    const keys = generateTestKeyPair();
    expect(() => new SecureKeyAuth('', keys.privateKey)).toThrow(
      'publicKey and privateKey are required',
    );
  });

  it('throws on empty privateKey', () => {
    expect(() => new SecureKeyAuth('pubkey', '')).toThrow(
      'publicKey and privateKey are required',
    );
  });

  it('throws on invalid private key when signing', () => {
    // Invalid DER data won't be caught until signing time with node:crypto
    const auth = new SecureKeyAuth('pubkey', 'not-valid-base64-der', {
      clock: () => new Date('2024-06-15T12:00:00Z'),
    });
    expect(() => auth.buildHeaders(dummyRequest)).toThrow();
  });

  it('falls back to request.path when url is not a valid URL', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    // Use a non-parseable URL to trigger the catch branch
    const headers = auth.buildHeaders({
      method: 'GET',
      url: 'not-a-url',
      path: '/fallback/path',
      body: new Uint8Array(0),
    });

    expect(headers.Authorization).toMatch(/^Secure /);
    expect(headers.Date).toBe('2024-06-15T12:00:00Z');
  });

  it('uses default clock when not provided', () => {
    const keys = generateTestKeyPair();
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey);

    const headers = auth.buildHeaders(dummyRequest);
    expect(headers.Authorization).toMatch(/^Secure /);
    expect(headers.Date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles empty body via null-coalescing', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    // body as undefined to test the ?? branch
    const headers = auth.buildHeaders({
      method: 'GET',
      url: 'https://api.example.com/test',
      path: '/test',
      body: undefined as unknown as Uint8Array,
    });

    expect(headers.Authorization).toMatch(/^Secure /);
  });

  it('uses "/" as default path when url has no pathname and path is empty', () => {
    const keys = generateTestKeyPair();
    const fixedDate = new Date('2024-06-15T12:00:00Z');
    const auth = new SecureKeyAuth(keys.publicKey, keys.privateKey, {
      clock: () => fixedDate,
    });

    const headers = auth.buildHeaders({
      method: 'GET',
      url: 'invalid:///',
      path: '',
      body: new Uint8Array(0),
    });

    expect(headers.Authorization).toMatch(/^Secure /);
  });
});
