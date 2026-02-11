/**
 * Controls HTTP retry behavior for idempotent requests.
 */
export interface RetryConfig {
  /** Total number of attempts (original request + retries). */
  attempts: number;
  /** Multiplier for exponential backoff delays. */
  backoffFactor: number;
  /** Response statuses that should be retried. */
  statusCodes: readonly number[];
  /** HTTP methods that are eligible for retrying. */
  methods: readonly string[];
}

export const DEFAULT_RETRY_CONFIG: Readonly<RetryConfig> = {
  attempts: 3,
  backoffFactor: 0.5,
  statusCodes: [408, 425, 429, 500, 502, 503, 504],
  methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
};

export const SDK_VERSION = '0.1.1';

export const DEFAULT_USER_AGENT = `foxnose-sdk-js/${SDK_VERSION}`;

/**
 * General transport-level configuration shared by all clients.
 */
export interface FoxnoseConfig {
  /** Root URL (including scheme) for the API. */
  baseUrl: string;
  /** Request timeout in milliseconds. */
  timeout: number;
  /** Headers applied to every request (lower priority than per-call headers). */
  defaultHeaders?: Record<string, string>;
  /** User agent string reported to the API. */
  userAgent: string;
}

/**
 * Creates a validated FoxnoseConfig with defaults applied.
 */
export function createConfig(options: {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  userAgent?: string;
}): FoxnoseConfig {
  if (!options.baseUrl) {
    throw new Error('baseUrl must be provided');
  }
  return {
    baseUrl: options.baseUrl.replace(/\/+$/, ''),
    timeout: options.timeout ?? 30_000,
    defaultHeaders: options.defaultHeaders,
    userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
  };
}
