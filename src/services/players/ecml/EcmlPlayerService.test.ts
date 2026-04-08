import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcmlPlayerService } from './EcmlPlayerService';

vi.mock('../PlayerContextService', () => ({
  buildEcmlPlayerContext: vi.fn().mockImplementation(async () => ({
    mode: 'play',
    sid: 'test-sid',
    did: 'test-did',
    uid: 'test-uid',
    channel: 'test-channel',
    pdata: { id: 'test', ver: '1.0', pid: 'test-pid' },
    contextRollup: {},
    tags: [],
    cdata: [],
    timeDiff: 0,
    objectRollup: {},
    host: '',
    endpoint: '',
    dims: [],
    app: [],
    partner: [],
    userData: { firstName: 'Test', lastName: 'User' },
  })),
}));

const mockLoad = vi.fn().mockResolvedValue({
  baseUrl: 'https://test.sunbirded.org',
  mobileAppConsumer: '',
  mobileAppKey: '',
  mobileAppSecret: '',
  producerId: '',
  appVersion: '',
});

vi.mock('../../NativeConfigService', () => ({
  NativeConfigServiceInstance: { load: (...args: any[]) => mockLoad(...args) },
}));

describe('EcmlPlayerService', () => {
  let service: EcmlPlayerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EcmlPlayerService();
  });

  describe('H5P/HTML online streamingUrl rewrite', () => {
    it('rewrites H5P CDN streamingUrl to same-origin /assets/public path', async () => {
      const metadata = {
        identifier: 'do_h5p_123',
        name: 'H5P Test',
        artifactUrl: 'artifact.zip',
        mimeType: 'application/vnd.ekstep.h5p-archive',
        status: 'Live',
        streamingUrl: 'https://edtesting.blob.core.windows.net/ed-testing-public/content/h5p/do_h5p_123-latest',
      };
      const result = await service.createConfig(metadata);
      expect(result.metadata.streamingUrl).toBe('/assets/public/content/h5p/do_h5p_123-latest');
    });

    it('rewrites HTML CDN streamingUrl to same-origin /assets/public path', async () => {
      const metadata = {
        identifier: 'do_html_456',
        name: 'HTML Test',
        artifactUrl: 'artifact.zip',
        mimeType: 'application/vnd.ekstep.html-archive',
        status: 'Live',
        streamingUrl: 'https://cdn.example.com/container/content/html/do_html_456-latest',
      };
      const result = await service.createConfig(metadata);
      expect(result.metadata.streamingUrl).toBe('/assets/public/content/html/do_html_456-latest');
    });

    it('does not rewrite streamingUrl for ECML content', async () => {
      const metadata = {
        identifier: 'do_ecml',
        name: 'ECML Test',
        artifactUrl: 'artifact.zip',
        mimeType: 'application/vnd.ekstep.ecml-archive',
        streamingUrl: 'https://cdn.example.com/content/ecml/do_ecml-latest',
      };
      const result = await service.createConfig(metadata);
      // ECML streamingUrl should pass through unchanged (spread into wrappedMetadata)
      expect(result.metadata.streamingUrl).toBe(
        'https://cdn.example.com/content/ecml/do_ecml-latest',
      );
    });

    it('does not rewrite streamingUrl for local (offline) H5P content', async () => {
      const metadata = {
        identifier: 'do_h5p_local',
        name: 'H5P Local',
        artifactUrl: 'artifact.zip',
        mimeType: 'application/vnd.ekstep.h5p-archive',
        status: 'Live',
        streamingUrl: 'https://localhost/_capacitor_file_/data/content/do_h5p_local',
        isAvailableLocally: true,
        basePath: 'https://localhost/_capacitor_file_/data/content/do_h5p_local/',
      };
      const result = await service.createConfig(metadata);
      // Local content should NOT get the online rewrite
      expect(result.metadata.streamingUrl).not.toContain('/assets/public/content/');
    });
  });

  describe('YouTube origin context', () => {
    it('sets context.origin from base_url for YouTube content', async () => {
      const metadata = {
        identifier: 'do_yt',
        name: 'YouTube Test',
        artifactUrl: 'https://youtube.com/watch?v=abc',
        mimeType: 'video/x-youtube',
      };
      const result = await service.createConfig(metadata);
      expect(result.context.origin).toBe('https://test.sunbirded.org');
    });

    it('does not set origin for non-YouTube content', async () => {
      const metadata = {
        identifier: 'do_pdf',
        name: 'PDF Test',
        artifactUrl: 'doc.pdf',
        mimeType: 'application/pdf',
      };
      const result = await service.createConfig(metadata);
      // origin is only set for YouTube mimeType
      expect(result.context.origin).toBeUndefined();
    });

    it('handles NativeConfigService failure gracefully for YouTube', async () => {
      mockLoad.mockRejectedValue(new Error('native read failed'));
      const metadata = {
        identifier: 'do_yt2',
        name: 'YouTube Test 2',
        artifactUrl: 'https://youtube.com/watch?v=def',
        mimeType: 'video/x-youtube',
      };
      // Should not throw even when NativeConfigService fails
      const result = await service.createConfig(metadata);
      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
    });
  });

  describe('offline configuration', () => {
    it('sets host and baseURL to basePath for local content', async () => {
      const metadata = {
        identifier: 'do_local',
        name: 'Local ECML',
        artifactUrl: 'artifact.zip',
        mimeType: 'application/vnd.ekstep.ecml-archive',
        isAvailableLocally: true,
        basePath: 'https://localhost/_capacitor_file_/data/content/do_local/',
      };
      const result = await service.createConfig(metadata);
      expect(result.config.host).toBe('https://localhost/_capacitor_file_/data/content/do_local/');
      expect(result.config.baseURL).toBe('https://localhost/_capacitor_file_/data/content/do_local/');
    });

    it('includes coreplugins in repos', async () => {
      const metadata = {
        identifier: 'do_local2',
        name: 'Local Content',
        artifactUrl: 'artifact.zip',
        mimeType: 'application/vnd.ekstep.ecml-archive',
      };
      const result = await service.createConfig(metadata);
      expect(result.config.repos).toContain('/content-player/coreplugins');
    });
  });

  describe('buildPlayerUrl', () => {
    it('returns the preview URL', () => {
      expect(service.buildPlayerUrl()).toBe('/content-player/preview.html?webview=true');
    });
  });
});
