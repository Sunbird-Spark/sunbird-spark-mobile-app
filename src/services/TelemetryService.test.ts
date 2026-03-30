import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock @project-sunbird/telemetry-sdk ────────────────────────────────────
let mockIsInitialized = false;
const mockSdkInitialize = vi.fn();
const mockSdkImpression = vi.fn();
const mockSdkInteract = vi.fn();
const mockSdkStart = vi.fn().mockResolvedValue(undefined);
const mockSdkEnd = vi.fn();
const mockSdkError = vi.fn();
const mockSdkLog = vi.fn();
const mockSdkAudit = vi.fn();
const mockSdkShare = vi.fn();
const mockSdkFeedback = vi.fn();
const mockSdkInterrupt = vi.fn();
const mockSdkSummary = vi.fn();
const mockSdkResetActor = vi.fn();
const mockSdkResetTags = vi.fn();

vi.mock('@project-sunbird/telemetry-sdk', () => ({
  $t: {
    get isInitialized() { return mockIsInitialized; },
    initialize: (...args: any[]) => mockSdkInitialize(...args),
    impression: (...args: any[]) => mockSdkImpression(...args),
    interact: (...args: any[]) => mockSdkInteract(...args),
    start: (...args: any[]) => mockSdkStart(...args),
    end: (...args: any[]) => mockSdkEnd(...args),
    error: (...args: any[]) => mockSdkError(...args),
    log: (...args: any[]) => mockSdkLog(...args),
    audit: (...args: any[]) => mockSdkAudit(...args),
    share: (...args: any[]) => mockSdkShare(...args),
    feedback: (...args: any[]) => mockSdkFeedback(...args),
    interrupt: (...args: any[]) => mockSdkInterrupt(...args),
    summary: (...args: any[]) => mockSdkSummary(...args),
    resetActor: (...args: any[]) => mockSdkResetActor(...args),
    resetTags: (...args: any[]) => mockSdkResetTags(...args),
  },
}));

// ── Mock db services ───────────────────────────────────────────────────────
const mockDbInsert = vi.fn().mockResolvedValue(undefined);

vi.mock('./db/TelemetryDbService', () => ({
  telemetryDbService: {
    insert: (...args: any[]) => mockDbInsert(...args),
  },
}));

vi.mock('./db/DatabaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

import { TelemetryService } from './TelemetryService';

const baseCtx = {
  sid: 'sid-1',
  pdata: { id: 'sunbird.app', ver: '1.0.0', pid: 'sunbird.app' },
  channel: 'test-channel',
  did: 'device-123',
  uid: 'user-123',
  rollup: { l1: 'test-channel' },
  timeDiff: 3000,
  tags: ['test-channel'],
  platform: 'web',
};

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsInitialized = false;
    mockSdkStart.mockResolvedValue(undefined);
    mockDbInsert.mockResolvedValue(undefined);
    service = new TelemetryService();
  });

  // ── initialize ────────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('calls $t.initialize with converted timeDiff (ms → s)', () => {
      service.initialize(baseCtx);

      expect(mockSdkInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          timeDiff: 3, // 3000ms → 3s
          sid: 'sid-1',
          uid: 'user-123',
          channel: 'test-channel',
        }),
      );
    });

    it('calls $t.resetTags when tags are present', () => {
      service.initialize(baseCtx);
      expect(mockSdkResetTags).toHaveBeenCalledWith(['test-channel']);
    });

    it('does not call $t.resetTags when tags array is empty', () => {
      service.initialize({ ...baseCtx, tags: [] });
      expect(mockSdkResetTags).not.toHaveBeenCalled();
    });

    it('does not call $t.resetTags when tags is undefined', () => {
      const ctx = { ...baseCtx };
      delete (ctx as any).tags;
      service.initialize(ctx);
      expect(mockSdkResetTags).not.toHaveBeenCalled();
    });

    it('uses timeDiff=0 when not provided', () => {
      service.initialize({ ...baseCtx, timeDiff: undefined as any });
      expect(mockSdkInitialize).toHaveBeenCalledWith(
        expect.objectContaining({ timeDiff: 0 }),
      );
    });

    it('falls back to empty string for missing uid/channel', () => {
      service.initialize({ ...baseCtx, uid: undefined as any, channel: undefined as any });
      expect(mockSdkInitialize).toHaveBeenCalledWith(
        expect.objectContaining({ uid: '', channel: '' }),
      );
    });

    it('uses empty string sid when sid is not provided', () => {
      service.initialize({ ...baseCtx, sid: undefined as any });
      expect(mockSdkInitialize).toHaveBeenCalledWith(
        expect.objectContaining({ sid: '' }),
      );
    });

    it('fires the dispatcher and persists events', async () => {
      mockIsInitialized = true;
      service.initialize(baseCtx);

      // Extract the dispatcher passed to $t.initialize
      const initArg = mockSdkInitialize.mock.calls[0][0];
      const batch = { events: [{ mid: 'mid-1', eid: 'IMPRESSION', ets: 1234 }] };
      initArg.dispatcher.dispatch(batch);

      await vi.waitFor(() => {
        expect(mockDbInsert).toHaveBeenCalledWith(
          expect.objectContaining({ event_id: 'mid-1' }),
        );
      });
    });

    it('generates a uuid for event_id when event.mid is absent', async () => {
      mockIsInitialized = true;
      service.initialize(baseCtx);

      const initArg = mockSdkInitialize.mock.calls[0][0];
      initArg.dispatcher.dispatch({ events: [{ eid: 'IMPRESSION', ets: 1234 }] });

      await vi.waitFor(() => {
        expect(mockDbInsert).toHaveBeenCalledWith(
          expect.objectContaining({ event_type: 'IMPRESSION' }),
        );
      });
    });

    it('handles dispatcher dispatch error gracefully', async () => {
      mockIsInitialized = true;
      mockDbInsert.mockRejectedValue(new Error('db error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.initialize(baseCtx);

      const initArg = mockSdkInitialize.mock.calls[0][0];
      initArg.dispatcher.dispatch({ events: [{ mid: 'mid-1', eid: 'IMPRESSION', ets: 1234 }] });

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TelemetryService]'),
          expect.any(Error),
        );
      });
      consoleSpy.mockRestore();
    });
  });

  // ── updateContext ──────────────────────────────────────────────────────────

  describe('updateContext', () => {
    it('calls resetActor when uid is provided', () => {
      service.updateContext({ uid: 'new-user' });
      expect(mockSdkResetActor).toHaveBeenCalledWith({ id: 'new-user', type: 'User' });
    });

    it('does not call resetActor when uid is undefined', () => {
      service.updateContext({ sid: 'new-sid' });
      expect(mockSdkResetActor).not.toHaveBeenCalled();
    });

    it('updates internal sid when sid is provided', async () => {
      mockIsInitialized = true;
      service.updateContext({ sid: 'new-sid-123' });

      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });

      const options = mockSdkInteract.mock.calls[0][1];
      expect(options.context.sid).toBe('new-sid-123');
    });

    it('stores channel override for use in events', async () => {
      mockIsInitialized = true;
      service.updateContext({ channel: 'new-channel' });

      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });

      const options = mockSdkInteract.mock.calls[0][1];
      expect(options.context.channel).toBe('new-channel');
    });

    it('stores rollup override for use in events', async () => {
      mockIsInitialized = true;
      service.updateContext({ rollup: { l1: 'new-channel' } });

      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });

      const options = mockSdkInteract.mock.calls[0][1];
      expect(options.context.rollup).toEqual({ l1: 'new-channel' });
    });

    it('calls resetTags when tags are provided', () => {
      service.updateContext({ tags: ['tag1', 'tag2'] });
      expect(mockSdkResetTags).toHaveBeenCalledWith(['tag1', 'tag2']);
    });

    it('does not call resetTags when tags is undefined', () => {
      service.updateContext({ uid: 'user' });
      expect(mockSdkResetTags).not.toHaveBeenCalled();
    });
  });

  // ── campaign / global cdata ────────────────────────────────────────────────

  describe('updateCampaignParameters', () => {
    it('merges campaign params into event cdata', async () => {
      mockIsInitialized = true;
      service.updateCampaignParameters([{ id: 'google', type: 'utm_source' }]);

      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });

      const options = mockSdkInteract.mock.calls[0][1];
      expect(options.context.cdata).toEqual(
        expect.arrayContaining([{ id: 'google', type: 'utm_source' }]),
      );
    });
  });

  describe('populateGlobalCorRelationData', () => {
    it('merges global cdata into event cdata', async () => {
      mockIsInitialized = true;
      service.populateGlobalCorRelationData([{ id: 'course-123', type: 'Course' }]);

      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });

      const options = mockSdkInteract.mock.calls[0][1];
      expect(options.context.cdata).toEqual(
        expect.arrayContaining([{ id: 'course-123', type: 'Course' }]),
      );
    });
  });

  // ── isInitialized ──────────────────────────────────────────────────────────

  it('isInitialized reflects sdk state', () => {
    mockIsInitialized = false;
    expect(service.isInitialized).toBe(false);
    mockIsInitialized = true;
    expect(service.isInitialized).toBe(true);
  });

  // ── _buildOptions: context.env and input.object ───────────────────────────

  it('passes context.env when provided', async () => {
    mockIsInitialized = true;
    await service.interact({ edata: { type: 'CLICK', id: 'btn' }, context: { env: 'content' } });
    const options = mockSdkInteract.mock.calls[0][1];
    expect(options.context.env).toBe('content');
  });

  it('passes input.object when provided', async () => {
    mockIsInitialized = true;
    await service.interact({
      edata: { type: 'CLICK', id: 'btn' },
      object: { id: 'do_123', type: 'Content', ver: '1' },
    });
    const options = mockSdkInteract.mock.calls[0][1];
    expect(options.object).toEqual({ id: 'do_123', type: 'Content', ver: '1' });
  });

  it('does not set object key when input.object is absent', async () => {
    mockIsInitialized = true;
    await service.interact({ edata: { type: 'CLICK', id: 'btn' } });
    const options = mockSdkInteract.mock.calls[0][1];
    expect(options).not.toHaveProperty('object');
  });

  it('merges input context.cdata with session cdata', async () => {
    mockIsInitialized = true;
    await service.interact({
      edata: { type: 'CLICK', id: 'btn' },
      context: { cdata: [{ id: 'extra-1', type: 'Extra' }] },
    });
    const options = mockSdkInteract.mock.calls[0][1];
    expect(options.context.cdata).toEqual(
      expect.arrayContaining([{ id: 'extra-1', type: 'Extra' }]),
    );
  });

  // ── impression dedup ───────────────────────────────────────────────────────

  describe('impression', () => {
    it('calls $t.impression when initialized', async () => {
      mockIsInitialized = true;
      await service.impression({ edata: { type: 'view', pageid: 'HomePage' } });
      expect(mockSdkImpression).toHaveBeenCalledTimes(1);
    });

    it('does not call $t.impression when not initialized', async () => {
      mockIsInitialized = false;
      await service.impression({ edata: { type: 'view', pageid: 'HomePage' } });
      expect(mockSdkImpression).not.toHaveBeenCalled();
    });

    it('deduplicates rapid impressions for the same pageId', async () => {
      mockIsInitialized = true;
      await service.impression({ edata: { type: 'view', pageid: 'HomePage' } });
      await service.impression({ edata: { type: 'view', pageid: 'HomePage' } });
      expect(mockSdkImpression).toHaveBeenCalledTimes(1);
    });

    it('allows impression for a different pageId without delay', async () => {
      mockIsInitialized = true;
      await service.impression({ edata: { type: 'view', pageid: 'PageA' } });
      await service.impression({ edata: { type: 'view', pageid: 'PageB' } });
      expect(mockSdkImpression).toHaveBeenCalledTimes(2);
    });

    it('fires impression without pageId (no dedup logic)', async () => {
      mockIsInitialized = true;
      await service.impression({ edata: { type: 'view' } });
      await service.impression({ edata: { type: 'view' } });
      expect(mockSdkImpression).toHaveBeenCalledTimes(2);
    });
  });

  // ── interact / start / end / error / log / audit / share / feedback / interrupt / summary ──

  describe('event methods when not initialized', () => {
    beforeEach(() => { mockIsInitialized = false; });

    it('interact is a no-op', async () => {
      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });
      expect(mockSdkInteract).not.toHaveBeenCalled();
    });

    it('start is a no-op', async () => {
      await service.start({ type: 'app' }, '', '', {});
      expect(mockSdkStart).not.toHaveBeenCalled();
    });

    it('end is a no-op', async () => {
      await service.end({ edata: { type: 'content' } });
      expect(mockSdkEnd).not.toHaveBeenCalled();
    });

    it('error is a no-op', async () => {
      await service.error({ edata: { err: 'err' } });
      expect(mockSdkError).not.toHaveBeenCalled();
    });

    it('log is a no-op', async () => {
      await service.log({ edata: { level: 'INFO' } });
      expect(mockSdkLog).not.toHaveBeenCalled();
    });

    it('audit is a no-op', async () => {
      await service.audit({ edata: { type: 'update' } });
      expect(mockSdkAudit).not.toHaveBeenCalled();
    });

    it('share is a no-op', async () => {
      await service.share({ edata: { type: 'content' } });
      expect(mockSdkShare).not.toHaveBeenCalled();
    });

    it('feedback is a no-op', async () => {
      await service.feedback({ edata: { rating: 5 } });
      expect(mockSdkFeedback).not.toHaveBeenCalled();
    });

    it('interrupt is a no-op', async () => {
      await service.interrupt({ edata: { type: 'background' } });
      expect(mockSdkInterrupt).not.toHaveBeenCalled();
    });

    it('summary is a no-op', async () => {
      await service.summary({ edata: { type: 'content' } });
      expect(mockSdkSummary).not.toHaveBeenCalled();
    });
  });

  describe('event methods when initialized', () => {
    beforeEach(() => { mockIsInitialized = true; });

    it('interact calls $t.interact', async () => {
      await service.interact({ edata: { type: 'CLICK', id: 'btn' } });
      expect(mockSdkInteract).toHaveBeenCalledTimes(1);
    });

    it('start calls $t.start without options', async () => {
      await service.start({ type: 'app', mode: '', duration: 0, pageid: '' }, '', '', {});
      expect(mockSdkStart).toHaveBeenCalledWith(
        {},
        '', '',
        { type: 'app', mode: '', duration: 0, pageid: '' },
        {},
      );
    });

    it('start calls $t.start with options', async () => {
      await service.start(
        { type: 'content', mode: 'play', duration: 0, pageid: '' },
        'do_123', '1', {},
        { object: { id: 'do_123', type: 'Content', ver: '1' } },
      );
      expect(mockSdkStart).toHaveBeenCalledWith(
        {},
        'do_123', '1',
        expect.objectContaining({ type: 'content' }),
        expect.objectContaining({ object: { id: 'do_123', type: 'Content', ver: '1' } }),
      );
    });

    it('end calls $t.end', async () => {
      await service.end({ edata: { type: 'content', mode: 'play' } });
      expect(mockSdkEnd).toHaveBeenCalledTimes(1);
    });

    it('error calls $t.error', async () => {
      await service.error({ edata: { err: 'E001' } });
      expect(mockSdkError).toHaveBeenCalledTimes(1);
    });

    it('log calls $t.log', async () => {
      await service.log({ edata: { level: 'INFO', message: 'hi' } });
      expect(mockSdkLog).toHaveBeenCalledTimes(1);
    });

    it('audit calls $t.audit', async () => {
      await service.audit({ edata: { type: 'update' } });
      expect(mockSdkAudit).toHaveBeenCalledTimes(1);
    });

    it('share calls $t.share', async () => {
      await service.share({ edata: { type: 'content' } });
      expect(mockSdkShare).toHaveBeenCalledTimes(1);
    });

    it('feedback calls $t.feedback', async () => {
      await service.feedback({ edata: { rating: 4 } });
      expect(mockSdkFeedback).toHaveBeenCalledTimes(1);
    });

    it('interrupt calls $t.interrupt', async () => {
      await service.interrupt({ edata: { type: 'background' } });
      expect(mockSdkInterrupt).toHaveBeenCalledTimes(1);
    });

    it('summary calls $t.summary', async () => {
      await service.summary({ edata: { type: 'content', timespent: 30 } });
      expect(mockSdkSummary).toHaveBeenCalledTimes(1);
    });
  });

  // ── save ───────────────────────────────────────────────────────────────────

  describe('save', () => {
    it('does nothing when event is null/undefined', async () => {
      await service.save(null);
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('persists event with eid from event.eid', async () => {
      await service.save({ eid: 'IMPRESSION', ets: 123456 });
      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'IMPRESSION' }),
      );
    });

    it('falls back to event.data.eid when event.eid is absent', async () => {
      await service.save({ data: { eid: 'INTERACT' }, ets: 123456 });
      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'INTERACT' }),
      );
    });

    it('falls back to event.type when neither eid nor data.eid is present', async () => {
      await service.save({ type: 'start', ets: 123456 });
      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'START' }),
      );
    });

    it('falls back to UNKNOWN when no eid/type available', async () => {
      await service.save({ ets: 123456 });
      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'UNKNOWN' }),
      );
    });

    it('uses Date.now() for timestamp when ets is not a number', async () => {
      const before = Date.now();
      await service.save({ eid: 'IMPRESSION', ets: 'invalid' });
      const after = Date.now();
      const call = mockDbInsert.mock.calls[0][0];
      expect(call.timestamp).toBeGreaterThanOrEqual(before);
      expect(call.timestamp).toBeLessThanOrEqual(after);
    });

    it('handles JSON serialization error gracefully', async () => {
      const circular: any = {};
      circular.self = circular;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // JSON.stringify will throw on circular reference
      await service.save(circular);

      // Should still call insert with a fallback JSON
      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.stringContaining('non-serializable') }),
      );
      consoleSpy.mockRestore();
    });

    it('handles db insert error gracefully in save', async () => {
      mockDbInsert.mockRejectedValue(new Error('db fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.save({ eid: 'IMPRESSION', ets: 123 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TelemetryService]'),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});
