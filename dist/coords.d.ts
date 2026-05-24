import type { CoordConvertOptions } from './types.js';
/** Scale an SVG/canvas X coordinate to PDF point space. */
export declare function svgXToPdf(x: number, opts: CoordConvertOptions): number;
/**
 * Scale an SVG/canvas Y coordinate to PDF point space.
 * SVG origin is top-left (Y down); PDF origin is bottom-left (Y up).
 */
export declare function svgYToPdf(y: number, opts: CoordConvertOptions): number;
/** Convert a flat [x,y,...] array from SVG/canvas space to PDF points. */
export declare function svgPointsToPdf(pts: number[], opts: CoordConvertOptions): number[];
/** Convert a flat [x,y,...] array to a PDF bounding rect [llx,lly,urx,ury]. */
export declare function svgPointsToPdfRect(pts: number[], opts: CoordConvertOptions, padding?: number): [number, number, number, number];
//# sourceMappingURL=coords.d.ts.map