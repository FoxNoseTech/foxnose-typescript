import { AnonymousAuth } from './auth/anonymous.js';
import type { AuthStrategy, RequestData } from './auth/types.js';
import type { FoxnoseConfig, RetryConfig } from './config.js';
import { DEFAULT_RETRY_CONFIG } from './config.js';
import { FoxnoseAPIError, FoxnoseTransportError } from './errors.js';

/**
 * Shared HTTP transport with retry logic built on native `fetch`.
 */
export class HttpTransport {
  private readonly config: FoxnoseConfig;
  private readonly auth: AuthStrategy;
  private readonly retry: RetryConfig;

  constructor(options: {
    config: FoxnoseConfig;
    auth?: AuthStrategy;
    retryConfig?: RetryConfig;
  }) {
    this.config = options.config;
    this.auth = options.auth ?? new AnonymousAuth();
    this.retry = options.retryConfig ?? { ...DEFAULT_RETRY_CONFIG };
  }

  async request(
    method: string,
    path: string,
    options?: {
      params?: Record<string, any>;
      jsonBody?: any;
      content?: Uint8Array;
      headers?: Record<string, string>;
      parseJson?: boolean;
    },
  ): Promise<any> {
    const parseJson = options?.parseJson ?? true;
    const response = await this.sendWithRetries(method, path, options);
    return this.maybeDecodeResponse(response, parseJson);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close(): void {}

  private buildUrl(path: string, params?: Record<string, any>): string {
    const base = this.config.baseUrl + path;
    if (!params || Object.keys(params).length === 0) {
      return base;
    }
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private buildRequest(
    method: string,
    path: string,
    options?: {
      params?: Record<string, any>;
      jsonBody?: any;
      content?: Uint8Array;
      headers?: Record<string, string>;
    },
  ): { url: string; init: RequestInit; body: Uint8Array } {
    const headers: Record<string, string> = {};

    if (this.config.defaultHeaders) {
      Object.assign(headers, this.config.defaultHeaders);
    }
    headers['User-Agent'] = headers['User-Agent'] ?? this.config.userAgent;

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    let body: Uint8Array = new Uint8Array(0);
    let bodyInit: string | Uint8Array | undefined;

    if (options?.jsonBody !== undefined) {
      const jsonStr = JSON.stringify(options.jsonBody);
      body = new TextEncoder().encode(jsonStr);
      bodyInit = jsonStr;
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    } else if (options?.content) {
      body = options.content;
      bodyInit = options.content;
    }

    const url = this.buildUrl(path, options?.params);

    const requestData: RequestData = {
      method: method.toUpperCase(),
      url,
      path: path + (options?.params ? `?${new URLSearchParams(options.params as Record<string, string>).toString()}` : ''),
      body,
    };

    const authHeaders = this.auth.buildHeaders(requestData);
    if (authHeaders) {
      Object.assign(headers, authHeaders);
    }

    const init: RequestInit = {
      method: method.toUpperCase(),
      headers,
      body: bodyInit,
    };

    return { url, init, body };
  }

  private shouldRetry(method: string, statusCode: number): boolean {
    if (!this.retry.methods.includes(method.toUpperCase())) {
      return false;
    }
    return this.retry.statusCodes.includes(statusCode);
  }

  private computeDelay(attempt: number, retryAfter?: string | null): number {
    if (retryAfter) {
      const parsed = parseFloat(retryAfter);
      if (!isNaN(parsed)) {
        return parsed * 1000;
      }
      return 0;
    }
    return this.retry.backoffFactor * Math.pow(2, Math.max(attempt - 1, 0)) * 1000;
  }

  private async maybeDecodeResponse(response: Response, parseJson: boolean): Promise<any> {
    if (!parseJson) {
      return response;
    }
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async sendWithRetries(
    method: string,
    path: string,
    options?: {
      params?: Record<string, any>;
      jsonBody?: any;
      content?: Uint8Array;
      headers?: Record<string, string>;
    },
  ): Promise<Response> {
    for (let attempt = 1; attempt <= this.retry.attempts; attempt++) {
      const { url, init } = this.buildRequest(method, path, options);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      init.signal = controller.signal;

      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (err) {
        clearTimeout(timeoutId);
        const delay = this.handleTransportError(err, method, attempt);
        if (delay > 0) {
          await this.sleep(delay);
        }
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status >= 400) {
        if (this.shouldRetry(method, response.status) && attempt < this.retry.attempts) {
          const delay = this.computeDelay(attempt, response.headers.get('Retry-After'));
          if (delay > 0) {
            await this.sleep(delay);
          }
          continue;
        }
        await this.raiseAPIError(response);
      }

      return response;
    }

    throw new FoxnoseTransportError('All retry attempts exhausted');
  }

  private handleTransportError(err: unknown, method: string, attempt: number): number {
    const canRetry =
      this.retry.methods.includes(method.toUpperCase()) && attempt < this.retry.attempts;
    if (!canRetry) {
      const message = err instanceof Error ? err.message : String(err);
      throw new FoxnoseTransportError(message);
    }
    return this.computeDelay(attempt);
  }

  private async raiseAPIError(response: Response): Promise<never> {
    let message = '';
    let errorCode: string | undefined;
    let detail: unknown;
    let body: unknown;

    try {
      const text = await response.text();
      message = text;
      if (text) {
        try {
          const payload = JSON.parse(text);
          message = payload.message ?? message;
          errorCode = payload.error_code;
          detail = payload.detail;
          body = payload;
        } catch {
          body = text;
        }
      }
    } catch {
      // ignore read errors
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    throw new FoxnoseAPIError({
      message: message || 'API request failed',
      statusCode: response.status,
      errorCode,
      detail,
      responseHeaders,
      responseBody: body,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
