import { PDFDocument, PDFRef } from 'pdf-lib';
import type { PdfAnnotation } from './types.js';
/** Build a PDF annotation dict with AP stream and register it. */
export declare function buildAnnotDict(pdfDoc: PDFDocument, pageRef: PDFRef | null, ann: PdfAnnotation, creatorTool: string): PDFRef;
/** Embed annotations into a PDF page. Resolves /Annots as direct array or indirect ref. */
export declare function embedAnnotations(pdfDoc: PDFDocument, annotations: PdfAnnotation[], pageIndex?: number, creatorTool?: string): Promise<PDFDocument>;
//# sourceMappingURL=annotations.d.ts.map