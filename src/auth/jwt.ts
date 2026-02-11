import type { AuthStrategy, RequestData, TokenProvider } from './types.js';

/**
 * Simple token provider that always returns the same token.
 */
export class StaticTokenProvider implements TokenProvider {
  constructor(private readonly token: string) {}

  getToken(): string {
    return this.token;
  }
}

/**
 * Adds `Authorization: Bearer` headers using a token provider.
 */
export class JWTAuth implements AuthStrategy {
  private readonly provider: TokenProvider;
  private readonly scheme: string;

  constructor(provider: TokenProvider, options?: { scheme?: string }) {
    this.provider = provider;
    this.scheme = options?.scheme ?? 'Bearer';
  }

  buildHeaders(_request: RequestData): Record<string, string> {
    const token = this.provider.getToken();
    if (!token) {
      throw new Error('Token provider returned an empty token');
    }
    return { Authorization: `${this.scheme} ${token}` };
  }

  /**
   * Convenience constructor for scripts with manual token management.
   */
  static fromStaticToken(token: string, options?: { scheme?: string }): JWTAuth {
    return new JWTAuth(new StaticTokenProvider(token), options);
  }
}
