import { describe, expect, it } from 'vitest';
import {
  FoxnoseError,
  FoxnoseAPIError,
  FoxnoseAuthError,
  FoxnoseTransportError,
} from '../src/errors.js';

describe('FoxnoseError', () => {
  it('sets name and message', () => {
    const err = new FoxnoseError('boom');
    expect(err.name).toBe('FoxnoseError');
    expect(err.message).toBe('boom');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('FoxnoseAPIError', () => {
  it('formats message with status code', () => {
    const err = new FoxnoseAPIError({
      message: 'Not found',
      statusCode: 404,
    });
    expect(err.name).toBe('FoxnoseAPIError');
    expect(err.message).toBe('Not found (status=404)');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBeUndefined();
    expect(err.detail).toBeUndefined();
    expect(err).toBeInstanceOf(FoxnoseError);
    expect(err).toBeInstanceOf(Error);
  });

  it('includes error_code in message when present', () => {
    const err = new FoxnoseAPIError({
      message: 'Access denied',
      statusCode: 403,
      errorCode: 'access_denied',
      detail: { reason: 'insufficient permissions' },
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: { message: 'Access denied', error_code: 'access_denied' },
    });
    expect(err.message).toBe('Access denied (status=403, error_code=access_denied)');
    expect(err.errorCode).toBe('access_denied');
    expect(err.detail).toEqual({ reason: 'insufficient permissions' });
    expect(err.responseHeaders).toEqual({ 'content-type': 'application/json' });
    expect(err.responseBody).toEqual({
      message: 'Access denied',
      error_code: 'access_denied',
    });
  });
});

describe('FoxnoseAuthError', () => {
  it('sets name and extends FoxnoseError', () => {
    const err = new FoxnoseAuthError('bad key');
    expect(err.name).toBe('FoxnoseAuthError');
    expect(err.message).toBe('bad key');
    expect(err).toBeInstanceOf(FoxnoseError);
  });
});

describe('FoxnoseTransportError', () => {
  it('sets name and extends FoxnoseError', () => {
    const err = new FoxnoseTransportError('connection refused');
    expect(err.name).toBe('FoxnoseTransportError');
    expect(err.message).toBe('connection refused');
    expect(err).toBeInstanceOf(FoxnoseError);
  });
});
