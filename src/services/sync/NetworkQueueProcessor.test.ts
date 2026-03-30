import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkQueueProcessor } from './NetworkQueueProcessor';
import { NetworkQueueType, QueueEntryStatus } from './types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRequest = vi.fn();

vi.mock('@capacitor/core', () => ({
  CapacitorHttp: { request: (...args: any[]) => mockRequest(...args) },
}));

vi.mock('../network/networkService', () => ({
  networkService: { isConnected: vi.fn() },
}));

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    getPending: vi.fn(),
    markProcessing: vi.fn().mockResolvedValue(undefined),
    markSuccess: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    markFailedAt: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./AuthHeadersBuilder', () => ({
  authHeadersBuilder: {
    build: vi.fn().mockResolvedValue({
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'gzip',
      Authorization: 'Bearer tok',
    }),
  },
}));

vi.mock('./SyncConfig', () => ({
  syncConfig: {
    getRequestConfig: vi.fn(),
  },
}));

import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { networkService } from '../network/networkService';
import { syncConfig } from './SyncConfig';

// ── Helpers ────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<any> = {}): any => ({
  msg_id: 'msg-1',
  type: NetworkQueueType.TELEMETRY,
  priority: 1,
  timestamp: Date.now(),
  // gzip base64 stub — starts with H4sI
  data: 'H4sIAAAAAAAAA6tWKkktLlGyUlIqS04sKU4tBgAAAP//AwBmYHKjEAAAAA==',
  item_count: 10,
  retry_count: 0,
  max_retries: 3,
  next_retry_at: 0,
  last_error: null,
  status: QueueEntryStatus.PENDING,
  ...overrides,
});

const GZIP_CONFIG = { url: 'https://api.example.com/telemetry', method: 'POST', isGzipped: true };
const JSON_CONFIG  = { url: 'https://api.example.com/course',   method: 'PATCH', isGzipped: false };

// ── Tests ──────────────────────────────────────────────────────────────────

describe('NetworkQueueProcessor', () => {
  let processor: NetworkQueueProcessor;

  beforeEach(() => {
    vi.resetAllMocks(); // clears once-queues AND implementations

    processor = new NetworkQueueProcessor();

    // Default: connected, 200 OK, gzip config, no pending rows
    (networkService.isConnected as any).mockReturnValue(true);
    mockRequest.mockResolvedValue({ status: 200, data: null });
    (syncConfig.getRequestConfig as any).mockReturnValue(GZIP_CONFIG);
    (networkQueueDbService.getPending as any).mockResolvedValue([]);
    (networkQueueDbService.markProcessing as any).mockResolvedValue(undefined);
    (networkQueueDbService.markSuccess as any).mockResolvedValue(undefined);
    (networkQueueDbService.markFailed as any).mockResolvedValue(undefined);
    (networkQueueDbService.markFailedAt as any).mockResolvedValue(undefined);
  });

  // ── Basic flow ────────────────────────────────────────────────────────────

  it('returns empty result when no pending entries', async () => {
    const result = await processor.execute();
    expect(result.telemetry.syncedBatchCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('stops processing immediately when network is down at loop start', async () => {
    (networkService.isConnected as any).mockReturnValue(false);
    (networkQueueDbService.getPending as any).mockResolvedValue([makeEntry()]);

    await processor.execute();

    expect(networkQueueDbService.markProcessing).not.toHaveBeenCalled();
  });

  it('marks entry as processing then success on happy path', async () => {
    (networkQueueDbService.getPending as any).mockResolvedValue([makeEntry()]);

    await processor.execute();

    expect(networkQueueDbService.markProcessing).toHaveBeenCalledWith('msg-1');
    expect(networkQueueDbService.markSuccess).toHaveBeenCalledWith('msg-1');
  });

  it('counts synced telemetry batch and events', async () => {
    (networkQueueDbService.getPending as any).mockResolvedValue([makeEntry({ item_count: 25 })]);

    const result = await processor.execute();

    expect(result.telemetry.syncedBatchCount).toBe(1);
    expect(result.telemetry.syncedEventCount).toBe(25);
  });

  it('counts synced course_progress', async () => {
    (syncConfig.getRequestConfig as any).mockReturnValue(JSON_CONFIG);
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ type: NetworkQueueType.COURSE_PROGRESS, data: '{"contents":[]}', item_count: 3 }),
    ]);

    const result = await processor.execute();

    expect(result.courseProgress.syncedCount).toBe(3);
  });

  it('counts synced course_assesment', async () => {
    (syncConfig.getRequestConfig as any).mockReturnValue(JSON_CONFIG);
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ type: NetworkQueueType.COURSE_ASSESMENT, data: '{"assessments":[]}', item_count: 2 }),
    ]);

    const result = await processor.execute();

    expect(result.courseAssessment.syncedCount).toBe(2);
  });

  // ── Gzip vs JSON detection ─────────────────────────────────────────────

  it('sends gzip row via dataType:file when data starts with H4sI', async () => {
    (networkQueueDbService.getPending as any).mockResolvedValue([makeEntry()]);

    await processor.execute();

    const call = mockRequest.mock.calls[0][0];
    expect(call.dataType).toBe('file');
  });

  it('sends JSON fallback row without dataType and with Content-Type: application/json', async () => {
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ data: '{"ts":123,"events":[]}' }),
    ]);

    await processor.execute();

    const call = mockRequest.mock.calls[0][0];
    expect(call.dataType).toBeUndefined();
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(call.headers['Content-Encoding']).toBeUndefined();
  });

  it('sends non-gzip type as JSON when isGzipped=false', async () => {
    (syncConfig.getRequestConfig as any).mockReturnValue(JSON_CONFIG);
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ type: NetworkQueueType.COURSE_PROGRESS, data: '{"contents":[]}' }),
    ]);

    await processor.execute();

    const call = mockRequest.mock.calls[0][0];
    expect(call.dataType).toBeUndefined();
    expect(call.headers['Content-Type']).toBe('application/json');
  });

  it('passes typeFilter to networkQueueDbService.getPending', async () => {
    await processor.execute([NetworkQueueType.COURSE_PROGRESS]);
    expect(networkQueueDbService.getPending).toHaveBeenCalledWith(5, [NetworkQueueType.COURSE_PROGRESS]);
  });

  // ── Error handling ─────────────────────────────────────────────────────

  it('records error in result when HTTP returns 4xx', async () => {
    mockRequest.mockResolvedValue({ status: 400, data: 'Bad Request' });
    (networkQueueDbService.getPending as any).mockResolvedValue([makeEntry()]);

    const result = await processor.execute();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].status).toBe(400);
    expect(result.errors[0].msgId).toBe('msg-1');
  });

  it('marks DEAD_LETTER immediately on HTTP 413', async () => {
    mockRequest.mockResolvedValue({ status: 413, data: 'Too Large' });
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ retry_count: 0, max_retries: 3 }),
    ]);

    await processor.execute();

    expect(networkQueueDbService.markFailed).toHaveBeenCalledWith('msg-1', expect.any(String), 3, 3);
  });

  it('marks DEAD_LETTER when retry count exhausted', async () => {
    mockRequest.mockResolvedValue({ status: 500, data: 'Server Error' });
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ retry_count: 3, max_retries: 3 }),
    ]);

    await processor.execute();

    expect(networkQueueDbService.markFailed).toHaveBeenCalledWith('msg-1', expect.any(String), 3, 3);
  });

  it('retries immediately (nextRetryAt=0) on first 401', async () => {
    mockRequest.mockResolvedValue({ status: 401, data: 'Unauthorized' });
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ retry_count: 0, max_retries: 3 }),
    ]);

    await processor.execute();

    const [, , , nextRetryAt] = (networkQueueDbService.markFailedAt as any).mock.calls[0];
    expect(nextRetryAt).toBe(0);
  });

  it('applies 60s retry delay on second+ 401 (awaiting re-login)', async () => {
    const before = Date.now();
    mockRequest.mockResolvedValue({ status: 401, data: 'Unauthorized' });
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ retry_count: 1, max_retries: 3 }),
    ]);

    await processor.execute();

    const [, , , nextRetryAt] = (networkQueueDbService.markFailedAt as any).mock.calls[0];
    expect(nextRetryAt).toBeGreaterThanOrEqual(before + 60_000);
  });

  it('applies exponential backoff on 5xx errors', async () => {
    const before = Date.now();
    mockRequest.mockResolvedValue({ status: 500, data: 'Server Error' });
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ retry_count: 2, max_retries: 5 }),
    ]);

    await processor.execute();

    const [, , , nextRetryAt] = (networkQueueDbService.markFailedAt as any).mock.calls[0];
    // 2^2 * 1000 = 4000ms
    expect(nextRetryAt).toBeGreaterThanOrEqual(before + 4_000);
  });

  it('applies 10s retry delay on network error (status 0)', async () => {
    const before = Date.now();
    mockRequest.mockRejectedValue(Object.assign(new Error('Network'), { status: 0 }));
    (networkQueueDbService.getPending as any).mockResolvedValue([
      makeEntry({ retry_count: 0, max_retries: 3 }),
    ]);

    await processor.execute();

    const [, , , nextRetryAt] = (networkQueueDbService.markFailedAt as any).mock.calls[0];
    expect(nextRetryAt).toBeGreaterThanOrEqual(before + 10_000);
  });
});
