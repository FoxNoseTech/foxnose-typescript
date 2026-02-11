import { createHash, createSign } from 'node:crypto';

import { FoxnoseAuthError } from '../errors.js';
import type { AuthStrategy, RequestData } from './types.js';

type Clock = () => Date;

/**
 * Implements the `Secure <public>:<signature>` header used by both APIs.
 *
 * The signature uses ECDSA P-256 over `<path>|<sha256(body)>|<timestamp>`.
 */
export class SecureKeyAuth implements AuthStrategy {
  private readonly publicKey: string;
  private readonly privateKeyPem: string;
  private readonly clock: Clock;

  constructor(publicKey: string, privateKey: string, options?: { clock?: Clock }) {
    if (!publicKey || !privateKey) {
      throw new Error('publicKey and privateKey are required');
    }
    this.publicKey = publicKey;
    this.clock = options?.clock ?? (() => new Date());

    try {
      // The private key comes as base64-encoded DER. Convert to PEM for node:crypto.
      const derB64 = privateKey;
      this.privateKeyPem =
        `-----BEGIN EC PRIVATE KEY-----\n` +
        derB64.match(/.{1,64}/g)!.join('\n') +
        `\n-----END EC PRIVATE KEY-----`;
    } catch (err) {
      throw new FoxnoseAuthError(`Failed to load private key: ${err}`);
    }
  }

  buildHeaders(request: RequestData): Record<string, string> {
    const body = request.body ?? new Uint8Array(0);
    const now = this.clock();
    const timestamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

    let path: string;
    try {
      const parsed = new URL(request.url);
      path = parsed.pathname || '/';
      if (parsed.search) {
        path = `${path}${parsed.search}`;
      }
    } catch {
      path = request.path || '/';
    }

    const bodyHash = createHash('sha256').update(body).digest('hex');
    const dataToSign = `${path}|${bodyHash}|${timestamp}`;

    const signer = createSign('SHA256');
    signer.update(dataToSign);
    signer.end();

    const signatureBuffer = signer.sign({
      key: this.privateKeyPem,
      dsaEncoding: 'der',
    });
    const signatureB64 = signatureBuffer.toString('base64');

    return {
      Authorization: `Secure ${this.publicKey}:${signatureB64}`,
      Date: timestamp,
    };
  }
}
