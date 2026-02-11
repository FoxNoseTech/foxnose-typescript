/**
 * Immutable view of the outbound request used when applying auth.
 */
export interface RequestData {
  method: string;
  url: string;
  path: string;
  body: Uint8Array;
}

/**
 * Interface implemented by every authentication strategy.
 */
export interface AuthStrategy {
  buildHeaders(request: RequestData): Record<string, string>;
}

/**
 * Provides access tokens for JWT auth.
 */
export interface TokenProvider {
  getToken(): string;
}
