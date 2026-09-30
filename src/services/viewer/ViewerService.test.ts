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

      expect(mockClient.post).toHaveBeenCalledWith('/view/v1/start', {
        request: { userId: 'u1', contentId: 'c1', courseId: 'lp1', batchId: 'ctx1' },
      });
      const [, body] = mockClient.post.mock.calls[0];
      expect(body.request).not.toHaveProperty('collectionId');
      expect(body.request).not.toHaveProperty('contextId');
    });

    it('omits courseId/batchId when collectionId/contextId are blank, letting the server cascade apply', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewStart({ userId: 'u1', contentId: 'c1' });

      expect(mockClient.post).toHaveBeenCalledWith('/view/v1/start', {
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

      expect(mockClient.post).toHaveBeenCalledWith('/view/v1/update', {
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

    it('viewAssess posts to /assessment/v1/submit (NOT /view/v1/assess) with wire ids', async () => {
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

      expect(mockClient.post).toHaveBeenCalledWith('/assessment/v1/submit', {
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

    it('viewEnd posts to /view/v1/end with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewEnd({ userId: 'u1', contentId: 'c1', collectionId: 'lp1', contextId: 'ctx1' });

      expect(mockClient.post).toHaveBeenCalledWith('/view/v1/end', {
        request: { userId: 'u1', contentId: 'c1', courseId: 'lp1', batchId: 'ctx1' },
      });
    });

    it('viewRead posts to /view/v1/read with wire ids and a contentId array', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.viewRead({
        userId: 'u1',
        contentId: ['c1', 'c2'],
        collectionId: 'lp1',
        contextId: 'ctx1',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/view/v1/read', {
        request: { userId: 'u1', contentId: ['c1', 'c2'], courseId: 'lp1', batchId: 'ctx1' },
      });
    });

    it('assessmentRead posts to /assessment/v1/read with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.assessmentRead({
        userId: 'u1',
        contentId: ['qs1'],
        collectionId: 'lp1',
        contextId: 'ctx1',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/assessment/v1/read', {
        request: { userId: 'u1', contentId: ['qs1'], courseId: 'lp1', batchId: 'ctx1' },
      });
    });

    it('summaryRead posts to /summary/v1/read with wire ids', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      await viewerService.summaryRead({ userId: 'u1', collectionId: 'lp1', contextId: 'ctx1' });

      expect(mockClient.post).toHaveBeenCalledWith('/summary/v1/read', {
        request: { userId: 'u1', courseId: 'lp1', batchId: 'ctx1' },
      });
    });
  });

  describe('summaryList', () => {
    it('GETs /summary/v1/list/:userId', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await viewerService.summaryList('u1');
      expect(mockClient.get).toHaveBeenCalledWith('/summary/v1/list/u1');
    });
  });

  describe('summaryDelete', () => {
    it('DELETEs with no query when neither all nor ids are given', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      await viewerService.summaryDelete({ userId: 'u1' });
      expect(mockClient.delete).toHaveBeenCalledWith('/summary/v1/delete/u1');
    });

    it('DELETEs with ?all=true for every enrolment', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      await viewerService.summaryDelete({ userId: 'u1', all: true });
      expect(mockClient.delete).toHaveBeenCalledWith('/summary/v1/delete/u1?all=true');
    });

    it('DELETEs a specific enrolment using wire query params courseId/batchId', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      await viewerService.summaryDelete({ userId: 'u1', collectionId: 'lp1', contextId: 'ctx1' });
      expect(mockClient.delete).toHaveBeenCalledWith('/summary/v1/delete/u1?courseId=lp1&batchId=ctx1');
    });
  });

  describe('summaryDownload', () => {
    it('GETs /summary/v1/download/:userId without a query by default', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await viewerService.summaryDownload('u1');
      expect(mockClient.get).toHaveBeenCalledWith('/summary/v1/download/u1');
    });

    it('GETs with ?format=csv when a format is given', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await viewerService.summaryDownload('u1', 'csv');
      expect(mockClient.get).toHaveBeenCalledWith('/summary/v1/download/u1?format=csv');
    });
  });
});
