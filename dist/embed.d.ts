import type { PdfAnnotation, EmbedOptions } from './types.js';
/**
 * Load a PDF, embed annotations, and return the modified bytes.
 *
 * @param pdfBytes    - Original PDF as ArrayBuffer or Uint8Array.
 * @param annotations - Annotations in PDF coordinate space (use svgPointsToPdf to convert).
 * @param opts        - Optional page index and creator tool string.
 */
export declare function embedToPdf(pdfBytes: ArrayBuffer | Uint8Array, annotations: PdfAnnotation[], opts?: EmbedOptions): Promise<Uint8Array>;
/** Get PDF page dimensions in points. Pass the result as pdfWidth/pdfHeight in CoordConvertOptions. */
export declare function getPdfPageSize(pdfBytes: ArrayBuffer | Uint8Array, pageIndex?: number): Promise<{
    width: number;
    height: number;
}>;
//# sourceMappingURL=embed.d.ts.map