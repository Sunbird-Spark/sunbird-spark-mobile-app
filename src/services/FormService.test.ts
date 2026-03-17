import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormService } from './FormService';
import { getClient } from '../lib/http-client';

// Mock the HTTP client
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn()
}));

describe('FormService', () => {
  let formService: FormService;
  let mockHttpClient: any;

  beforeEach(() => {
    formService = new FormService();
    mockHttpClient = {
      post: vi.fn()
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('formRead', () => {
    it('should call the correct endpoint with required fields', async () => {
      const mockResponse = {
        data: {
          form: {
            type: 'portal',
            action: 'filters',
            data: {},
          },
        },
        status: 200,
        headers: {},
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const request = {
        type: 'portal',
        action: 'filters',
      };

      const result = await formService.formRead(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/data/v1/form/read',
        {
          request: {
            type: 'portal',
            subType: '',
            action: 'filters',
            component: '*',
            rootOrgId: '*',
            framework: '*',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass optional fields when provided', async () => {
      const mockResponse = { data: { form: {} }, status: 200, headers: {} };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const request = {
        type: 'portal',
        subType: 'explorepage',
        action: 'filters',
        component: 'portal',
        rootOrgId: 'org123',
        framework: 'NCF',
      };

      await formService.formRead(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/data/v1/form/read',
        {
          request: {
            type: 'portal',
            subType: 'explorepage',
            action: 'filters',
            component: 'portal',
            rootOrgId: 'org123',
            framework: 'NCF',
          },
        }
      );
    });

    it('should default subType to empty string when not provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await formService.formRead({ type: 'test', action: 'read' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/data/v1/form/read',
        expect.objectContaining({
          request: expect.objectContaining({
            subType: '',
          }),
        })
      );
    });

    it('should default component to "*" when not provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await formService.formRead({ type: 'test', action: 'read' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/data/v1/form/read',
        expect.objectContaining({
          request: expect.objectContaining({
            component: '*',
          }),
        })
      );
    });

    it('should default rootOrgId to "*" when not provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await formService.formRead({ type: 'test', action: 'read' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/data/v1/form/read',
        expect.objectContaining({
          request: expect.objectContaining({
            rootOrgId: '*',
          }),
        })
      );
    });

    it('should default framework to "*" when not provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await formService.formRead({ type: 'test', action: 'read' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/data/v1/form/read',
        expect.objectContaining({
          request: expect.objectContaining({
            framework: '*',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('API Error'));

      await expect(
        formService.formRead({ type: 'test', action: 'read' })
      ).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network Error'));

      await expect(
        formService.formRead({ type: 'portal', action: 'filters' })
      ).rejects.toThrow('Network Error');
    });

    it('should return form data with correct structure', async () => {
      const mockResponse = {
        data: {
          form: {
            framework: '*',
            type: 'portal',
            subtype: 'explorepage',
            action: 'filters',
            component: 'portal',
            data: { filters: [] },
            created_on: '2026-01-01',
            last_modified_on: '2026-01-01',
            rootOrgId: '*',
          },
        },
        status: 200,
        headers: {},
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await formService.formRead({
        type: 'portal',
        action: 'filters',
      });

      expect(result.data).toHaveProperty('form');
      expect(result.data.form).toHaveProperty('type');
      expect(result.data.form).toHaveProperty('action');
    });
  });
});
