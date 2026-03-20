import { describe, it, expect } from 'vitest';
import {
  calculateContentProgress,
  progressToStatus,
  mergeSummary,
  type ConsumptionSummary,
} from './contentProgressCalculator';

describe('contentProgressCalculator', () => {
  describe('mergeSummary', () => {
    it('should merge array of single-key objects into one flat object', () => {
      const summary: ConsumptionSummary[] = [
        { progress: 100 },
        { totallength: 43 },
        { visitedlength: 30 },
      ];

      const result = mergeSummary(summary);

      expect(result).toEqual({ progress: 100, totallength: 43, visitedlength: 30 });
    });

    it('should return empty object for empty array', () => {
      expect(mergeSummary([])).toEqual({});
    });

    it('should return empty object for non-array input', () => {
      expect(mergeSummary(null as any)).toEqual({});
    });

    it('should handle single-element array', () => {
      const result = mergeSummary([{ progress: 50, visitedLength: 10 }]);

      expect(result).toEqual({ progress: 50, visitedLength: 10 });
    });

    it('should let later values overwrite earlier ones', () => {
      const result = mergeSummary([{ progress: 50 }, { progress: 80 }]);

      expect(result.progress).toBe(80);
    });
  });

  describe('calculateContentProgress', () => {
    describe('playback MIME types (video, PDF, EPUB)', () => {
      const videoMime = 'video/mp4';
      const pdfMime = 'application/pdf';

      it('should return 100 when endpageseen is true', () => {
        const result = calculateContentProgress(
          [{ progress: 10, endpageseen: true }],
          pdfMime,
        );

        expect(result).toBe(100);
      });

      it('should return 100 when visitedcontentend is true', () => {
        const result = calculateContentProgress(
          [{ progress: 10, visitedcontentend: true }],
          videoMime,
        );

        expect(result).toBe(100);
      });

      it('should return 100 when visitedLength/totalLength ratio > 20%', () => {
        const result = calculateContentProgress(
          [{ progress: 10, visitedlength: 25, totallength: 100 }],
          videoMime,
        );

        expect(result).toBe(100);
      });

      it('should return raw progress when ratio <= 20% and no end flags', () => {
        const result = calculateContentProgress(
          [{ progress: 15, visitedlength: 10, totallength: 100 }],
          videoMime,
        );

        expect(result).toBe(15);
      });

      it('should return raw progress when totalLength is 0', () => {
        const result = calculateContentProgress(
          [{ progress: 30, visitedlength: 10, totallength: 0 }],
          videoMime,
        );

        expect(result).toBe(30);
      });

      it('should handle video/x-youtube', () => {
        const result = calculateContentProgress(
          [{ progress: 50, visitedcontentend: true }],
          'video/x-youtube',
        );

        expect(result).toBe(100);
      });

      it('should handle video/webm', () => {
        const result = calculateContentProgress(
          [{ progress: 50, endpageseen: true }],
          'video/webm',
        );

        expect(result).toBe(100);
      });

      it('should handle application/epub', () => {
        const result = calculateContentProgress(
          [{ progress: 50, endpageseen: true }],
          'application/epub',
        );

        expect(result).toBe(100);
      });
    });

    describe('other MIME types (H5P, HTML archive)', () => {
      const h5pMime = 'application/vnd.ekstep.h5p-archive';
      const htmlMime = 'application/vnd.ekstep.html-archive';

      it('should return 100 when progress >= 0 for H5P', () => {
        const result = calculateContentProgress([{ progress: 0 }], h5pMime);

        expect(result).toBe(100);
      });

      it('should return 100 when progress > 0 for HTML archive', () => {
        const result = calculateContentProgress([{ progress: 50 }], htmlMime);

        expect(result).toBe(100);
      });

      it('should return 0 for negative progress', () => {
        const result = calculateContentProgress([{ progress: -1 }], h5pMime);

        expect(result).toBe(0);
      });
    });

    describe('assessment MIME types (QuML/ECML)', () => {
      const qumlMime = 'application/vnd.ekstep.ecml-archive';

      it('should return 100 when progress >= 100', () => {
        const result = calculateContentProgress([{ progress: 100 }], qumlMime);

        expect(result).toBe(100);
      });

      it('should return 100 when progress > 100', () => {
        const result = calculateContentProgress([{ progress: 150 }], qumlMime);

        expect(result).toBe(100);
      });

      it('should return 0 when progress < 100', () => {
        const result = calculateContentProgress([{ progress: 99 }], qumlMime);

        expect(result).toBe(0);
      });

      it('should return 0 when progress is 0', () => {
        const result = calculateContentProgress([{ progress: 0 }], qumlMime);

        expect(result).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for empty summary array', () => {
        expect(calculateContentProgress([], 'video/mp4')).toBe(0);
      });

      it('should return 0 for non-array input', () => {
        expect(calculateContentProgress(null as any, 'video/mp4')).toBe(0);
      });

      it('should return 0 when progress is undefined in summary', () => {
        expect(calculateContentProgress([{ totallength: 100 }], 'video/mp4')).toBe(0);
      });

      it('should handle NaN progress gracefully', () => {
        expect(calculateContentProgress([{ progress: 'abc' as any }], 'video/mp4')).toBe(0);
      });

      it('should handle camelCase visitedLength and totalLength', () => {
        const result = calculateContentProgress(
          [{ progress: 10, visitedLength: 25, totalLength: 100 }],
          'video/mp4',
        );

        expect(result).toBe(100);
      });
    });
  });

  describe('progressToStatus', () => {
    it('should return 2 (completed) when progress >= 100', () => {
      expect(progressToStatus(100)).toBe(2);
      expect(progressToStatus(150)).toBe(2);
    });

    it('should return 1 (in progress) when 0 < progress < 100', () => {
      expect(progressToStatus(1)).toBe(1);
      expect(progressToStatus(50)).toBe(1);
      expect(progressToStatus(99)).toBe(1);
    });

    it('should return 0 (not started) when progress is 0', () => {
      expect(progressToStatus(0)).toBe(0);
    });

    it('should return 0 for negative progress', () => {
      expect(progressToStatus(-10)).toBe(0);
    });
  });
});
