import { PDFDocument } from 'pdf-lib';
import { embedAnnotations } from './annotations.js';
/**
 * Load a PDF, embed annotations, and return the modified bytes.
 *
 * @param pdfBytes    - Original PDF as ArrayBuffer or Uint8Array.
 * @param annotations - Annotations in PDF coordinate space (use svgPointsToPdf to convert).
 * @param opts        - Optional page index and creator tool string.
 */
export async function embedToPdf(pdfBytes, annotations, opts = {}) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    await embedAnnotations(pdfDoc, annotations, opts.pageIndex ?? 0, opts.creatorTool ?? '@r3k5/pdfscribe');
    return pdfDoc.save();
}
/** Get PDF page dimensions in points. Pass the result as pdfWidth/pdfHeight in CoordConvertOptions. */
export async function getPdfPageSize(pdfBytes, pageIndex = 0) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const { width, height } = pdfDoc.getPage(pageIndex).getSize();
    return { width, height };
}
//# sourceMappingURL=embed.js.map