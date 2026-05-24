/** RGB colour components in the range [0, 1]. */
export type RgbColor = [number, number, number];

/** PDF annotation subtypes supported by this package. */
export type AnnotSubtype =
  | 'Ink'
  | 'FreeText'
  | 'Line'
  | 'PolyLine'
  | 'Polygon'
  | 'Circle'
  | 'Square'
  | 'Highlight';

/** /IT intent values recognised by Bluebeam and Acrobat. */
export type AnnotIntent =
  | 'FreeTextCallout'
  | 'FreeTextTypeWriter'
  | 'LineDimension'
  | 'LineArrow'
  | 'PolygonCloud'
  | 'PolyLineDimension';

/**
 * A single annotation in PDF coordinate space (origin bottom-left, Y up).
 * Use svgPointsToPdf() to convert from canvas/SVG space before embedding.
 */
export interface PdfAnnotation {
  id: string;
  subtype: AnnotSubtype;
  /** [llx, lly, urx, ury] in PDF points */
  rect: [number, number, number, number];
  color: RgbColor;
  fillColor?: RgbColor;
  strokeWidth: number;
  opacity?: number;
  author: string;
  /** ISO-8601 string, converted to PDF date format internally */
  modDate: string;
  contents?: string;
  /** Ink strokes: one [x,y,x,y,...] array per stroke */
  inkList?: number[][];
  /** Polygon / PolyLine vertices as flat [x,y,...] */
  vertices?: number[];
  /** Line endpoints [x1,y1,x2,y2] */
  line?: [number, number, number, number];
  /** FreeText callout leader points */
  calloutLine?: number[];
  intent?: AnnotIntent;
  cloudEffect?: boolean;
  /** Cloud arc intensity 0–2, default 1 */
  cloudIntensity?: number;
  fontSize?: number;
  fontColor?: RgbColor;
  richText?: string;
  defaultStyle?: string;
  lineEndings?: [string, string];
  quadPoints?: number[];
}

export interface EmbedOptions {
  /** 0-based page index, default 0 */
  pageIndex?: number;
  creatorTool?: string;
}

export interface CoordConvertOptions {
  naturalWidth: number;
  naturalHeight: number;
  pdfWidth: number;
  pdfHeight: number;
}
