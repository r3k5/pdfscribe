# @r3k5/pdfscribe

Embed PDF annotations into existing PDFs with proper `/AP` appearance streams. Annotations render correctly in browsers, Acrobat, and Bluebeam — not just in the PDF dictionary where most viewers ignore them.

Built on [pdf-lib](https://github.com/Hopding/pdf-lib). Includes XFDF import/export and SVG-to-PDF coordinate helpers for canvas-based drawing tools.

## Why

I was building a browser-based markup tool that needed to write annotations back into PDFs and have them open correctly in Bluebeam. Free libraries either skipped the `/AP` appearance stream (annotations invisible in Chrome's PDF viewer and certain Bluebeam modes), only handled form fields in XFDF rather than graphical annotations, or were commercial SDKs that would have required replacing the entire rendering stack.

## Installation

```bash
npm install @r3k5/pdfscribe pdf-lib
```

`pdf-lib` is a peer dependency.

## Quick start

```ts
import { embedToPdf, getPdfPageSize } from '@r3k5/pdfscribe';
import type { PdfAnnotation } from '@r3k5/pdfscribe';

const originalBytes = await fetch('/drawing.pdf').then(r => r.arrayBuffer());
const { width, height } = await getPdfPageSize(originalBytes);

const annotations: PdfAnnotation[] = [
  {
    id:          crypto.randomUUID(),
    subtype:     'Square',
    rect:        [100, 200, 300, 400],
    color:       [1, 0, 0],
    fillColor:   [1, 0.9, 0.9],
    strokeWidth: 2,
    opacity:     0.8,
    author:      'Jane Smith',
    modDate:     new Date().toISOString(),
    contents:    'Verify dimensions here',
  },
];

const resultBytes = await embedToPdf(originalBytes, annotations, { pageIndex: 0 });
```

## Canvas/SVG coordinates

Coordinates from canvas drawing tools (Konva, Fabric.js, etc.) use SVG space — origin top-left, Y down. PDF space is origin bottom-left, Y up. Use the conversion helpers before passing annotations to `embedToPdf`:

```ts
import { svgPointsToPdf, svgPointsToPdfRect } from '@r3k5/pdfscribe';

const opts = {
  naturalWidth:  canvas.width,
  naturalHeight: canvas.height,
  pdfWidth:      width,   // from getPdfPageSize()
  pdfHeight:     height,
};

const rect     = svgPointsToPdfRect([x1, y1, x2, y2], opts, 4);
const vertices = svgPointsToPdf([x1, y1, x2, y2, x3, y3], opts);
```

## XFDF

```ts
import { toXfdf, fromXfdf } from '@r3k5/pdfscribe';

const xfdf   = toXfdf(annotations, 'drawing.pdf');
const parsed = fromXfdf(xfdf);
```

## Annotation types

| Subtype | Notes |
|---|---|
| `Ink` | Freehand pen, multi-stroke |
| `FreeText` | Text box, callout, rich text |
| `Line` | Arrow heads, dimension intent |
| `PolyLine` | Open polygon, arrow chain |
| `Polygon` | Closed shape, fill, cloud effect |
| `Circle` | Ellipse, fill, bezier-accurate AP stream |
| `Square` | Rectangle, fill |
| `Highlight` | QuadPoints, multiply blend |

## Bluebeam

Cloud border effect (`cloudEffect`, `cloudIntensity`), `/IT` intent values (`PolygonCloud`, `FreeTextCallout`, `LineDimension`, `LineArrow`, `PolyLineDimension`), `/NM` UUID tracking, and `/CreatorTool` are all written correctly.

## API

**`embedToPdf(pdfBytes, annotations, opts?)`**
Embeds annotations and returns modified PDF bytes.

**`getPdfPageSize(pdfBytes, pageIndex?)`**
Returns `{ width, height }` in points for the given page.

**`embedAnnotations(pdfDoc, annotations, pageIndex?, creatorTool?)`**
Mutates a `PDFDocument` directly. Use this if you're already working with pdf-lib.

**`buildAnnotDict(pdfDoc, pageRef, annotation, creatorTool)`**
Builds and registers a single annotation dict, returns a `PDFRef`.

**`toXfdf(annotations, pdfFilename?)`** / **`fromXfdf(xfdf)`**
Serialize to / parse from XFDF. `fromXfdf` requires a browser `DOMParser`.

**`svgPointsToPdf(pts, opts)`** / **`svgPointsToPdfRect(pts, opts, padding?)`**
Convert flat `[x,y,...]` arrays from canvas space to PDF point space.

**`svgXToPdf(x, opts)`** / **`svgYToPdf(y, opts)`**
Single-axis conversion with Y-flip.

## License

MIT
