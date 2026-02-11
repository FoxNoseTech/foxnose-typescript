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
