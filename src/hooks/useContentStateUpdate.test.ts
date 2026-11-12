import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockMutateAsync, mockCalculateContentProgress, mockProgressToStatus, authState } =
  vi.hoisted(() => ({
    mockMutateAsync: vi.fn(),
    mockCalculateContentProgress: vi.fn(),
    mockProgressToStatus: vi.fn(),
    authState: { userId: 'user-1' as string | null },
  }));

vi.mock('./useBatch', () => ({
  useContentStateUpdateMutation: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('../services/course/contentProgressCalculator', () => ({
  calculateContentProgress: mockCalculateContentProgress,
  progressToStatus: mockProgressToStatus,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import { useContentStateUpdate } from './useContentStateUpdate';

const BASE = {
  collectionId: 'do_course',
  contentId: 'do_content',
  effectiveBatchId: 'batch-1',
  isEnrolledInCurrentBatch: true,
  mimeType: 'application/vnd.ekstep.ecml-archive',
};

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

type Params = Parameters<typeof useContentStateUpdate>[0];

const renderHandler = (overrides: Partial<Params> = {}) =>
  renderHook((props: Params) => useContentStateUpdate(props), {
    wrapper,
    initialProps: { ...BASE, ...overrides } as Params,
  });

/** Fires a telemetry event through the handler and flushes the fire-and-forget promises. */
const fire = async (
  handler: ReturnType<typeof useContentStateUpdate>,
  event: Parameters<ReturnType<typeof useContentStateUpdate>>[0],
) => {
  await act(async () => {
    handler(event);
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useContentStateUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userId = 'user-1';
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    mockMutateAsync.mockResolvedValue({ data: {}, status: 200, headers: {} });
    mockCalculateContentProgress.mockReturnValue(100);
    mockProgressToStatus.mockReturnValue(2);
  });

  describe('guards — no API call', () => {
    it('does nothing when skipContentStateUpdate is set', async () => {
      const { result } = renderHandler({ skipContentStateUpdate: true });
      await fire(result.current, { eid: 'START', ets: 1 });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('does nothing when the user is not enrolled in the current batch', async () => {
      const { result } = renderHandler({ isEnrolledInCurrentBatch: false });
      await fire(result.current, { eid: 'START', ets: 1 });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('does nothing when the batch has ended', async () => {
      const { result } = renderHandler({ isBatchEnded: true });
      await fire(result.current, { eid: 'START', ets: 1 });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('does nothing when the batchId is missing', async () => {
      const { result } = renderHandler({ effectiveBatchId: undefined });
      await fire(result.current, { eid: 'START', ets: 1 });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('does nothing for non-SelfAssess content that is already complete', async () => {
      const { result } = renderHandler({ currentContentStatus: 2 });
      await fire(result.current, { eid: 'START', ets: 1 });
      await fire(result.current, { eid: 'END', edata: { summary: [] } });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('does nothing when there is no logged-in user', async () => {
      authState.userId = null;
      const { result } = renderHandler();
      await fire(result.current, { eid: 'START', ets: 1 });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('ignores unrelated telemetry events', async () => {
      const { result } = renderHandler();
      await fire(result.current, { eid: 'IMPRESSION' });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('START', () => {
    it('marks the content in-progress and invalidates contentState', async () => {
      const { result } = renderHandler();

      await fire(result.current, { eid: 'START', ets: 1700000000000 });

      expect(mockMutateAsync).toHaveBeenCalledWith({
        userId: 'user-1',
        courseId: 'do_course',
        batchId: 'batch-1',
        contents: [{ contentId: 'do_content', status: 1 }],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentState'] });
    });

    it('does not re-send status 1 for a repeated START in the same session', async () => {
      const { result } = renderHandler();

      await fire(result.current, { eid: 'START', ets: 1 });
      await fire(result.current, { eid: 'START', ets: 2 });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('reads the eid from a nested data envelope', async () => {
      const { result } = renderHandler();

      await fire(result.current, { data: { eid: 'START', ets: 5 } });

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ contents: [{ contentId: 'do_content', status: 1 }] }),
      );
    });

    it('logs an update failure without throwing', async () => {
      mockMutateAsync.mockRejectedValue(new Error('offline'));
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHandler();

      await fire(result.current, { eid: 'START', ets: 1 });

      expect(errSpy).toHaveBeenCalledWith('Content state update failed:', expect.any(Error));

      // NOTE: handleContentStateUpdate swallows the error internally, so the
      // outer .then() still marks lastSentStatusRef = 1 and a follow-up START
      // is suppressed — the "next START retries" comment in the hook does not
      // hold for API failures (only the mutation never resolving would).
      mockMutateAsync.mockResolvedValue({ data: {}, status: 200, headers: {} });
      await fire(result.current, { eid: 'START', ets: 2 });
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      errSpy.mockRestore();
    });

    it('resets its in-session refs when contentId changes', async () => {
      const { result, rerender } = renderHandler();

      await fire(result.current, { eid: 'START', ets: 1 });
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);

      rerender({ ...BASE, contentId: 'do_other' } as Params);
      await fire(result.current, { eid: 'START', ets: 2 });

      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      expect(mockMutateAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ contents: [{ contentId: 'do_other', status: 1 }] }),
      );
    });
  });

  describe('END — non-SelfAssess', () => {
    it('derives the status from the summary progress', async () => {
      mockCalculateContentProgress.mockReturnValue(100);
      mockProgressToStatus.mockReturnValue(2);
      const { result } = renderHandler();

      await fire(result.current, { eid: 'END', edata: { summary: [{ progress: 100 }] } });

      expect(mockCalculateContentProgress).toHaveBeenCalledWith(
        [{ progress: 100 }],
        BASE.mimeType,
      );
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ contents: [{ contentId: 'do_content', status: 2 }] }),
      );
    });

    it('does not regress to status 0 after a START already reported status 1', async () => {
      const { result } = renderHandler();
      await fire(result.current, { eid: 'START', ets: 1 });

      mockProgressToStatus.mockReturnValue(0);
      mockMutateAsync.mockClear();
      await fire(result.current, { eid: 'END', edata: { summary: [{ progress: 0 }] } });

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ contents: [{ contentId: 'do_content', status: 1 }] }),
      );
    });

    it('normalises a single (non-array) summary object', async () => {
      const { result } = renderHandler();

      await fire(result.current, { eid: 'END', summary: { progress: 50 } });

      expect(mockCalculateContentProgress).toHaveBeenCalledWith(
        [{ progress: 50 }],
        BASE.mimeType,
      );
    });

    it('defaults the mimeType to an empty string when absent', async () => {
      const { result } = renderHandler({ mimeType: undefined });

      await fire(result.current, { eid: 'END', edata: { summary: [] } });

      expect(mockCalculateContentProgress).toHaveBeenCalledWith([], '');
    });
  });

  describe('SelfAssess', () => {
    const selfAssess = { contentType: 'SelfAssess' };

    it('sends the assessment payload when END carries a score and the end page was seen', async () => {
      const { result } = renderHandler(selfAssess);

      await fire(result.current, { eid: 'START', ets: 1700000000000 });
      mockMutateAsync.mockClear();
      invalidateSpy.mockClear();

      await fire(result.current, {
        eid: 'ASSESS',
        edata: { score: 1, item: { id: 'q1' } },
      });
      await fire(result.current, {
        eid: 'END',
        edata: { score: 1, summary: [{ endpageseen: true }] },
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      const payload = mockMutateAsync.mock.calls[0][0];
      expect(payload.contents[0]).toMatchObject({ contentId: 'do_content', status: 2 });
      expect(payload.contents[0].lastAccessTime).toMatch(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3}\+0000$/,
      );
      expect(payload.assessments).toHaveLength(1);
      expect(payload.assessments[0]).toMatchObject({
        assessmentTs: 1700000000000,
        batchId: 'batch-1',
        courseId: 'do_course',
        contentId: 'do_content',
        userId: 'user-1',
      });
      expect(payload.assessments[0].attemptId).toEqual(expect.any(String));
      expect(payload.assessments[0].events).toHaveLength(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentState'] });
    });

    it('treats a score carried only on an ASSESS event as a score', async () => {
      const { result } = renderHandler(selfAssess);

      await fire(result.current, { eid: 'START', ets: 10 });
      mockMutateAsync.mockClear();
      await fire(result.current, { eid: 'ASSESS', edata: { score: 5 } });
      await fire(result.current, {
        eid: 'END',
        edata: { summary: [{ visitedcontentend: true }] },
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync.mock.calls[0][0].assessments).toHaveLength(1);
    });

    it('caps the status at 1 when the completion criteria are not met', async () => {
      mockProgressToStatus.mockReturnValue(2);
      const { result } = renderHandler(selfAssess);

      await fire(result.current, { eid: 'END', edata: { summary: [{ progress: 100 }] } });

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ contents: [{ contentId: 'do_content', status: 1 }] }),
      );
    });

    it('sends the assessment on renderer:question:submitscore after a START', async () => {
      const { result } = renderHandler(selfAssess);

      await fire(result.current, { eid: 'START', ets: 42 });
      mockMutateAsync.mockClear();

      await fire(result.current, { data: 'renderer:question:submitscore' });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync.mock.calls[0][0].assessments[0].assessmentTs).toBe(42);
    });

    it('ignores submitscore when no START has been seen', async () => {
      const { result } = renderHandler(selfAssess);

      await fire(result.current, { data: 'renderer:question:submitscore' });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('still processes events for content already marked complete', async () => {
      const { result } = renderHandler({ ...selfAssess, currentContentStatus: 2 });

      await fire(result.current, { eid: 'START', ets: 7 });
      mockMutateAsync.mockClear();
      await fire(result.current, {
        eid: 'END',
        edata: { score: 3, summary: [{ endpageseen: true }] },
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('does not regress an already-complete SelfAssess when criteria are unmet', async () => {
      const { result } = renderHandler({ ...selfAssess, currentContentStatus: 2 });

      await fire(result.current, { eid: 'END', edata: { summary: [] } });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('logs and swallows an assessment update failure', async () => {
      mockMutateAsync.mockRejectedValue(new Error('server 500'));
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHandler(selfAssess);

      await fire(result.current, { eid: 'START', ets: 9 });
      await fire(result.current, {
        eid: 'END',
        edata: { score: 1, summary: [{ endpageseen: true }] },
      });

      expect(errSpy).toHaveBeenCalledWith('Assessment state update failed:', expect.any(Error));
      errSpy.mockRestore();
    });
  });
});
