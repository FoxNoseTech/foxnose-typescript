/**
 * FoxNose Files on the Management client.
 *
 * The payloads mirror core's files/serializers_pipeline.py, files/views_links.py,
 * files/views_management.py and files/pipeline/intents.py.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthStrategy, RequestData } from '../../src/auth/types.js';
import {
  FilesQuotaExceededError,
  FilesQuotaUnavailableError,
  FoxnoseAPIError,
  FoxnoseTransportError,
} from '../../src/errors.js';
import { ManagementClient } from '../../src/management/client.js';
import { parseFindingEvidence } from '../../src/management/models.js';
import type {
  FileDownload,
  FilePageDetail,
  FileRecordView,
  FileReviewQueue,
  FilesPolicy,
  FileTombstoneList,
  MyPermissions,
  ResourceSummary,
  RevisionSummary,
  UploadLink,
  UploadLinkCreated,
  UploadLinkList,
} from '../../src/management/models.js';

const dummyAuth: AuthStrategy = {
  buildHeaders(_request: RequestData) {
    return { Authorization: 'Bearer test-token' };
  },
};

const ENV = 'env-123';
const COLLECTION = 'attachments';
const RECORD = '9d2hX6qPZmL0';
const UPLOAD_ID = 'up_eu1_3f9a0c2e7b';
const ROOT = `https://api.test.com/v1/${ENV}`;
const BASE = `${ROOT}/collections/${COLLECTION}`;
const FILE = `${BASE}/files/${RECORD}`;

const LINK_CREATED: UploadLinkCreated = {
  upload_id: UPLOAD_ID,
  title: 'Upload your documents',
  instructions: 'Add the signed contract.',
  upload_url: 'https://7c9h4pwu.upload.fxns.io/u#eu1.link-token',
  expires_at: '2026-10-30T12:30:00+00:00',
  max_files: 3,
  allowed_kinds: ['document', 'image'],
};

const LINK: UploadLink = {
  upload_id: UPLOAD_ID,
  created_by: { kind: 'api_key', label: 'backend', key: 'key-uid' },
  owner_key: 'tk_8f2c91',
  title: 'Upload your documents',
  instructions: null,
  max_files: 3,
  allowed_kinds: ['document', 'image'],
  consumed_count: 1,
  created_at: '2026-10-30T12:00:00+00:00',
  expires_at: '2026-10-30T12:30:00+00:00',
  revoked_at: null,
  state: 'active',
  sessions: [
    {
      created_at: '2026-10-30T12:01:00+00:00',
      expires_at: '2026-10-30T12:41:00+00:00',
      files: [
        {
          state: 'ready',
          record_key: RECORD,
          progress: { step: 4, of: 4, step_name: null },
          file_name: 'contract.pdf',
        },
      ],
    },
  ],
};

const LINKS: UploadLinkList = { count: 1, next: null, previous: null, results: [LINK] };

const VIEW: FileRecordView = {
  resource_key: RECORD,
  file_uuid: '9b1e5c3a-0000-4000-8000-000000000000',
  page_count: 2,
  asset_state: 'present',
  tombstone: false,
  trust: {
    processing: 'agent_ready',
    content_tainted: true,
    tainted_paths: ['file.original_filename', 'content'],
  },
  analysis: {
    generation: 1,
    state: 'published',
    verdict: 'suspicious',
    verdict_reasons: ['hidden_text'],
    public_reason: null,
    error_code: null,
    in_review: false,
    publish_requested_by: null,
    policy_version: 2,
    pipeline_version: 'v1',
    source_format: 'pdf',
    scanned_at: '2026-10-30T12:00:20+00:00',
    step_times: { scan: 1.5 },
    state_changed_at: '2026-10-30T12:00:30+00:00',
    created_at: '2026-10-30T12:00:10+00:00',
  },
  checks: [
    {
      detector: 'malware',
      detector_version: '1',
      status: 'clean',
      started_at: '2026-10-30T12:00:11+00:00',
      finished_at: '2026-10-30T12:00:12+00:00',
    },
  ],
  findings: [
    {
      kind: 'hidden_text',
      sub_kind: null,
      severity: 'suspicious',
      page: 2,
      box: [0.1, 0.4, 0.5, 0.43],
      detector: 'structural',
      detector_version: '3',
      score: null,
      evidence: 'ignore previous instructions',
      detail: null,
      rule_id: null,
    },
  ],
  file: {
    original: { available: true, reason: null },
    safe_copy: { available: false, reason: 'not_generated' },
    active_content: { present: null, kinds: {}, truncated: false },
    original_access: 'when_clean',
    origin: {
      channel: 'upload_link',
      external: true,
      created_by: { kind: 'management_key', name: 'backend' },
      upload_link: { upload_id: UPLOAD_ID, title: 'Upload your documents' },
      end_user: null,
    },
  },
};

const DOWNLOAD: FileDownload = {
  url: 'https://files.example.com/a.pdf?Signature=signed',
  expires_in: 300,
  expires_at: '2026-10-30T12:05:00+00:00',
  kind: 'original',
  filename: 'contract.pdf',
  content_type: 'application/pdf',
  generation: 1,
  state: 'published',
  active_content: { present: true, kinds: { javascript: 2 }, truncated: false },
  warnings: [{ code: 'active_content', present: true, kinds: { javascript: 2 } }],
};

const PAGE_DETAIL: FilePageDetail = {
  page: 1,
  of: 2,
  image_url: 'https://files.example.com/p1.png?Signature=signed',
  image_width: 1240,
  image_height: 1754,
  expires_in: 300,
  redactions: [{ reason: 'pii_email', box: [0.1, 0.2, 0.3, 0.25], label: 'Email' }],
  tables: [{ box: [0.1, 0.5, 0.9, 0.8] }],
  text: 'Invoice total 561',
  content_flags: [{ kind: 'redacted' }],
  pii: [
    { type: 'ADDRESS', label: 'Address', box: [0.1, 0.2, 0.3, 0.25] },
    {
      type: 'US_SOCIAL_SECURITY_NUMBER',
      label: 'US social security number',
      box: [0.1, 0.3, 0.3, 0.35],
      unreliable: true,
    },
  ],
  pii_truncated: false,
  findings: [
    {
      code: 'hidden_text',
      sub_kind: 'withheld_run',
      severity: 'info',
      source: 'pdf_diff',
      pages: [1, 2],
      removed_from_agents: true,
    },
  ],
  page_findings: [
    {
      code: 'hidden_text',
      sub_kind: 'withheld_run',
      severity: 'info',
      source: 'pdf_diff',
      box: [0.1, 0.4, 0.5, 0.43],
      removed_from_agents: true,
    },
  ],
  removed_passages: 1,
  trust: {
    processing: 'agent_ready',
    content_tainted: true,
    tainted_paths: ['file.original_filename', 'content'],
  },
  verdict: 'clean',
  reasons: [],
  generation: 1,
  state: 'published',
};

const TOMBSTONES: FileTombstoneList = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      resource_key: RECORD,
      file_uuid: '9b1e5c3a-0000-4000-8000-000000000000',
      reason: 'rejected',
      public_reason: 'prohibited_content',
      error_code: 'rejected_by_reviewer',
      verdict_reasons: ['policy_rule'],
      generation: 1,
      asset_state: 'present',
      blocked_at: '2026-10-30T12:10:00+00:00',
      purge_completed_at: null,
      redacts_at: '2026-11-30T12:10:00+00:00',
      redacted: true,
      original_filename: null,
      raw_payload: null,
      uploaded_by: null,
      owner_key: null,
      findings: [],
    },
  ],
};

const QUEUE: FileReviewQueue = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      resource_key: RECORD,
      file_uuid: '9b1e5c3a-0000-4000-8000-000000000000',
      collection: COLLECTION,
      file_name: 'contract.pdf',
      generation: 1,
      state: 'awaiting_publish',
      verdict: 'suspicious',
      verdict_reasons: ['hidden_text'],
      public_reason: null,
      findings: { total: 1, by_kind: { hidden_text: 1 }, by_severity: { suspicious: 1 } },
      owner: { key: 'tk_8f2c91', title: 'Ticket' },
      held_at: '2026-10-30T12:00:30+00:00',
      thumbnail_url: 'https://files.example.com/t.png?Signature=signed',
    },
  ],
};

const POLICY: FilesPolicy = {
  version: 3,
  enforce_from: '2026-10-30T12:00:00Z',
  body: {
    suspicious_action: 'quarantine',
    overrides: { hidden_text: 'block' },
    allowed_kinds: ['document', 'image'],
    tables: 'auto',
    moderation_rules: [],
    original_access: 'when_clean',
  },
  config_hash: 'abc123',
  created_at: '2026-10-30T12:00:00+00:00',
};

const MY_PERMISSIONS: MyPermissions = {
  subject: 'api_key',
  organization_owner: false,
  organization_admin: false,
  project_admin: false,
  environment_full_access: false,
  environment: { protection_level: 'none', is_enabled: true },
  content_types: {
    resources: { actions: ['create', 'read'], objects: null },
    'collection-items': { actions: ['read'], objects: ['attachments'] },
    organization: { actions: [], objects: null },
  },
};

function setupMockFetch(response: any = {}, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(response), { status }));
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

type Client = ManagementClient;

const CALLS: [string, (c: Client) => Promise<unknown>, string, string, number, unknown][] = [
  [
    'getMyPermissions',
    (c) => c.getMyPermissions(),
    'GET',
    `${ROOT}/permissions/me/`,
    200,
    MY_PERMISSIONS,
  ],
  [
    'listUploadLinks',
    (c) => c.listUploadLinks(COLLECTION, { limit: 10, offset: 20 }),
    'GET',
    `${BASE}/upload-links/?limit=10&offset=20`,
    200,
    LINKS,
  ],
  [
    'getUploadLink',
    (c) => c.getUploadLink(COLLECTION, UPLOAD_ID),
    'GET',
    `${BASE}/upload-links/${UPLOAD_ID}/`,
    200,
    LINK,
  ],
  [
    'revokeUploadLink',
    (c) => c.revokeUploadLink(COLLECTION, UPLOAD_ID),
    'POST',
    `${BASE}/upload-links/${UPLOAD_ID}/revoke/`,
    200,
    { ...LINK, state: 'revoked' },
  ],
  [
    'getFileAnalysis',
    (c) => c.getFileAnalysis(COLLECTION, RECORD),
    'GET',
    `${FILE}/analysis/`,
    200,
    VIEW,
  ],
  [
    'approveFile',
    (c) => c.approveFile(COLLECTION, RECORD),
    'POST',
    `${FILE}/approve/`,
    200,
    { ...VIEW, outcome: 'published', reason: null },
  ],
  ['rejectFile', (c) => c.rejectFile(COLLECTION, RECORD), 'POST', `${FILE}/reject/`, 200, VIEW],
  [
    'reanalyzeFile',
    (c) => c.reanalyzeFile(COLLECTION, RECORD),
    'POST',
    `${FILE}/reanalyze/`,
    202,
    VIEW,
  ],
  [
    'getFileOriginal',
    (c) => c.getFileOriginal(COLLECTION, RECORD),
    'GET',
    `${FILE}/file/original/`,
    200,
    DOWNLOAD,
  ],
  [
    'getFileSafeCopy',
    (c) => c.getFileSafeCopy(COLLECTION, RECORD),
    'GET',
    `${FILE}/file/safe-copy/`,
    200,
    { ...DOWNLOAD, kind: 'safe_copy' },
  ],
  [
    'getFilePage',
    (c) => c.getFilePage(COLLECTION, RECORD, 2),
    'GET',
    `${FILE}/file/pages/2/`,
    200,
    { ...DOWNLOAD, kind: 'page' },
  ],
  [
    'getFilePageDetail',
    (c) => c.getFilePageDetail(COLLECTION, RECORD, 1),
    'GET',
    `${FILE}/file/pages/1/detail/`,
    200,
    PAGE_DETAIL,
  ],
  [
    'listFileTombstones',
    (c) => c.listFileTombstones(COLLECTION, { limit: 5 }),
    'GET',
    `${BASE}/files/tombstones/?limit=5`,
    200,
    TOMBSTONES,
  ],
  [
    'getFilesPolicy',
    (c) => c.getFilesPolicy(COLLECTION),
    'GET',
    `${BASE}/files-policy/`,
    200,
    POLICY,
  ],
  [
    'listFileReviewQueue',
    (c) => c.listFileReviewQueue(),
    'GET',
    `${ROOT}/files/review/`,
    200,
    QUEUE,
  ],
];

describe('ManagementClient — Files', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it.each(CALLS)('%s', async (_name, call, method, url, status, payload) => {
    const fetchMock = setupMockFetch(payload, status);
    const result = await call(createClient());
    expect(result).toEqual(payload);
    expect(lastCall(fetchMock)).toMatchObject({ url, method });
  });

  describe('parseFindingEvidence', () => {
    const withheld = {
      page: 2,
      box: [0.1, 0.4, 0.5, 0.43],
      tokens: 4,
      text: 'first line second line',
      reason: 'withheld_run',
      parts: [
        { box: [0.1, 0.4, 0.5, 0.41], text: 'first line' },
        { box: [0.1, 0.42, 0.5, 0.43], text: 'second line' },
      ],
    };

    it.each(['hidden_text', 'low_legibility_text'])('reads the zones of %s', (kind) => {
      const evidence = parseFindingEvidence({ kind, evidence: JSON.stringify(withheld) });
      expect(evidence?.parts.map((part) => part.text)).toEqual(['first line', 'second line']);
      expect(evidence?.reason).toBe('withheld_run');
    });

    it('gives an old-form clip an empty parts', () => {
      const clip: Record<string, unknown> = { ...withheld, truncated: true };
      delete clip.parts;
      const evidence = parseFindingEvidence({
        kind: 'hidden_text',
        evidence: JSON.stringify(clip),
      });
      expect(evidence?.parts).toEqual([]);
      expect(evidence?.truncated).toBe(true);
      expect(evidence?.text).toBe('first line second line');
    });

    it.each([[null], [''], ['a plain sentence'], ['[1, 2]'], ['3'], ['{"parts": "broken"}']])(
      'is null for evidence %j',
      (evidence) => {
        expect(parseFindingEvidence({ kind: 'hidden_text', evidence })).toBeNull();
      },
    );

    it('is null for another kind', () => {
      expect(
        parseFindingEvidence({ kind: 'moderation', evidence: JSON.stringify(withheld) }),
      ).toBeNull();
    });
  });

  it('types a revision whose schema version is gone', () => {
    const revision: RevisionSummary = {
      key: 'rev-1',
      resource: RECORD,
      schema_version: null,
      schema_version_number: null,
      number: 1,
      size: 10,
      created_at: '2026-10-30T12:00:00Z',
      status: 'published',
      is_valid: true,
      published_at: null,
      unpublished_at: null,
    };
    expect(revision.schema_version).toBeNull();
  });

  it('createUploadLink sends only what was given', async () => {
    const fetchMock = setupMockFetch(LINK_CREATED, 201);
    const client = createClient();

    const created = await client.createUploadLink(COLLECTION, {
      owner: 'tk_8f2c91',
      title: 'Upload your documents',
    });

    expect(created.upload_url).toContain('#eu1.link-token');
    expect(lastCall(fetchMock)).toMatchObject({ url: `${BASE}/upload-links/`, method: 'POST' });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({
      owner: 'tk_8f2c91',
      title: 'Upload your documents',
    });

    await client.createUploadLink(COLLECTION, {
      owner: 'tk_8f2c91',
      title: 'Upload your documents',
      instructions: 'Add the signed contract.',
      max_files: 3,
      allowed_kinds: ['document', 'image'],
      expires_in: 3600,
    });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual({
      owner: 'tk_8f2c91',
      title: 'Upload your documents',
      instructions: 'Add the signed contract.',
      max_files: 3,
      allowed_kinds: ['document', 'image'],
      expires_in: 3600,
    });
  });

  it('createUploadLink takes the owner record', async () => {
    const fetchMock = setupMockFetch(LINK_CREATED, 201);
    const owner: ResourceSummary = {
      key: 'tk_8f2c91',
      folder: 'tickets',
      content_type: 'document',
      created_at: '2026-10-30T12:00:00Z',
      vectors_size: 0,
    };
    await createClient().createUploadLink(COLLECTION, { owner, title: 'T' });
    expect(JSON.parse(lastCall(fetchMock).body!).owner).toBe('tk_8f2c91');
  });

  it('createUploadLink refuses a missing owner', async () => {
    setupMockFetch(LINK_CREATED, 201);
    await expect(
      // @ts-expect-error owner is required
      createClient().createUploadLink(COLLECTION, { title: 'T' }),
    ).rejects.toThrow(TypeError);
  });

  it('keeps an upload id in one path segment', async () => {
    const fetchMock = setupMockFetch(LINK);
    await createClient().getUploadLink(COLLECTION, 'up/../x?y');
    expect(lastCall(fetchMock).url).toBe(`${BASE}/upload-links/up%2F..%2Fx%3Fy/`);
  });

  it('accepts collection and record objects', async () => {
    const fetchMock = setupMockFetch(VIEW);
    await createClient().getFileAnalysis(
      { key: COLLECTION } as any,
      { key: RECORD } as ResourceSummary,
    );
    expect(lastCall(fetchMock).url).toBe(`${FILE}/analysis/`);
  });

  it('updateFilesPolicy sends the body as given', async () => {
    const fetchMock = setupMockFetch(POLICY);
    const body = { suspicious_action: 'quarantine', original_access: 'when_clean' } as const;

    const policy = await createClient().updateFilesPolicy(COLLECTION, body);

    expect(policy.version).toBe(3);
    expect(lastCall(fetchMock)).toMatchObject({ url: `${BASE}/files-policy/`, method: 'PUT' });
    expect(JSON.parse(lastCall(fetchMock).body!)).toEqual(body);
  });

  it('listFileReviewQueue joins the filter to the paging params', async () => {
    const fetchMock = setupMockFetch(QUEUE);
    await createClient().listFileReviewQueue({ collection: COLLECTION, params: { limit: 100 } });
    expect(lastCall(fetchMock).url).toBe(
      `${ROOT}/files/review/?limit=100&collection=${COLLECTION}`,
    );
  });

  it('a refused download says why', async () => {
    setupMockFetch(
      {
        message: 'This file cannot be downloaded now',
        error_code: 'original_withheld',
        detail: { reason: 'original_withheld', safe_copy: { available: true, reason: null } },
      },
      409,
    );

    const error = await createClient()
      .getFileOriginal(COLLECTION, RECORD)
      .catch((e) => e);

    expect(error).toBeInstanceOf(FoxnoseAPIError);
    expect(error.statusCode).toBe(409);
    expect(error.errorCode).toBe('original_withheld');
    expect(error.detail.safe_copy.available).toBe(true);
  });

  it('a link refusal carries its code', async () => {
    setupMockFetch({ code: 'owner_required', error_code: 'owner_required' }, 422);
    const error = await createClient()
      .createUploadLink(COLLECTION, { owner: 'x', title: 'T' })
      .catch((e) => e);
    expect(error.errorCode).toBe('owner_required');
  });

  it('a missing link is a 404', async () => {
    setupMockFetch({ code: 'not_found' }, 404);
    const error = await createClient()
      .getUploadLink(COLLECTION, UPLOAD_ID)
      .catch((e) => e);
    expect(error.statusCode).toBe(404);
    expect(error.responseBody).toEqual({ code: 'not_found' });
    expect(error.errorCode).toBe('not_found');
  });

  it('a refused re-analysis keeps the quota body', async () => {
    setupMockFetch(
      {
        error_code: 'files_quota_exceeded',
        axis: 'file_units',
        reason: 'plan_exhausted',
        used_units: 100,
        included_units: 100,
        cap_usd: null,
        window_resets_at: '2026-11-30T00:00:00+00:00',
        upgrade_url: 'https://app.foxnose.net/upgrade',
      },
      402,
    );
    const error = await createClient()
      .reanalyzeFile(COLLECTION, RECORD)
      .catch((e) => e);
    expect(error).toBeInstanceOf(FilesQuotaExceededError);
    expect(error).toBeInstanceOf(FoxnoseAPIError);
    expect(error.errorCode).toBe('files_quota_exceeded');
    expect(error.message).toContain('File processing quota reached');
    expect(error.axis).toBe('file_units');
    expect(error.reason).toBe('plan_exhausted');
    expect(error.usedUnits).toBe(100);
    expect(error.includedUnits).toBe(100);
    expect(error.capUsd).toBeNull();
    expect(error.windowResetsAt).toBe('2026-11-30T00:00:00+00:00');
    expect(error.upgradeUrl).toBe('https://app.foxnose.net/upgrade');
    expect(error.raiseCapUrl).toBeUndefined();
  });

  it('an unreadable quota is a typed retryable error', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error_code: 'files_quota_unavailable' }), {
          status: 503,
          headers: { 'Retry-After': '5' },
        }),
    );
    const error = await createClient()
      .reanalyzeFile(COLLECTION, RECORD)
      .catch((e) => e);
    expect(error).toBeInstanceOf(FilesQuotaUnavailableError);
    expect(error).toBeInstanceOf(FoxnoseAPIError);
    expect(error.retryAfter).toBe(5);
    expect(error.message).toContain('File processing quota is unavailable');
  });

  it('upload links filter by state', async () => {
    const fetchMock = setupMockFetch(LINKS);
    await createClient().listUploadLinks(COLLECTION, { state: 'active' });
    expect(lastCall(fetchMock).url).toBe(`${BASE}/upload-links/?state=active`);
  });

  it('a spend cap refusal names the cap', async () => {
    setupMockFetch(
      {
        error_code: 'files_quota_exceeded',
        reason: 'spend_cap_reached',
        cap_usd: 25,
        included_units: null,
        raise_cap_url: 'https://app.foxnose.net/cap',
      },
      402,
    );
    const error = await createClient()
      .reanalyzeFile(COLLECTION, RECORD)
      .catch((e) => e);
    expect(error.capUsd).toBe(25);
    expect(error.includedUnits).toBeNull();
    expect(error.raiseCapUrl).toBe('https://app.foxnose.net/cap');
  });

  it.each<[string, (c: Client) => Promise<unknown>]>([
    ['createUploadLink', (c) => c.createUploadLink(COLLECTION, { owner: 'x', title: 'T' })],
    ['approveFile', (c) => c.approveFile(COLLECTION, RECORD)],
    ['reanalyzeFile', (c) => c.reanalyzeFile(COLLECTION, RECORD)],
  ])('%s is not resent after a dropped connection', async (_name, call) => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('connection dropped');
    });
    globalThis.fetch = fetchMock;
    await expect(call(createClient(['POST']))).rejects.toThrow(FoxnoseTransportError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('PATCH writes only the given fields', async () => {
    const fetchMock = setupMockFetch({ key: 'x' });
    const client = createClient();

    await client.patchOrganization('org-1', { name: 'New' });
    expect(lastCall(fetchMock)).toMatchObject({
      url: 'https://api.test.com/organizations/org-1/',
      method: 'PATCH',
      body: '{"name":"New"}',
    });

    await client.patchCollection(COLLECTION, { parent: null });
    expect(lastCall(fetchMock)).toMatchObject({
      url: `${ROOT}/collections/tree/collection/?key=${COLLECTION}`,
      method: 'PATCH',
      body: '{"parent":null}',
    });

    await client.patchComponent('cmp-1', { name: 'Part' });
    expect(lastCall(fetchMock)).toMatchObject({
      url: `${ROOT}/components/cmp-1/`,
      method: 'PATCH',
      body: '{"name":"Part"}',
    });
  });
});
