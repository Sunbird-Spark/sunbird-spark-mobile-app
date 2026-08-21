import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewerService } from './ViewerService';
import { getClient } from '../../lib/http-client';

vi.mock('../../lib/http-client', () => ({
  getClient: vi.fn(),
}));

describe('ViewerService', () => {
  let viewerService: ViewerService;
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClient = { post: vi.fn(), get: vi.fn(), delete: vi.fn() };
    (getClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
    viewerService = new ViewerService();
  });

  describe('wire-contract: toWireIds', () => {
    it('viewStart sends courseId/batchId, never collectionId/contextId', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewStart({
        userId: 'u1',
        contentId: 'c1',
        collectionId: 'lp1',
        contextId: 'ctx1',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/view/start', {
        request: { userId: 'u1', contentId: 'c1', courseId: 'lp1', batchId: 'ctx1' },
      });
      const [, body] = mockClient.post.mock.calls[0];
      expect(body.request).not.toHaveProperty('collectionId');
      expect(body.request).not.toHaveProperty('contextId');
    });

    it('omits courseId/batchId when collectionId/contextId are blank, letting the server cascade apply', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewStart({ userId: 'u1', contentId: 'c1' });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/view/start', {
        request: { userId: 'u1', contentId: 'c1' },
      });
    });

    it('viewUpdate carries the wire ids plus progressDetails/timespent', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewUpdate({
        userId: 'u1',
        contentId: 'c1',
        collectionId: 'lp1',
        contextId: 'ctx1',
        progressDetails: { progress: 50 },
        timespent: 30,
      });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/view/update', {
        request: {
          userId: 'u1',
          contentId: 'c1',
          courseId: 'lp1',
          batchId: 'ctx1',
          progressDetails: { progress: 50 },
          timespent: 30,
        },
      });
    });

    it('viewAssess posts to /v1/assessment/submit (NOT /v1/view/assess) with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewAssess({
        userId: 'u1',
        contentId: 'qs1',
        collectionId: 'lp1',
        contextId: 'ctx1',
        assessments: [{ q: 1 }],
        attemptId: 'attempt-1',
        assessmentTs: 12345,
        score: 8,
        maxScore: 10,
      });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/assessment/submit', {
        request: expect.objectContaining({
          courseId: 'lp1',
          batchId: 'ctx1',
          assessments: [{ q: 1 }],
          attemptId: 'attempt-1',
          assessmentTs: 12345,
          score: 8,
          maxScore: 10,
        }),
      });
      const [, body] = mockClient.post.mock.calls[0];
      expect(body.request).not.toHaveProperty('collectionId');
      expect(body.request).not.toHaveProperty('contextId');
    });

    it('viewEnd posts to /v1/view/end with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewEnd({ userId: 'u1', contentId: 'c1', collectionId: 'lp1', contextId: 'ctx1' });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/view/end', {
        request: { userId: 'u1', contentId: 'c1', courseId: 'lp1', batchId: 'ctx1' },
      });
    });

    it('viewRead posts to /v1/view/read with wire ids and a contentId array', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewRead({
        userId: 'u1',
        contentId: ['c1', 'c2'],
        collectionId: 'lp1',
        contextId: 'ctx1',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/view/read', {
        request: { userId: 'u1', contentId: ['c1', 'c2'], courseId: 'lp1', batchId: 'ctx1' },
      });
    });

    it('assessmentRead posts to /v1/assessment/read with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.assessmentRead({
        userId: 'u1',
        contentId: ['qs1'],
        collectionId: 'lp1',
        contextId: 'ctx1',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/assessment/read', {
        request: { userId: 'u1', contentId: ['qs1'], courseId: 'lp1', batchId: 'ctx1' },
      });
    });

    it('summaryRead posts to /v1/summary/read with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.summaryRead({ userId: 'u1', collectionId: 'lp1', contextId: 'ctx1' });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/summary/read', {
        request: { userId: 'u1', courseId: 'lp1', batchId: 'ctx1' },
      });
    });
  });

  describe('summaryList', () => {
    it('GETs /v1/summary/list/:userId', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await viewerService.summaryList('u1');
      expect(mockClient.get).toHaveBeenCalledWith('/v1/summary/list/u1');
    });
  });

  describe('summaryDelete', () => {
    it('DELETEs with no query when neither all nor ids are given', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      await viewerService.summaryDelete({ userId: 'u1' });
      expect(mockClient.delete).toHaveBeenCalledWith('/v1/summary/delete/u1');
    });

    it('DELETEs with ?all=true for every enrolment', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      await viewerService.summaryDelete({ userId: 'u1', all: true });
      expect(mockClient.delete).toHaveBeenCalledWith('/v1/summary/delete/u1?all=true');
    });

    it('DELETEs a specific enrolment using wire query params courseId/batchId', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      await viewerService.summaryDelete({ userId: 'u1', collectionId: 'lp1', contextId: 'ctx1' });
      expect(mockClient.delete).toHaveBeenCalledWith('/v1/summary/delete/u1?courseId=lp1&batchId=ctx1');
    });
  });

  describe('summaryDownload', () => {
    it('GETs /v1/summary/download/:userId without a query by default', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await viewerService.summaryDownload('u1');
      expect(mockClient.get).toHaveBeenCalledWith('/v1/summary/download/u1');
    });

    it('GETs with ?format=csv when a format is given', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await viewerService.summaryDownload('u1', 'csv');
      expect(mockClient.get).toHaveBeenCalledWith('/v1/summary/download/u1?format=csv');
    });
  });
});
