import type { PdfAnnotation } from './types.js';
/** Serialize annotations to a complete XFDF document string. */
export declare function toXfdf(annotations: PdfAnnotation[], pdfFilename?: string): string;
/** Parse an XFDF string back into PdfAnnotation[]. Requires browser DOMParser. */
export declare function fromXfdf(xfdf: string): PdfAnnotation[];
//# sourceMappingURL=xfdf.d.ts.map