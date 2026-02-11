import type { AuthStrategy } from '../auth/types.js';
import type { RetryConfig } from '../config.js';
import { createConfig } from '../config.js';
import { HttpTransport } from '../http.js';

function cleanPrefix(prefix: string): string {
  const value = prefix.replace(/^\/+|\/+$/g, '');
  if (!value) {
    throw new Error('apiPrefix cannot be empty');
  }
  return value;
}

function normalizeFolderPath(folderPath: string): string {
  return folderPath.replace(/^\/+|\/+$/g, '');
}

export interface FluxClientOptions {
  baseUrl: string;
  apiPrefix: string;
  auth: AuthStrategy;
  timeout?: number;
  retryConfig?: RetryConfig;
  defaultHeaders?: Record<string, string>;
}

/**
 * Client for FoxNose Flux delivery APIs.
 *
 * All methods are async and return parsed JSON responses.
 */
export class FluxClient {
  readonly apiPrefix: string;
  private readonly transport: HttpTransport;

  constructor(options: FluxClientOptions) {
    this.apiPrefix = cleanPrefix(options.apiPrefix);
    const config = createConfig({
      baseUrl: options.baseUrl,
      timeout: options.timeout ?? 15_000,
      defaultHeaders: options.defaultHeaders,
    });
    this.transport = new HttpTransport({
      config,
      auth: options.auth,
      retryConfig: options.retryConfig,
    });
  }

  private buildPath(folderPath: string, suffix = ''): string {
    const folder = normalizeFolderPath(folderPath);
    const base = `/${this.apiPrefix}/${folder}`;
    return suffix ? `${base}${suffix}` : base;
  }

  async listResources(folderPath: string, params?: Record<string, any>): Promise<any> {
    const path = this.buildPath(folderPath);
    return this.transport.request('GET', path, { params });
  }

  async getResource(
    folderPath: string,
    resourceKey: string,
    params?: Record<string, any>,
  ): Promise<any> {
    const path = this.buildPath(folderPath, `/${resourceKey}`);
    return this.transport.request('GET', path, { params });
  }

  async search(folderPath: string, body: Record<string, any>): Promise<any> {
    const path = this.buildPath(folderPath, '/_search');
    return this.transport.request('POST', path, { jsonBody: body });
  }

  close(): void {
    this.transport.close();
  }
}
