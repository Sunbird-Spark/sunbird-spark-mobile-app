import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryBatchEnqueuer } from './TelemetryBatchEnqueuer';
import { telemetryDbService } from '../db/TelemetryDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { deviceService } from '../device/deviceService';
import { gzipCompressAsync } from './compression';
import { syncConfig } from './SyncConfig';
import { NetworkQueueType } from './types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../db/TelemetryDbService', () => ({
  telemetryDbService: {
    getPending:        vi.fn(),
    getPendingCount:   vi.fn(),
    deleteByIds:       vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    insert: vi.fn().mockResolvedValue('msg-uuid'),
  },
}));

vi.mock('../device/deviceService', () => ({
  deviceService: {
    getHashedDeviceId: vi.fn().mockResolvedValue('sha1-device-id'),
  },
}));

vi.mock('./compression', () => ({
  gzipCompressAsync: vi.fn().mockResolvedValue('H4sIAAAAAAAAA0rNK0ktLgUAAAD//w=='),
}));

vi.mock('./SyncConfig', () => ({
  syncConfig: {
    getSyncBatchSize:  vi.fn().mockReturnValue(100),
    getSyncThreshold:  vi.fn().mockReturnValue(200),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    event_id:   `evt-${i}`,
    event:      JSON.stringify({ eid: 'IMPRESSION', index: i }),
    event_type: 'IMPRESSION',
    timestamp:  Date.now(),
    priority:   1,
    synced:     0,
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TelemetryBatchEnqueuer', () => {
  let enqueuer: TelemetryBatchEnqueuer;

  beforeEach(() => {
    vi.clearAllMocks();
    enqueuer = new TelemetryBatchEnqueuer();
    // Reset all mocks to their defaults so each test starts clean
    vi.mocked(networkQueueDbService.insert).mockResolvedValue('msg-uuid');
    vi.mocked(telemetryDbService.deleteByIds).mockResolvedValue(undefined);
    vi.mocked(gzipCompressAsync).mockResolvedValue('H4sIAAAAAAAAA0rNK0ktLgUAAAD//w==');
    vi.mocked(deviceService.getHashedDeviceId).mockResolvedValue('sha1-device-id');
  });

  // ── Scenario 1: Normal batch ────────────────────────────────────────────

  it('normal batch — 50 events → inserts one row with item_count=50, type=telemetry, priority=2', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(50));

    const count = await enqueuer.processBatch();

    expect(count).toBe(50);
    expect(networkQueueDbService.insert).toHaveBeenCalledOnce();
    const insertArg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    expect(insertArg.type).toBe(NetworkQueueType.TELEMETRY);
    expect(insertArg.priority).toBe(2);
    expect(insertArg.item_count).toBe(50);
  });

  // ── Scenario 2: Batch size cap ──────────────────────────────────────────

  it('batch size cap — getPending called with 100; 250 pending rows → only 100 returned and batched', async () => {
    // Simulates DB returning only 100 rows (the cap), not 250
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(100));

    const count = await enqueuer.processBatch();

    expect(vi.mocked(telemetryDbService.getPending)).toHaveBeenCalledWith(100);
    expect(count).toBe(100);
    expect(networkQueueDbService.insert).toHaveBeenCalledOnce();
  });

  // ── Scenario 3: Empty telemetry table ──────────────────────────────────

  it('empty table — returns 0, no network_queue insert', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue([]);

    const count = await enqueuer.processBatch();

    expect(count).toBe(0);
    expect(networkQueueDbService.insert).not.toHaveBeenCalled();
  });

  // ── Scenario 4: Malformed JSON rows ────────────────────────────────────

  it('malformed JSON — corrupt row skipped, valid rows continue and are batched', async () => {
    const rows = makeRows(3);
    rows[1].event = '{ CORRUPT JSON :::'; // row index 1 is malformed

    vi.mocked(telemetryDbService.getPending).mockResolvedValue(rows);

    const count = await enqueuer.processBatch();

    // 2 valid events (rows 0 and 2), 1 skipped
    expect(count).toBe(2);
    const insertArg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    expect(insertArg.item_count).toBe(2);
  });

  it('all rows malformed — returns 0, no network_queue insert', async () => {
    const rows = makeRows(2);
    rows[0].event = 'bad';
    rows[1].event = 'bad';
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(rows);

    const count = await enqueuer.processBatch();

    expect(count).toBe(0);
    expect(networkQueueDbService.insert).not.toHaveBeenCalled();
  });

  // ── Scenario 5: Compression success ────────────────────────────────────

  it('compression success — data stored in network_queue starts with H4sI', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(100));
    vi.mocked(gzipCompressAsync).mockResolvedValue('H4sIAAAAAAAAA0rNK0ktLgUAAAD//w==');

    await enqueuer.processBatch();

    const insertArg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    expect(insertArg.data).toMatch(/^H4sI/);
  });

  // ── Scenario 6: Compression worker failure → JSON fallback ──────────────

  it('compression worker failure — falls back to raw JSON, network_queue inserted, rows deleted', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(10));
    vi.mocked(gzipCompressAsync).mockRejectedValue(new Error('Worker crashed'));

    const count = await enqueuer.processBatch();

    // Batch still succeeds via JSON fallback
    expect(count).toBe(10);
    expect(networkQueueDbService.insert).toHaveBeenCalledOnce();

    // JSON fallback: data must start with '{', not 'H4sI'
    const insertArg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    expect(insertArg.data).toMatch(/^\{/);
    expect(insertArg.data).not.toMatch(/^H4sI/);

    // Source rows deleted — JSON fallback is still a durable queue entry
    expect(telemetryDbService.deleteByIds).toHaveBeenCalledOnce();
  });

  // ── Scenario 7: Post-batch cleanup ─────────────────────────────────────

  it('post-batch cleanup — source telemetry rows deleted after successful enqueue', async () => {
    const rows = makeRows(5);
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(rows);

    await enqueuer.processBatch();

    expect(telemetryDbService.deleteByIds).toHaveBeenCalledOnce();
    expect(telemetryDbService.deleteByIds).toHaveBeenCalledWith(
      rows.map(r => r.event_id)
    );
  });

  it('post-batch cleanup — source rows NOT deleted when network_queue insert fails', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(5));
    vi.mocked(networkQueueDbService.insert).mockRejectedValue(new Error('DB full'));

    await expect(enqueuer.processBatch()).rejects.toThrow('DB full');

    expect(telemetryDbService.deleteByIds).not.toHaveBeenCalled();
  });

  // ── Scenario 8: Threshold check — below threshold ──────────────────────

  it('threshold check — 199 pending events → hasThresholdCrossed() returns false', async () => {
    vi.mocked(telemetryDbService.getPendingCount).mockResolvedValue(199);

    const crossed = await enqueuer.hasThresholdCrossed();

    expect(crossed).toBe(false);
  });

  // ── Scenario 9: Threshold crossed ──────────────────────────────────────

  it('threshold crossed — 200 pending events → hasThresholdCrossed() returns true', async () => {
    vi.mocked(telemetryDbService.getPendingCount).mockResolvedValue(200);

    const crossed = await enqueuer.hasThresholdCrossed();

    expect(crossed).toBe(true);
  });

  it('threshold crossed — 201 pending events → hasThresholdCrossed() returns true', async () => {
    vi.mocked(telemetryDbService.getPendingCount).mockResolvedValue(201);

    const crossed = await enqueuer.hasThresholdCrossed();

    expect(crossed).toBe(true);
  });

  // ── Scenario 10: Device ID in envelope ─────────────────────────────────

  it('device ID in envelope — params.did equals SHA1 hash from deviceService', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(1));
    vi.mocked(deviceService.getHashedDeviceId).mockResolvedValue('sha1-abc123');

    // Capture the JSON passed to gzipCompressAsync to inspect the envelope
    let capturedEnvelope: any;
    vi.mocked(gzipCompressAsync).mockImplementation(async (json: string) => {
      capturedEnvelope = JSON.parse(json);
      return 'H4sIAAAAAAAAA0rNK0ktLgUAAAD//w==';
    });

    await enqueuer.processBatch();

    expect(capturedEnvelope.params.did).toBe('sha1-abc123');
  });

  it('device ID fallback — getHashedDeviceId failure → params.did is empty string', async () => {
    vi.mocked(telemetryDbService.getPending).mockResolvedValue(makeRows(1));
    vi.mocked(deviceService.getHashedDeviceId).mockRejectedValue(new Error('no device'));

    let capturedEnvelope: any;
    vi.mocked(gzipCompressAsync).mockImplementation(async (json: string) => {
      capturedEnvelope = JSON.parse(json);
      return 'H4sIAAAAAAAAA0rNK0ktLgUAAAD//w==';
    });

    await enqueuer.processBatch();

    expect(capturedEnvelope.params.did).toBe('');
  });
});
