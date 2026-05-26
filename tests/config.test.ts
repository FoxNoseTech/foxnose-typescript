import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { VERSION } from '../src/index.js';
import { createConfig, DEFAULT_RETRY_CONFIG, DEFAULT_USER_AGENT, SDK_VERSION } from '../src/config.js';

describe('createConfig', () => {
  it('creates config with defaults', () => {
    const config = createConfig({ baseUrl: 'https://api.example.com' });
    expect(config.baseUrl).toBe('https://api.example.com');
    expect(config.timeout).toBe(30_000);
    expect(config.userAgent).toBe(DEFAULT_USER_AGENT);
    expect(config.defaultHeaders).toBeUndefined();
  });

  it('strips trailing slashes from baseUrl', () => {
    const config = createConfig({ baseUrl: 'https://api.example.com///' });
    expect(config.baseUrl).toBe('https://api.example.com');
  });

  it('applies custom options', () => {
    const config = createConfig({
      baseUrl: 'https://custom.api.com',
      timeout: 5000,
      userAgent: 'my-agent/1.0',
      defaultHeaders: { 'X-Custom': 'value' },
    });
    expect(config.timeout).toBe(5000);
    expect(config.userAgent).toBe('my-agent/1.0');
    expect(config.defaultHeaders).toEqual({ 'X-Custom': 'value' });
  });

  it('throws on empty baseUrl', () => {
    expect(() => createConfig({ baseUrl: '' })).toThrow('baseUrl must be provided');
  });
});

describe('SDK_VERSION', () => {
  it('matches package.json version (drift check)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(resolve(here, '..', 'package.json'), 'utf8'),
    );
    expect(SDK_VERSION).toBe(pkg.version);
    expect(VERSION).toBe(pkg.version);
    expect(DEFAULT_USER_AGENT).toBe(`foxnose-sdk-js/${pkg.version}`);
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_RETRY_CONFIG.attempts).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.backoffFactor).toBe(0.5);
    expect(DEFAULT_RETRY_CONFIG.statusCodes).toContain(429);
    expect(DEFAULT_RETRY_CONFIG.statusCodes).toContain(503);
    expect(DEFAULT_RETRY_CONFIG.methods).toContain('GET');
    expect(DEFAULT_RETRY_CONFIG.methods).not.toContain('POST');
  });
});
