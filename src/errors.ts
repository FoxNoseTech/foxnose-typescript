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
 * Raised on HTTP 402 `files_quota_exceeded` when no file processing units are left.
 *
 * `reason` says what ran out, and the matching link is `upgradeUrl` or `raiseCapUrl`.
 * A refusal relayed by Flux carries the code only, so these fields are undefined there.
 */
export class FilesQuotaExceededError extends FoxnoseAPIError {
  readonly axis?: string;
  readonly reason?: string;
  readonly usedUnits?: number;
  readonly includedUnits?: number | null;
  readonly capUsd?: number | null;
  readonly windowResetsAt?: string | null;
  readonly upgradeUrl?: string;
  readonly raiseCapUrl?: string;

  constructor(
    options: APIErrorOptions & {
      axis?: string;
      reason?: string;
      usedUnits?: number;
      includedUnits?: number | null;
      capUsd?: number | null;
      windowResetsAt?: string | null;
      upgradeUrl?: string;
      raiseCapUrl?: string;
    },
  ) {
    super(options);
    this.name = 'FilesQuotaExceededError';
    this.axis = options.axis;
    this.reason = options.reason;
    this.usedUnits = options.usedUnits;
    this.includedUnits = options.includedUnits;
    this.capUsd = options.capUsd;
    this.windowResetsAt = options.windowResetsAt;
    this.upgradeUrl = options.upgradeUrl;
    this.raiseCapUrl = options.raiseCapUrl;
  }
}

/**
 * Raised on HTTP 503 `files_quota_unavailable` when the file processing quota could
 * not be read, so nothing was started. Retry after `retryAfter` seconds.
 */
export class FilesQuotaUnavailableError extends FoxnoseAPIError {
  readonly retryAfter?: number;

  constructor(options: APIErrorOptions & { retryAfter?: number }) {
    super(options);
    this.name = 'FilesQuotaUnavailableError';
    this.retryAfter = options.retryAfter;
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

/**
 * Raised on HTTP 403 when the target collection does not accept writes (or the
 * key in use lacks write access).
 */
export class CollectionNotWritableError extends FoxnoseAPIError {
  constructor(options: APIErrorOptions) {
    super(options);
    this.name = 'CollectionNotWritableError';
  }
}

/**
 * Raised on HTTP 409 when the supplied `key` already identifies a resource.
 */
export class ExternalIdConflictError extends FoxnoseAPIError {
  constructor(options: APIErrorOptions) {
    super(options);
    this.name = 'ExternalIdConflictError';
  }
}

/**
 * Raised on HTTP 422 when submitted `data` fails the collection's schema.
 *
 * Two server error codes mean this, and both map here:
 * `content_validation_failed` and `data_validation_error`. The latter is what
 * a Flux resource write returns, so leaving it unmapped meant the most common
 * way to hit a schema violation raised a bare {@link FoxnoseAPIError}, and
 * `instanceof ContentValidationFailedError` never matched it.
 */
export class ContentValidationFailedError extends FoxnoseAPIError {
  /** Individual validation problems; each includes a `json_path`. */
  readonly errors: unknown[];
  /** True when the server capped a very large error list. */
  readonly errorsTruncated: boolean;

  constructor(options: APIErrorOptions & { errors?: unknown[]; errorsTruncated?: boolean }) {
    super(options);
    this.name = 'ContentValidationFailedError';
    this.errors = options.errors ?? [];
    this.errorsTruncated = options.errorsTruncated ?? false;
  }
}

/**
 * Raised on HTTP 502 when a write could not be confirmed. The write may or may
 * not have been applied — re-read the resource with a GET before retrying.
 */
export class UpstreamError extends FoxnoseAPIError {
  constructor(options: APIErrorOptions) {
    super(options);
    this.name = 'UpstreamError';
  }
}

/**
 * Raised on HTTP 404 `webhook_endpoint_not_found`: no endpoint with this id in the
 * environment.
 */
export class WebhookEndpointNotFoundError extends FoxnoseAPIError {
  constructor(options: APIErrorOptions) {
    super(options);
    this.name = 'WebhookEndpointNotFoundError';
  }
}

/**
 * Raised on HTTP 404 `webhook_event_not_found`: no such event in the environment
 * within the last 30 days.
 */
export class WebhookEventNotFoundError extends FoxnoseAPIError {
  constructor(options: APIErrorOptions) {
    super(options);
    this.name = 'WebhookEventNotFoundError';
  }
}

/**
 * Raised on HTTP 409 `limit_exceeded`: the environment already has the most webhook
 * endpoints it can have (20).
 */
export class WebhookEndpointLimitExceededError extends FoxnoseAPIError {
  constructor(options: APIErrorOptions) {
    super(options);
    this.name = 'WebhookEndpointLimitExceededError';
  }
}

/**
 * Raised on HTTP 409 `endpoint_not_active`: the endpoint is paused, disabled or
 * deleted, so a test event, a recovery or a redelivery cannot go to it.
 */
export class WebhookEndpointNotActiveError extends FoxnoseAPIError {
  /** The endpoint's state (`paused`, `disabled` or `deleted`) when the call named it. */
  readonly reason?: string;
  /** Endpoints a redelivery without `endpoint_id` passed over, each with `endpoint_id` and `reason`. */
  readonly skipped: unknown[];

  constructor(options: APIErrorOptions & { reason?: string; skipped?: unknown[] }) {
    super(options);
    this.name = 'WebhookEndpointNotActiveError';
    this.reason = options.reason;
    this.skipped = options.skipped ?? [];
  }
}

/**
 * Raised on HTTP 409 `endpoint_not_subscribed`: the endpoint's current event types or
 * collection filter do not cover the event.
 */
export class WebhookEndpointNotSubscribedError extends FoxnoseAPIError {
  /** Endpoints a redelivery without `endpoint_id` passed over, each with `endpoint_id` and `reason`. */
  readonly skipped: unknown[];

  constructor(options: APIErrorOptions & { skipped?: unknown[] }) {
    super(options);
    this.name = 'WebhookEndpointNotSubscribedError';
    this.skipped = options.skipped ?? [];
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

/** `Retry-After` in seconds, or undefined when absent or not a number. */
function retryAfterSeconds(headers: Record<string, string> | undefined): number | undefined {
  const raw = getHeader(headers, 'Retry-After');
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Builds the most specific {@link FoxnoseAPIError} subclass for a response,
 * mapping known (statusCode, errorCode) pairs to typed exceptions. Never
 * throws while parsing; malformed payloads fall through to the base class.
 */
/**
 * Codes that both describe data rejected by the collection schema.
 *
 * The resource-write path raises `RevisionValidationError`
 * (`data_validation_error`); other paths raise the content variant. They carry
 * the same detail payload, so both map to the same class.
 */
const CONTENT_VALIDATION_CODES = new Set(['content_validation_failed', 'data_validation_error']);

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

  if (statusCode === 402 && errorCode === 'files_quota_exceeded' && body) {
    const numberOrNull = (value: unknown) =>
      typeof value === 'number' ? value : value === null ? null : undefined;
    const text = (value: unknown) => (typeof value === 'string' ? value : undefined);
    return new FilesQuotaExceededError({
      ...options,
      message: 'message' in body ? options.message : 'File processing quota reached',
      axis: text(body.axis),
      reason: text(body.reason),
      usedUnits: typeof body.used_units === 'number' ? body.used_units : undefined,
      includedUnits: numberOrNull(body.included_units),
      capUsd: numberOrNull(body.cap_usd),
      windowResetsAt: body.window_resets_at === null ? null : text(body.window_resets_at),
      upgradeUrl: text(body.upgrade_url),
      raiseCapUrl: text(body.raise_cap_url),
    });
  }

  if (statusCode === 503 && errorCode === 'files_quota_unavailable') {
    return new FilesQuotaUnavailableError({
      ...options,
      message: body && 'message' in body ? options.message : 'File processing quota is unavailable',
      retryAfter: retryAfterSeconds(responseHeaders),
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
    return new RateLimitExceededError({
      ...options,
      retryAfter: retryAfterSeconds(responseHeaders),
    });
  }

  if (statusCode === 403 && errorCode === 'collection_not_writable') {
    return new CollectionNotWritableError(options);
  }

  if (statusCode === 409 && errorCode === 'external_id_conflict') {
    return new ExternalIdConflictError(options);
  }

  if (statusCode === 422 && CONTENT_VALIDATION_CODES.has(errorCode as string)) {
    const d = isPlainObject(detail) ? detail : {};
    const errors = Array.isArray(d.errors) ? d.errors : typeof d.json_path === 'string' ? [d] : [];
    return new ContentValidationFailedError({
      ...options,
      errors,
      errorsTruncated: d.errors_truncated === true,
    });
  }

  if (statusCode === 404 && errorCode === 'webhook_endpoint_not_found') {
    return new WebhookEndpointNotFoundError(options);
  }

  if (statusCode === 404 && errorCode === 'webhook_event_not_found') {
    return new WebhookEventNotFoundError(options);
  }

  if (statusCode === 409 && errorCode === 'limit_exceeded') {
    return new WebhookEndpointLimitExceededError(options);
  }

  if (statusCode === 409 && errorCode === 'endpoint_not_active') {
    const d = isPlainObject(detail) ? detail : {};
    return new WebhookEndpointNotActiveError({
      ...options,
      reason: typeof d.reason === 'string' ? d.reason : undefined,
      skipped: Array.isArray(d.skipped) ? d.skipped : undefined,
    });
  }

  if (statusCode === 409 && errorCode === 'endpoint_not_subscribed') {
    const d = isPlainObject(detail) ? detail : {};
    return new WebhookEndpointNotSubscribedError({
      ...options,
      skipped: Array.isArray(d.skipped) ? d.skipped : undefined,
    });
  }

  if (statusCode === 502 && errorCode === 'upstream_error') {
    return new UpstreamError(options);
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
