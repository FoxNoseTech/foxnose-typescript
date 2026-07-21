import { describe, expect, it } from 'vitest';
import {
  FoxnoseError,
  FoxnoseAPIError,
  FoxnoseAuthError,
  FoxnoseTransportError,
  SpendCapExceededError,
  PlanExhaustedError,
  PlanLimitExceededError,
  RateLimitExceededError,
  buildAPIError,
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

describe('buildAPIError', () => {
  it('maps 402 spend_cap_reached to SpendCapExceededError', () => {
    const err = buildAPIError({
      message: '',
      statusCode: 402,
      errorCode: 'spend_cap_reached',
      responseBody: {
        error_code: 'spend_cap_reached',
        cap_usd: 50,
        cycle_resets_at: '2026-08-01T00:00:00Z',
        raise_cap_url: 'https://foxnose.net/billing/cap',
      },
    });
    expect(err).toBeInstanceOf(SpendCapExceededError);
    expect(err).toBeInstanceOf(FoxnoseAPIError);
    const capErr = err as SpendCapExceededError;
    expect(capErr.name).toBe('SpendCapExceededError');
    expect(capErr.capUsd).toBe(50);
    expect(capErr.cycleResetsAt).toBe('2026-08-01T00:00:00Z');
    expect(capErr.raiseCapUrl).toBe('https://foxnose.net/billing/cap');
    expect(capErr.message).toContain('Spend cap reached');
  });

  it('keeps null cap_usd on SpendCapExceededError', () => {
    const err = buildAPIError({
      message: '',
      statusCode: 402,
      errorCode: 'spend_cap_reached',
      responseBody: { error_code: 'spend_cap_reached', cap_usd: null },
    }) as SpendCapExceededError;
    expect(err).toBeInstanceOf(SpendCapExceededError);
    expect(err.capUsd).toBeNull();
  });

  it('maps 402 plan_exhausted to PlanExhaustedError', () => {
    const err = buildAPIError({
      message: '',
      statusCode: 402,
      errorCode: 'plan_exhausted',
      responseBody: {
        error_code: 'plan_exhausted',
        axis: 'retrievals',
        window_resets_at: '2026-08-01T00:00:00Z',
        upgrade_url: 'https://foxnose.net/billing/upgrade',
      },
    });
    expect(err).toBeInstanceOf(PlanExhaustedError);
    const planErr = err as PlanExhaustedError;
    expect(planErr.axis).toBe('retrievals');
    expect(planErr.windowResetsAt).toBe('2026-08-01T00:00:00Z');
    expect(planErr.upgradeUrl).toBe('https://foxnose.net/billing/upgrade');
    expect(planErr.message).toContain('Plan allowance exhausted');
  });

  it('maps 403 plan_limit_exceeded from detail', () => {
    const err = buildAPIError({
      message: 'Plan limit exceeded',
      statusCode: 403,
      errorCode: 'plan_limit_exceeded',
      detail: {
        entity: 'collections',
        current: 10,
        limit: 10,
        upgrade_url: 'https://foxnose.net/billing/upgrade',
      },
    });
    expect(err).toBeInstanceOf(PlanLimitExceededError);
    const limitErr = err as PlanLimitExceededError;
    expect(limitErr.entity).toBe('collections');
    expect(limitErr.current).toBe(10);
    expect(limitErr.limit).toBe(10);
    expect(limitErr.upgradeUrl).toBe('https://foxnose.net/billing/upgrade');
  });

  it('leaves upgradeUrl undefined when absent on 403 detail', () => {
    const err = buildAPIError({
      message: 'Plan limit exceeded',
      statusCode: 403,
      errorCode: 'plan_limit_exceeded',
      detail: { entity: 'environments', current: 3, limit: 3 },
    }) as PlanLimitExceededError;
    expect(err).toBeInstanceOf(PlanLimitExceededError);
    expect(err.entity).toBe('environments');
    expect(err.current).toBe(3);
    expect(err.limit).toBe(3);
    expect(err.upgradeUrl).toBeUndefined();
  });

  it('maps 429 rate_limited with case-insensitive Retry-After header', () => {
    const err = buildAPIError({
      message: 'Rate limit exceeded',
      statusCode: 429,
      errorCode: 'rate_limited',
      responseHeaders: { 'retry-after': '30' },
      responseBody: { error_code: 'rate_limited', message: 'Rate limit exceeded' },
    });
    expect(err).toBeInstanceOf(RateLimitExceededError);
    expect((err as RateLimitExceededError).retryAfter).toBe(30);
  });

  it('leaves retryAfter undefined when Retry-After is not a number', () => {
    const err = buildAPIError({
      message: 'Rate limit exceeded',
      statusCode: 429,
      errorCode: 'rate_limited',
      responseHeaders: { 'retry-after': 'soon' },
    }) as RateLimitExceededError;
    expect(err).toBeInstanceOf(RateLimitExceededError);
    expect(err.retryAfter).toBeUndefined();
  });

  it('returns generic FoxnoseAPIError for unknown codes on mapped statuses', () => {
    const err402 = buildAPIError({
      message: 'x',
      statusCode: 402,
      errorCode: 'something_new',
      responseBody: { error_code: 'something_new' },
    });
    expect(err402.constructor).toBe(FoxnoseAPIError);
    expect(err402).not.toBeInstanceOf(SpendCapExceededError);
    expect(err402).not.toBeInstanceOf(PlanExhaustedError);

    const err429 = buildAPIError({
      message: 'x',
      statusCode: 429,
      errorCode: 'insufficient_units',
      responseBody: { error_code: 'insufficient_units' },
    });
    expect(err429.constructor).toBe(FoxnoseAPIError);
    expect(err429).not.toBeInstanceOf(RateLimitExceededError);
  });

  it('falls through to FoxnoseAPIError for malformed bodies without throwing', () => {
    for (const responseBody of [null, [], 'a bare string']) {
      const err = buildAPIError({
        message: 'x',
        statusCode: 402,
        errorCode: 'spend_cap_reached',
        responseBody,
      });
      expect(err.constructor).toBe(FoxnoseAPIError);
      expect(err).not.toBeInstanceOf(SpendCapExceededError);
    }
  });

  it('maps 403 plan_limit_exceeded with a malformed detail to typed error with undefined fields', () => {
    const err = buildAPIError({
      message: 'Plan limit exceeded',
      statusCode: 403,
      errorCode: 'plan_limit_exceeded',
      detail: [1, 2, 3],
    }) as PlanLimitExceededError;
    expect(err).toBeInstanceOf(PlanLimitExceededError);
    expect(err.entity).toBeUndefined();
    expect(err.limit).toBeUndefined();
    expect(err.current).toBeUndefined();
    expect(err.upgradeUrl).toBeUndefined();
  });

  it('subclasses are caught by instanceof FoxnoseAPIError', () => {
    const errors = [
      buildAPIError({
        message: '',
        statusCode: 402,
        errorCode: 'spend_cap_reached',
        responseBody: { error_code: 'spend_cap_reached' },
      }),
      buildAPIError({
        message: '',
        statusCode: 402,
        errorCode: 'plan_exhausted',
        responseBody: { error_code: 'plan_exhausted' },
      }),
      buildAPIError({
        message: '',
        statusCode: 403,
        errorCode: 'plan_limit_exceeded',
        detail: { entity: 'roles' },
      }),
      buildAPIError({
        message: '',
        statusCode: 429,
        errorCode: 'rate_limited',
        responseHeaders: {},
      }),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(FoxnoseAPIError);
      expect(err).toBeInstanceOf(FoxnoseError);
    }
  });
});
