/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertSvgAndSave } from './svg-converter';
import { Directory, Filesystem } from '@capacitor/filesystem';

const { mockAddImage, mockOutput, mockPdfCtor } = vi.hoisted(() => ({
  mockAddImage: vi.fn(),
  mockOutput: vi.fn(),
  mockPdfCtor: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage = mockAddImage;
    output = mockOutput;
    constructor(options: unknown) {
      mockPdfCtor(options);
    }
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Documents: 'DOCUMENTS' },
}));

/**
 * jsdom's Blob has no `text()`, so the constructor is stubbed to keep the parts
 * addressable — this is how the sanitised SVG is inspected.
 */
class FakeBlob {
  readonly parts: string[];
  readonly type: string;

  constructor(parts: unknown[], options: { type?: string } = {}) {
    this.parts = parts.map((p) => String(p));
    this.type = options.type ?? '';
  }

  text(): string {
    return this.parts.join('');
  }
}

const blobs: FakeBlob[] = [];
const revokeObjectURL = vi.fn();
let imageBehaviour: 'load' | 'error' = 'load';

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  private _src = '';

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (imageBehaviour === 'error') this.onerror?.();
      else this.onload?.();
    });
  }
}

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

const sanitisedSvg = (): string => {
  expect(blobs).toHaveLength(1);
  return blobs[0].text();
};

describe('svg-converter', () => {
  let drawImage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    blobs.length = 0;
    imageBehaviour = 'load';

    URL.createObjectURL = vi.fn((blob: FakeBlob) => {
      blobs.push(blob);
      return 'blob:mock-url';
    }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    vi.stubGlobal('Image', FakeImage);
    vi.stubGlobal('Blob', FakeBlob);

    drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,PNGDATA'
    );

    mockOutput.mockReturnValue('data:application/pdf;filename=out.pdf;base64,PDFDATA');
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///doc' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  // ── sanitisation ───────────────────────────────────────────────────────────

  describe('SVG sanitisation', () => {
    it('preserves ordinary SVG markup', async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
        '<g><rect x="1" y="2" width="3" height="4"></rect>' +
        '<circle cx="5" cy="5" r="2"></circle>' +
        '<path d="M0 0 L10 10"></path>' +
        '<text x="1" y="1">Certificate</text></g></svg>';

      await convertSvgAndSave(svg, 'cert', 'png');

      const out = sanitisedSvg();
      expect(out).toContain('<svg');
      expect(out).toContain('<rect');
      expect(out).toContain('<circle');
      expect(out).toContain('<path');
      expect(out).toContain('Certificate');
      expect(out).toContain('d="M0 0 L10 10"');
    });

    it('preserves SVG filter elements (svgFilters profile)', async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<defs><filter id="blur"><feGaussianBlur stdDeviation="2"></feGaussianBlur></filter></defs>' +
        '<rect width="1" height="1"></rect></svg>';

      await convertSvgAndSave(svg, 'cert', 'png');

      const out = sanitisedSvg();
      expect(out).toContain('<filter');
      expect(out.toLowerCase()).toContain('fegaussianblur');
    });

    it('strips a <script> element embedded in the SVG', async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<script>alert(1)</script>' +
        '<rect width="1" height="1"></rect></svg>';

      await convertSvgAndSave(svg, 'cert', 'png');

      const out = sanitisedSvg();
      expect(out).not.toContain('<script');
      expect(out).not.toContain('alert(1)');
      expect(out).toContain('<rect');
    });

    it('strips inline event handler attributes', async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="1" height="1" onload="steal()" onclick="steal()" onmouseover="steal()"></rect>' +
        '<image href="x.png" onerror="steal()"></image></svg>';

      await convertSvgAndSave(svg, 'cert', 'png');

      const out = sanitisedSvg();
      expect(out).not.toContain('onload');
      expect(out).not.toContain('onclick');
      expect(out).not.toContain('onmouseover');
      expect(out).not.toContain('onerror');
      expect(out).not.toContain('steal()');
      // the elements themselves survive — only the handlers are removed
      expect(out).toContain('<rect');
      expect(out).toContain('width="1"');
    });

    it('strips forbidden embedding tags', async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<foreignObject><iframe src="http://evil.test"></iframe></foreignObject>' +
        '<rect width="1" height="1"></rect></svg>';

      await convertSvgAndSave(svg, 'cert', 'png');

      const out = sanitisedSvg();
      expect(out).not.toContain('<iframe');
      expect(out).not.toContain('evil.test');
      expect(out).toContain('<rect');
    });

    it('decodes a data:image/svg+xml URI and removes template comments', async () => {
      const inner =
        '<svg xmlns="http://www.w3.org/2000/svg"><!-- recipientName --><text>Ada</text></svg>';
      const dataUri = `data:image/svg+xml,${encodeURIComponent(inner)}`;

      await convertSvgAndSave(dataUri, 'cert', 'png');

      const out = sanitisedSvg();
      expect(out).toContain('Ada');
      expect(out).not.toContain('recipientName');
      expect(out).not.toContain('data:image/svg+xml');
    });

    it('leaves a plain SVG string undecoded', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>100%20percent</text></svg>';
      await convertSvgAndSave(svg, 'cert', 'png');
      expect(sanitisedSvg()).toContain('100%20percent');
    });

    it('creates the blob with the SVG mime type', async () => {
      await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'cert', 'png');
      expect(blobs[0].type).toBe('image/svg+xml;charset=utf-8');
    });
  });

  // ── PNG output ─────────────────────────────────────────────────────────────

  describe('PNG output', () => {
    it('writes the base64 PNG without the data URI prefix to Documents', async () => {
      const path = await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'my-cert', 'png');

      expect(path).toBe('my-cert.png');
      expect(Filesystem.writeFile).toHaveBeenCalledWith({
        path: 'my-cert.png',
        data: 'PNGDATA',
        directory: Directory.Documents,
      });
      expect(mockPdfCtor).not.toHaveBeenCalled();
    });

    it('uses the default 1060x750 canvas size', async () => {
      const setWidth = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
      await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c', 'png');

      expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1060, 750);
      expect(setWidth).toHaveBeenCalledWith('image/png');
    });

    it('honours custom width and height', async () => {
      await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c', 'png', 200, 100);
      expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 200, 100);
    });

    it('revokes the object URL after a successful render', async () => {
      await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c', 'png');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  // ── PDF output ─────────────────────────────────────────────────────────────

  describe('PDF output', () => {
    it('defaults to PDF and scales the page down by 1.33', async () => {
      const path = await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'my-cert');

      expect(path).toBe('my-cert.pdf');
      expect(mockPdfCtor).toHaveBeenCalledWith({
        orientation: 'landscape',
        unit: 'pt',
        format: [1060 / 1.33, 750 / 1.33],
      });
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,PNGDATA',
        'PNG',
        0,
        0,
        1060 / 1.33,
        750 / 1.33
      );
      expect(Filesystem.writeFile).toHaveBeenCalledWith({
        path: 'my-cert.pdf',
        data: 'PDFDATA',
        directory: Directory.Documents,
      });
    });

    it('writes the whole output string when jsPDF returns no comma-delimited prefix', async () => {
      mockOutput.mockReturnValue('RAWPDFSTRING');
      await convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c');
      expect(vi.mocked(Filesystem.writeFile).mock.calls[0][0].data).toBe('RAWPDFSTRING');
    });

    it('propagates a filesystem write failure', async () => {
      vi.mocked(Filesystem.writeFile).mockRejectedValue(new Error('no space'));
      await expect(
        convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c')
      ).rejects.toThrow('no space');
    });
  });

  // ── render failures ────────────────────────────────────────────────────────

  describe('render failures', () => {
    it('rejects and revokes the URL when the image fails to load', async () => {
      imageBehaviour = 'error';
      await expect(
        convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c', 'png')
      ).rejects.toThrow('Failed to render SVG as image');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(Filesystem.writeFile).not.toHaveBeenCalled();
    });

    it('rejects when the canvas 2d context is unavailable', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      await expect(
        convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c', 'png')
      ).rejects.toThrow('Could not get canvas context');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('rejects with the underlying error when drawing throws', async () => {
      drawImage.mockImplementation(() => {
        throw new Error('tainted canvas');
      });
      await expect(
        convertSvgAndSave('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'c', 'png')
      ).rejects.toThrow('tainted canvas');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
