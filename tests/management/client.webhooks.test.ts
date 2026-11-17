/**
 * Outbound webhooks on the Management client.
 *
 * The payloads mirror core's webhooks/serializers.py, webhooks/views.py and
 * webhooks/services.py.
 */

import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthStrategy, RequestData } from '../../src/auth/types.js';
import {
  FoxnoseAPIError,
  FoxnoseTransportError,
  WebhookEndpointLimitExceededError,
  WebhookEndpointNotActiveError,
  WebhookEndpointNotFoundError,
  WebhookEndpointNotSubscribedError,
  WebhookEventNotFoundError,
} from '../../src/errors.js';
import { ManagementClient } from '../../src/management/client.js';
import type {
  WebhookAttemptList,
  WebhookEndpoint,
  WebhookEndpointDeliveryList,
  WebhookEndpointList,
  WebhookEventDetail,
  WebhookEventList,
  WebhookEventTypeList,
  WebhookRedeliveryResult,
} from '../../src/management/models.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Bearer test-token' };
  },
};

const ENV = 'env-123';
const ENDPOINT = '3f6c2a8e-91d4-4b7a-a5e2-0c9d8b7f1e23';
const EVENT = 'evt_01JCX3Q9W2B5V7RZ0D4K6M8P1T';
const ROOT = `https://api.test.com/v1/${ENV}/webhooks`;
const EP = `${ROOT}/endpoints/${ENDPOINT}`;
const EV = `${ROOT}/events/${EVENT}`;

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw8Gx5FN2xCTE=';
const NEW_SECRET = 'whsec_Q2b7Fz1kR8nYc4Lm0VtX9pWs3dHj6GaEuKo5NiBrT1A=';

const ENDPOINT_BODY: WebhookEndpoint = {
  id: ENDPOINT,
  url: 'https://hooks.example.com/foxnose',
  description: 'Search index sync',
  event_types: ['revision.published', 'resource.deleted'],
  collection_keys: ['mK8nP3tYvBcX'],
  payload_mode: 'content',
  version: 1,
  status: 'active',
  disabled_reason: null,
  failing_since: null,
  disabled_at: null,
  created_at: '2026-11-12T09:30:12.418226+00:00',
  updated_at: '2026-11-12T09:30:12.418226+00:00',
};

const ENDPOINTS: WebhookEndpointList = {
  count: 1,
  next: null,
  previous: null,
  results: [{ ...ENDPOINT_BODY, stats_24h: { attempts: 42, succeeded: 41 } }],
};

const DELIVERY = {
  id: '9b1e7c42-5d3a-4f8e-b2c6-7a0d1e9f3c85',
  endpoint: { id: ENDPOINT, deleted: false },
  status: 'pending' as const,
  attempts: 2,
  last_status_code: 503,
  last_error: null,
  created_at: '2026-11-12T09:41:07.530114+00:00',
  finished_at: null,
  next_attempt_at: '2026-11-12T09:41:28.902311+00:00',
};

const DELIVERIES: WebhookEndpointDeliveryList = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      ...DELIVERY,
      event_id: EVENT,
      event: { id: EVENT, type: 'revision.published', test: false },
    },
  ],
};

const EVENT_ITEM = {
  id: EVENT,
  type: 'revision.published',
  created_at: '2026-11-12T09:41:07.512000+00:00',
  test: false,
  collection_key: 'mK8nP3tYvBcX',
};

const EVENTS: WebhookEventList = {
  count: 1,
  next: null,
  previous: null,
  results: [{ ...EVENT_ITEM, delivery_counts: { pending: 1, succeeded: 1, dead: 0 } }],
};

const EVENT_DETAIL: WebhookEventDetail = {
  ...EVENT_ITEM,
  envelope: { id: EVENT, type: 'revision.published', version: 1, test: false, data: {} },
  deliveries: [DELIVERY],
};

const ATTEMPTS: WebhookAttemptList = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: '7e2a9c4d-1b8f-4d6a-9e3c-5a0b7d2f8c61',
      delivery_id: DELIVERY.id,
      endpoint: { id: ENDPOINT, deleted: true },
      created_at: '2026-11-12T09:41:13.640981+00:00',
      status_code: 503,
      latency_ms: 212,
      error_class: null,
      response_excerpt: 'upstream unavailable',
    },
  ],
};

const REDELIVERED: WebhookRedeliveryResult = {
  event_id: EVENT,
  deliveries: [{ id: '2a7d4f9c-8e1b-4c3a-b6d5-9f0e2a8c7b13', endpoint_id: ENDPOINT }],
  skipped: [{ endpoint_id: '5c9e1a7b-3d2f-4b8a-8c6e-1f4d7a0b9e52', reason: 'paused' }],
};

const EVENT_TYPES: WebhookEventTypeList = {
  results: [
    {
      name: 'resource.created',
      description: 'A resource is created.',
      collection_scoped: true,
      schemas: { references: { type: 'object' }, content: { type: 'object' } },
    },
  ],
};

function setupMockFetch(response: any = {}, status = 200) {
  const fetchMock = vi.fn(async () =>
    status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(response), { status }),
  );
  globalThis.fetch = fetchMock;
  return fetchMock;
}

function createClient(retryMethods: string[] = []) {
  return new ManagementClient({
    baseUrl: 'https://api.test.com',
    environmentKey: ENV,
    auth: dummyAuth,
    timeout: 1000,
    retryConfig: { attempts: 2, backoffFactor: 0, statusCodes: [], methods: retryMethods },
  });
}

function lastCall(fetchMock: ReturnType<typeof setupMockFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, method: init.method, body: init.body as string | undefined };
}

const originalFetch = globalThis.fetch;
beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

type Client = ManagementClient;

const CALLS: [string, (c: Client) => Promise<unknown>, string, string, number, unknown][] = [
  [
    'listWebhookEndpoints',
    (c) => c.listWebhookEndpoints({ status: 'active', limit: 5 }),
    'GET',
    `${ROOT}/endpoints/?status=active&limit=5`,
    200,
    ENDPOINTS,
  ],
  [
    'createWebhookEndpoint',
    (c) =>
      c.createWebhookEndpoint({
        url: 'https://hooks.example.com/foxnose',
        event_types: ['resource.deleted'],
      }),
    'POST',
    `${ROOT}/endpoints/`,
    201,
    { ...ENDPOINT_BODY, secret: SECRET },
  ],
  [
    'getWebhookEndpoint',
    (c) => c.getWebhookEndpoint(ENDPOINT),
    'GET',
    `${EP}/`,
    200,
    ENDPOINT_BODY,
  ],
  [
    'updateWebhookEndpoint',
    (c) => c.updateWebhookEndpoint(ENDPOINT, { status: 'paused' }),
    'PATCH',
    `${EP}/`,
    200,
    { ...ENDPOINT_BODY, status: 'paused' },
  ],
  [
    'listWebhookEndpointDeliveries',
    (c) => c.listWebhookEndpointDeliveries(ENDPOINT, { offset: 10 }),
    'GET',
    `${EP}/deliveries/?offset=10`,
    200,
    DELIVERIES,
  ],
  [
    'getWebhookEndpointSecret',
    (c) => c.getWebhookEndpointSecret(ENDPOINT),
    'GET',
    `${EP}/secret/`,
    200,
    { secret: SECRET },
  ],
  [
    'rotateWebhookEndpointSecret',
    (c) => c.rotateWebhookEndpointSecret(ENDPOINT),
    'POST',
    `${EP}/secret/rotate/`,
    200,
    { secret: NEW_SECRET, previous_secret_expires_at: '2026-11-13T10:02:51+00:00' },
  ],
  [
    'sendWebhookTestEvent',
    (c) => c.sendWebhookTestEvent(ENDPOINT, 'revision.published'),
    'POST',
    `${EP}/test/`,
    202,
    { event_id: EVENT, delivery_id: DELIVERY.id },
  ],
  [
    'recoverWebhookDeliveries',
    (c) => c.recoverWebhookDeliveries(ENDPOINT, '2026-11-10T00:00:00Z'),
    'POST',
    `${EP}/recover/`,
    202,
    { requeued: 37, more: false },
  ],
  [
    'listWebhookEvents',
    (c) => c.listWebhookEvents({ type: 'resource.deleted', test: false }),
    'GET',
    `${ROOT}/events/?type=resource.deleted&test=false`,
    200,
    EVENTS,
  ],
  ['getWebhookEvent', (c) => c.getWebhookEvent(EVENT), 'GET', `${EV}/`, 200, EVENT_DETAIL],
  [
    'listWebhookEventAttempts',
    (c) => c.listWebhookEventAttempts(EVENT),
    'GET',
    `${EV}/attempts/`,
    200,
    ATTEMPTS,
  ],
  [
    'redeliverWebhookEvent',
    (c) => c.redeliverWebhookEvent(EVENT),
    'POST',
    `${EV}/redeliver/`,
    202,
    REDELIVERED,
  ],
  [
    'listWebhookEventTypes',
    (c) => c.listWebhookEventTypes(),
    'GET',
    `${ROOT}/event-types/`,
    200,
    EVENT_TYPES,
  ],
];

describe('Webhooks', () => {
  it.each(CALLS)('%s', async (_name, call, method, url, status, payload) => {
    const fetchMock = setupMockFetch(payload, status);
    const result = (await call(createClient())) as Record<string, unknown>;
    const sent = lastCall(fetchMock);
    expect(sent.method).toBe(method);
    expect(sent.url).toBe(url);
    // every wire field is returned, secret or not
    for (const key of Object.keys(payload as object)) {
      expect(result[key]).toEqual((payload as Record<string, unknown>)[key]);
    }
  });

  it('deleteWebhookEndpoint answers nothing', async () => {
    const fetchMock = setupMockFetch({}, 204);
    await expect(createClient().deleteWebhookEndpoint(ENDPOINT)).resolves.toBeUndefined();
    expect(lastCall(fetchMock)).toMatchObject({ method: 'DELETE', url: `${EP}/` });
  });

  it('create sends only what was given and resolves collection keys', async () => {
    const fetchMock = setupMockFetch({ ...ENDPOINT_BODY, secret: SECRET }, 201);
    const client = createClient();
    await client.createWebhookEndpoint({
      url: 'https://hooks.example.com/foxnose',
      event_types: ['resource.deleted'],
    });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({
      url: 'https://hooks.example.com/foxnose',
      event_types: ['resource.deleted'],
    });
    await client.createWebhookEndpoint({
      url: 'https://hooks.example.com/foxnose',
      event_types: ['resource.deleted'],
      description: 'Sync',
      collection_keys: ['mK8nP3tYvBcX', { key: 'other' } as any],
      payload_mode: 'content',
      version: 1,
    });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({
      url: 'https://hooks.example.com/foxnose',
      event_types: ['resource.deleted'],
      description: 'Sync',
      collection_keys: ['mK8nP3tYvBcX', 'other'],
      payload_mode: 'content',
      version: 1,
    });
  });

  it('update sends only the changed fields, including empty ones', async () => {
    const fetchMock = setupMockFetch(ENDPOINT_BODY);
    await createClient().updateWebhookEndpoint(ENDPOINT, {
      description: '',
      collection_keys: [],
      status: 'active',
    });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({
      description: '',
      collection_keys: [],
      status: 'active',
    });
  });

  it('action bodies', async () => {
    const fetchMock = setupMockFetch({ secret: NEW_SECRET });
    const client = createClient();
    await client.rotateWebhookEndpointSecret(ENDPOINT, { expire_previous_now: true });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({ expire_previous_now: true });
    await client.rotateWebhookEndpointSecret(ENDPOINT);
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({ expire_previous_now: false });
    await client.sendWebhookTestEvent(ENDPOINT, 'resource.created');
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({ event_type: 'resource.created' });
    await client.recoverWebhookDeliveries(ENDPOINT, new Date('2026-11-10T00:00:00Z'));
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({ since: '2026-11-10T00:00:00.000Z' });
    await client.redeliverWebhookEvent(EVENT);
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({});
    await client.redeliverWebhookEvent(EVENT, { endpoint_id: ENDPOINT });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({ endpoint_id: ENDPOINT });
  });

  it('ids are encoded in the path', async () => {
    const fetchMock = setupMockFetch(EVENT_DETAIL);
    await createClient().getWebhookEvent('evt/../x');
    expect(lastCall(fetchMock).url).toBe(`${ROOT}/events/evt%2F..%2Fx/`);
  });

  it('a delivery whose event aged out has a null event', async () => {
    setupMockFetch({ ...DELIVERIES, results: [{ ...DELIVERIES.results[0], event: null }] });
    const page = await createClient().listWebhookEndpointDeliveries(ENDPOINT);
    expect(page.results[0].event).toBeNull();
  });

  describe('errors', () => {
    const cases: [number, string, unknown, new (...args: any[]) => Error][] = [
      [404, 'webhook_endpoint_not_found', undefined, WebhookEndpointNotFoundError],
      [404, 'webhook_event_not_found', undefined, WebhookEventNotFoundError],
      [409, 'limit_exceeded', undefined, WebhookEndpointLimitExceededError],
      [409, 'endpoint_not_active', { reason: 'paused' }, WebhookEndpointNotActiveError],
      [409, 'endpoint_not_subscribed', undefined, WebhookEndpointNotSubscribedError],
    ];

    it.each(cases)('%s %s is typed', async (status, code, detail, errorClass) => {
      setupMockFetch({ message: 'refused', error_code: code, detail }, status);
      const error = await createClient()
        .getWebhookEndpoint(ENDPOINT)
        .catch((e) => e);
      expect(error).toBeInstanceOf(errorClass);
      expect(error).toBeInstanceOf(FoxnoseAPIError);
      expect(error.statusCode).toBe(status);
      expect(error.errorCode).toBe(code);
    });

    it('not-active and not-subscribed keep their detail', async () => {
      const skipped = [{ endpoint_id: ENDPOINT, reason: 'paused' }];
      setupMockFetch(
        { message: 'm', error_code: 'endpoint_not_active', detail: { reason: 'deleted' } },
        409,
      );
      const notActive = await createClient()
        .recoverWebhookDeliveries(ENDPOINT, '2026-11-10T00:00:00Z')
        .catch((e) => e);
      expect(notActive.reason).toBe('deleted');
      expect(notActive.skipped).toEqual([]);
      setupMockFetch(
        { message: 'm', error_code: 'endpoint_not_subscribed', detail: { skipped } },
        409,
      );
      const notSubscribed = await createClient()
        .redeliverWebhookEvent(EVENT)
        .catch((e) => e);
      expect(notSubscribed.skipped).toEqual(skipped);
    });

    it.each([undefined, 'text', ['x'], { skipped: 'x' }])(
      'a malformed detail %j does not break the mapping',
      async (detail) => {
        setupMockFetch({ message: 'm', error_code: 'endpoint_not_active', detail }, 409);
        const error = await createClient()
          .redeliverWebhookEvent(EVENT)
          .catch((e) => e);
        expect(error).toBeInstanceOf(WebhookEndpointNotActiveError);
        expect(error.skipped).toEqual([]);
      },
    );

    it('a rejected body stays an API error with its code and detail', async () => {
      setupMockFetch(
        {
          message: 'The URL is not allowed',
          error_code: 'invalid_url',
          detail: { field: 'url', reason: 'scheme' },
        },
        400,
      );
      const error = await createClient()
        .createWebhookEndpoint({ url: 'http://x', event_types: ['a'] })
        .catch((e) => e);
      expect(error.constructor).toBe(FoxnoseAPIError);
      expect(error.errorCode).toBe('invalid_url');
      expect(error.detail).toEqual({ field: 'url', reason: 'scheme' });
    });
  });

  describe('writes are not repeated', () => {
    const writes: [string, (c: Client) => Promise<unknown>][] = [
      [
        'create',
        (c) => c.createWebhookEndpoint({ url: 'https://x.example.com', event_types: ['a'] }),
      ],
      ['rotate', (c) => c.rotateWebhookEndpointSecret(ENDPOINT)],
      ['test', (c) => c.sendWebhookTestEvent(ENDPOINT, 'resource.created')],
      ['recover', (c) => c.recoverWebhookDeliveries(ENDPOINT, '2026-11-10T00:00:00Z')],
      ['redeliver', (c) => c.redeliverWebhookEvent(EVENT)],
    ];

    it.each(writes)('%s makes one attempt after a lost connection', async (_name, call) => {
      const fetchMock = vi.fn(async () => {
        throw new TypeError('fetch failed');
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      await expect(call(createClient(['GET', 'POST']))).rejects.toBeInstanceOf(
        FoxnoseTransportError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('secrets', () => {
    async function responses() {
      setupMockFetch({ ...ENDPOINT_BODY, secret: SECRET }, 201);
      const created = await createClient().createWebhookEndpoint({
        url: 'https://x.example.com',
        event_types: ['a'],
      });
      setupMockFetch({ secret: SECRET });
      const revealed = await createClient().getWebhookEndpointSecret(ENDPOINT);
      setupMockFetch({ secret: NEW_SECRET, previous_secret_expires_at: null });
      const rotated = await createClient().rotateWebhookEndpointSecret(ENDPOINT);
      return { created, revealed, rotated };
    }

    it('is readable directly', async () => {
      const { created, revealed, rotated } = await responses();
      expect(created.secret).toBe(SECRET);
      expect(revealed.secret).toBe(SECRET);
      expect(rotated.secret).toBe(NEW_SECRET);
      expect(rotated.previous_secret_expires_at).toBeNull();
    });

    it('stays out of JSON, inspect, String and a spread', async () => {
      const { created, revealed, rotated } = await responses();
      for (const response of [created, revealed, rotated]) {
        const texts = [
          JSON.stringify(response),
          inspect(response, { depth: 5, showHidden: false }),
          String(response),
          JSON.stringify({ ...response }),
          Object.keys(response).join(),
        ];
        for (const text of texts) {
          expect(text).not.toContain(SECRET);
          expect(text).not.toContain(NEW_SECRET);
        }
      }
    });

    it('reaches no console output', async () => {
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
        vi.spyOn(console, level).mockImplementation(() => undefined),
      );
      const { created, revealed, rotated } = await responses();
      // eslint-disable-next-line no-console
      console.log(created, revealed, rotated);
      for (const spy of spies) {
        expect(JSON.stringify(spy.mock.calls)).not.toContain(SECRET);
      }
    });

    it('a response without a secret is left as it is', async () => {
      setupMockFetch({ secret: null });
      const revealed = await createClient().getWebhookEndpointSecret(ENDPOINT);
      expect(revealed.secret).toBeNull();
    });
  });
});
