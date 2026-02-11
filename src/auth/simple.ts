import type { AuthStrategy, RequestData } from './types.js';

/**
 * Adds `Authorization: Simple` headers for development usage.
 */
export class SimpleKeyAuth implements AuthStrategy {
  private readonly publicKey: string;
  private readonly secretKey: string;

  constructor(publicKey: string, secretKey: string) {
    if (!publicKey || !secretKey) {
      throw new Error('publicKey and secretKey are required');
    }
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }

  buildHeaders(_request: RequestData): Record<string, string> {
    return { Authorization: `Simple ${this.publicKey}:${this.secretKey}` };
  }
}
