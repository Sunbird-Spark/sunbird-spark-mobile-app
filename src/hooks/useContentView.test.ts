import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContentView } from './useContentView';

const { mockUseAuth, mockViewerService, mockPatchSummary, mockInvalidateSummary, mockMergeSummaryRecord, mockRecordAssessmentScore } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockViewerService: {
      viewStart: vi.fn().mockResolvedValue({ data: {} }),
      viewUpdate: vi.fn().mockResolvedValue({ data: {} }),
      viewEnd: vi.fn().mockResolvedValue({ data: {} }),
      viewAssess: vi.fn().mockResolvedValue({ data: {} }),
      summaryRead: vi.fn().mockResolvedValue({ data: {} }),
    },
    mockPatchSummary: vi.fn(),
    mockInvalidateSummary: vi.fn().mockResolvedValue(undefined),
    mockMergeSummaryRecord: vi.fn(),
    mockRecordAssessmentScore: vi.fn(),
  }));

vi.mock('../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../services/viewer', () => ({ viewerService: mockViewerService }));
vi.mock('./useViewerSummary', () => ({
  useInvalidateViewerSummary: () => mockInvalidateSummary,
  useOptimisticViewerSummaryPatch: () => mockPatchSummary,
  useMergeViewerSummaryRecord: () => mockMergeSummaryRecord,
}));
vi.mock('./useAssessmentScores', () => ({
  useRecordAssessmentScore: () => mockRecordAssessmentScore,
}));

const BASE_PARAMS = {
  collectionId: 'course1',
  contentId: 'content1',
  contextId: 'lp1:course1',
  isEnrolledInCurrentBatch: true,
  mimeType: 'application/pdf',
};

describe('useContentView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    mockViewerService.viewStart.mockResolvedValue({ data: {} });
    mockViewerService.viewUpdate.mockResolvedValue({ data: {} });
    mockViewerService.viewEnd.mockResolvedValue({ data: {} });
    mockViewerService.viewAssess.mockResolvedValue({ data: {} });
    mockViewerService.summaryRead.mockResolvedValue({ data: {} });
  });

  it('calls viewStart exactly once per attempt on the first START event', () => {
    const { result } = renderHook(() => useContentView(BASE_PARAMS));
    result.current({ eid: 'START', ets: 1000 });
    result.current({ eid: 'START', ets: 1001 }); // a duplicate START in the same mount is a no-op
    expect(mockViewerService.viewStart).toHaveBeenCalledTimes(1);
    expect(mockViewerService.viewStart).toHaveBeenCalledWith({
      userId: 'u1',
      contentId: 'content1',
      collectionId: 'course1',
      contextId: 'lp1:course1',
    });
  });

  it('does nothing when not enrolled in the current batch', () => {
    const { result } = renderHook(() => useContentView({ ...BASE_PARAMS, isEnrolledInCurrentBatch: false }));
    result.current({ eid: 'START', ets: 1000 });
    expect(mockViewerService.viewStart).not.toHaveBeenCalled();
  });

  it('does nothing when skipContentStateUpdate is true', () => {
    const { result } = renderHook(() => useContentView({ ...BASE_PARAMS, skipContentStateUpdate: true }));
    result.current({ eid: 'START', ets: 1000 });
    expect(mockViewerService.viewStart).not.toHaveBeenCalled();
  });

  it('does nothing when the batch has ended', () => {
    const { result } = renderHook(() => useContentView({ ...BASE_PARAMS, isBatchEnded: true }));
    result.current({ eid: 'START', ets: 1000 });
    expect(mockViewerService.viewStart).not.toHaveBeenCalled();
  });

  it('skips already-completed non-SelfAssess/non-QuML content entirely', () => {
    const { result } = renderHook(() => useContentView({ ...BASE_PARAMS, currentContentStatus: 2 }));
    result.current({ eid: 'START', ets: 1000 });
    expect(mockViewerService.viewStart).not.toHaveBeenCalled();
  });

  it('END: patches the summary optimistically, then calls update -> end -> confirm -> invalidate in order', async () => {
    const { result } = renderHook(() => useContentView(BASE_PARAMS));
    const callOrder: string[] = [];
    mockViewerService.viewUpdate.mockImplementation(async () => {
      callOrder.push('update');
      return { data: {} };
    });
    mockViewerService.viewEnd.mockImplementation(async () => {
      callOrder.push('end');
      return { data: {} };
    });
    mockViewerService.summaryRead.mockImplementation(async () => {
      callOrder.push('confirm');
      return { data: {} };
    });
    mockInvalidateSummary.mockImplementation(async () => {
      callOrder.push('invalidate');
    });

    result.current({ eid: 'START', ets: 1000 });
    result.current({ eid: 'END', edata: { summary: [{ progress: 100 }], duration: 30 } } as never);

    await waitFor(() => expect(callOrder).toEqual(['update', 'end', 'confirm', 'invalidate']));

    expect(mockPatchSummary).toHaveBeenCalledWith('course1', 'content1', expect.any(Number));
    expect(mockViewerService.viewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        contentId: 'content1',
        collectionId: 'course1',
        contextId: 'lp1:course1',
        timespent: 30,
      })
    );
  });

  it('QUML_SUMMARY: submits an assessment exactly once even if END also fires (double-submit guard)', async () => {
    const { result } = renderHook(() =>
      useContentView({ ...BASE_PARAMS, mimeType: 'application/vnd.sunbird.questionset', contentType: 'SelfAssess' })
    );

    result.current({ eid: 'START', ets: 1000 });
    result.current({ eid: 'ASSESS', data: { edata: { score: 1, item: { maxscore: 1 } } } } as never);
    result.current({
      eid: 'QUML_SUMMARY',
      edata: { score: 8, endpageseen: true },
    } as never);

    await waitFor(() => expect(mockViewerService.viewAssess).toHaveBeenCalledTimes(1));
    expect(mockViewerService.viewAssess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        contentId: 'content1',
        collectionId: 'course1',
        contextId: 'lp1:course1',
        score: 8,
      })
    );
    expect(mockRecordAssessmentScore).toHaveBeenCalledWith('u1', 'course1', 'lp1:course1', 'content1', {
      score: 8,
      maxScore: expect.any(Number),
    });
  });

  it('does not call any Viewer Service API for ASSESS-only events (buffered until END/QUML_SUMMARY)', () => {
    const { result } = renderHook(() => useContentView(BASE_PARAMS));
    result.current({ eid: 'START', ets: 1000 });
    result.current({ eid: 'ASSESS', data: { edata: { score: 1 } } } as never);
    expect(mockViewerService.viewUpdate).not.toHaveBeenCalled();
    expect(mockViewerService.viewAssess).not.toHaveBeenCalled();
  });
});
