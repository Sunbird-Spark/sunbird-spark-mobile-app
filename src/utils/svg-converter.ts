import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import { Directory, Filesystem } from '@capacitor/filesystem';

export type CertificateFormat = 'png' | 'pdf';

const DEFAULT_WIDTH = 1060;
const DEFAULT_HEIGHT = 750;
const PDF_SCALE_FACTOR = 1.33;

const sanitizeSvg = (svgContent: string): string => {
  let template = svgContent.startsWith('data:image/svg+xml,')
    ? decodeURIComponent(svgContent.replace(/data:image\/svg\+xml,/, '')).replace(
        /<!--\s*[a-zA-Z0-9-]*\s*-->/g,
        ''
      )
    : svgContent;

  template = DOMPurify.sanitize(template, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['svg', 'path', 'rect', 'circle', 'text', 'g', 'defs', 'image', 'use'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

  return template;
};

const svgToPngBase64 = (
  svgContent: string,
  width: number,
  height: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.width = width;
    img.height = height;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        // Return base64 without the data URI prefix
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl.replace(/^data:image\/png;base64,/, ''));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render SVG as image'));
    };

    img.src = url;
  });
};

/**
 * Converts an SVG string to PNG or PDF and saves it to the device Documents folder.
 * Returns the saved file name.
 */
export const convertSvgAndSave = async (
  svgContent: string,
  fileName: string,
  format: CertificateFormat = 'pdf',
  width: number = DEFAULT_WIDTH,
  height: number = DEFAULT_HEIGHT
): Promise<string> => {
  const sanitized = sanitizeSvg(svgContent);
  const pngBase64 = await svgToPngBase64(sanitized, width, height);

  if (format === 'png') {
    const path = `${fileName}.png`;
    await Filesystem.writeFile({
      path,
      data: pngBase64,
      directory: Directory.Documents,
    });
    return path;
  }

  // PDF
  const pdfWidth = width / PDF_SCALE_FACTOR;
  const pdfHeight = height / PDF_SCALE_FACTOR;
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [pdfWidth, pdfHeight],
  });
  const pngDataUrl = `data:image/png;base64,${pngBase64}`;
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

  const pdfBase64 = pdf
    .output('datauristring')
    .replace(/^data:application\/pdf;base64,/, '');
  const path = `${fileName}.pdf`;
  await Filesystem.writeFile({
    path,
    data: pdfBase64,
    directory: Directory.Documents,
  });
  return path;
};
