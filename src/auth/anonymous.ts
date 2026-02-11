import type { AuthStrategy, RequestData } from './types.js';

/**
 * Placeholder auth strategy when no credentials are required.
 */
export class AnonymousAuth implements AuthStrategy {
  buildHeaders(_request: RequestData): Record<string, string> {
    return {};
  }
}
