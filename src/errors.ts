/**
 * Base class for all SDK errors.
 */
export class FoxnoseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FoxnoseError';
  }
}

/**
 * Raised when the API responds with an error status (4xx/5xx).
 */
export class FoxnoseAPIError extends FoxnoseError {
  readonly statusCode: number;
  readonly errorCode?: string;
  readonly detail?: unknown;
  readonly responseHeaders?: Record<string, string>;
  readonly responseBody?: unknown;

  constructor(options: {
    message: string;
    statusCode: number;
    errorCode?: string;
    detail?: unknown;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
  }) {
    const code = options.errorCode ? `, error_code=${options.errorCode}` : '';
    super(`${options.message} (status=${options.statusCode}${code})`);
    this.name = 'FoxnoseAPIError';
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode;
    this.detail = options.detail;
    this.responseHeaders = options.responseHeaders;
    this.responseBody = options.responseBody;
  }
}

/**
 * Options shared by every {@link FoxnoseAPIError} subclass.
 */
type APIErrorOptions = {
  message: string;
  statusCode: number;
  errorCode?: string;
  detail?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
};

/**
 * Raised on HTTP 402 when a configured spend cap has been reached.
 */
export class SpendCapExceededError extends FoxnoseAPIError {
  /** Spend cap in USD, or null when unset on the server side. */
  readonly capUsd?: number | null;
  /** ISO timestamp when the current billing cycle resets. */
  readonly cycleResetsAt?: string;
  /** URL where the spend cap can be raised. */
  readonly raiseCapUrl?: string;

  constructor(
    options: APIErrorOptions & {
      capUsd?: number | null;
      cycleResetsAt?: string;
      raiseCapUrl?: string;
    },
  ) {
    super(options);
    this.name = 'SpendCapExceededError';
    this.capUsd = options.capUsd;
    this.cycleResetsAt = options.cycleResetsAt;
    this.raiseCapUrl = options.raiseCapUrl;
  }
}

/**
 * Raised on HTTP 402 when the plan allowance for a usage axis is exhausted.
 */
export class PlanExhaustedError extends FoxnoseAPIError {
  /** Usage axis that was exhausted (e.g. retrievals, writes, data_storage, vector_storage). */
  readonly axis?: string;
  /** ISO timestamp when the usage window resets. */
  readonly windowResetsAt?: string;
  /** URL where the plan can be upgraded. */
  readonly upgradeUrl?: string;

  constructor(
    options: APIErrorOptions & {
      axis?: string;
      windowResetsAt?: string;
      upgradeUrl?: string;
    },
  ) {
    super(options);
    this.name = 'PlanExhaustedError';
    this.axis = options.axis;
    this.windowResetsAt = options.windowResetsAt;
    this.upgradeUrl = options.upgradeUrl;
  }
}

/**
 * Raised on HTTP 403 when a plan entity limit is exceeded.
 */
export class PlanLimitExceededError extends FoxnoseAPIError {
  /** Entity whose limit was exceeded (e.g. collections, environments, api_keys). */
  readonly entity?: string;
  /** Maximum allowed by the current plan. */
  readonly limit?: number;
  /** Current count that triggered the error. */
  readonly current?: number;
  /** URL where the plan can be upgraded, if provided. */
  readonly upgradeUrl?: string;

  constructor(
    options: APIErrorOptions & {
      entity?: string;
      limit?: number;
      current?: number;
      upgradeUrl?: string;
    },
  ) {
    super(options);
    this.name = 'PlanLimitExceededError';
    this.entity = options.entity;
    this.limit = options.limit;
    this.current = options.current;
    this.upgradeUrl = options.upgradeUrl;
  }
}

/**
 * Raised on HTTP 429 when the request rate limit is exceeded.
 */
export class RateLimitExceededError extends FoxnoseAPIError {
  /** Seconds to wait before retrying, from the Retry-After header. */
  readonly retryAfter?: number;

  constructor(options: APIErrorOptions & { retryAfter?: number }) {
    super(options);
    this.name = 'RateLimitExceededError';
    this.retryAfter = options.retryAfter;
  }
}

/** Returns true only for a plain (non-null, non-array) object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Case-insensitive header lookup over a header map. */
function getHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}

/**
 * Builds the most specific {@link FoxnoseAPIError} subclass for a response,
 * mapping known (statusCode, errorCode) pairs to typed exceptions. Never
 * throws while parsing; malformed payloads fall through to the base class.
 */
export function buildAPIError(options: APIErrorOptions): FoxnoseAPIError {
  const { statusCode, errorCode, detail, responseHeaders, responseBody } = options;
  const body = isPlainObject(responseBody) ? responseBody : undefined;

  if (statusCode === 402 && errorCode === 'spend_cap_reached' && body) {
    return new SpendCapExceededError({
      ...options,
      message: 'message' in body ? options.message : 'Spend cap reached',
      capUsd:
        typeof body.cap_usd === 'number' ? body.cap_usd : body.cap_usd === null ? null : undefined,
      cycleResetsAt: typeof body.cycle_resets_at === 'string' ? body.cycle_resets_at : undefined,
      raiseCapUrl: typeof body.raise_cap_url === 'string' ? body.raise_cap_url : undefined,
    });
  }

  if (statusCode === 402 && errorCode === 'plan_exhausted' && body) {
    return new PlanExhaustedError({
      ...options,
      message: 'message' in body ? options.message : 'Plan allowance exhausted',
      axis: typeof body.axis === 'string' ? body.axis : undefined,
      windowResetsAt: typeof body.window_resets_at === 'string' ? body.window_resets_at : undefined,
      upgradeUrl: typeof body.upgrade_url === 'string' ? body.upgrade_url : undefined,
    });
  }

  if (statusCode === 403 && errorCode === 'plan_limit_exceeded') {
    const d = isPlainObject(detail) ? detail : {};
    return new PlanLimitExceededError({
      ...options,
      entity: typeof d.entity === 'string' ? d.entity : undefined,
      limit: typeof d.limit === 'number' ? d.limit : undefined,
      current: typeof d.current === 'number' ? d.current : undefined,
      upgradeUrl: typeof d.upgrade_url === 'string' ? d.upgrade_url : undefined,
    });
  }

  if (statusCode === 429 && errorCode === 'rate_limited') {
    const raw = getHeader(responseHeaders, 'Retry-After');
    const parsed = raw !== undefined ? Number(raw) : NaN;
    return new RateLimitExceededError({
      ...options,
      retryAfter: Number.isNaN(parsed) ? undefined : parsed,
    });
  }

  return new FoxnoseAPIError(options);
}

/**
 * Raised when authentication headers cannot be generated.
 */
export class FoxnoseAuthError extends FoxnoseError {
  constructor(message: string) {
    super(message);
    this.name = 'FoxnoseAuthError';
  }
}

/**
 * Raised when the HTTP layer fails before receiving a response.
 */
export class FoxnoseTransportError extends FoxnoseError {
  constructor(message: string) {
    super(message);
    this.name = 'FoxnoseTransportError';
  }
}
