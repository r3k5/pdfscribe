import {
  PDFDocument,
  PDFName,
  PDFString,
  PDFArray,
  PDFNumber,
  PDFDict,
  PDFRef,
  PDFContext,
} from 'pdf-lib';
import type { PdfAnnotation } from './types.js';
import { isoToPdfDate } from './dateutil.js';

const f = (n: number) => n.toFixed(3);

function escapePdfStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildDA(ann: PdfAnnotation): string {
  const [r, g, b] = ann.fontColor ?? ann.color;
  return `/Helv ${ann.fontSize ?? 10} Tf ${f(r)} ${f(g)} ${f(b)} rg`;
}

function buildFontResources(ctx: PDFContext): PDFDict {
  const fontDict = ctx.obj({
    Type: PDFName.of('Font'), Subtype: PDFName.of('Type1'),
    BaseFont: PDFName.of('Helvetica'), Encoding: PDFName.of('WinAnsiEncoding'),
  }) as PDFDict;
  return ctx.obj({ Font: ctx.obj({ Helv: ctx.register(fontDict) }) }) as PDFDict;
}

function buildAppearanceStream(ctx: PDFContext, ann: PdfAnnotation): PDFRef | null {
  const [r, g, b] = ann.color;
  const sw = ann.strokeWidth;
  const [llx, lly, urx, ury] = ann.rect;

  const ops: string[] = [];
  const push = (...s: string[]) => ops.push(...s);

  push('q');
  push(`${f(r)} ${f(g)} ${f(b)} RG`);
  push(`${f(sw)} w`, '1 J', '1 j');

  switch (ann.subtype) {
    case 'Ink': {
      for (const stroke of ann.inkList ?? []) {
        if (stroke.length < 4) continue;
        push(`${f(stroke[0])} ${f(stroke[1])} m`);
        for (let i = 2; i < stroke.length - 2; i += 2) push(`${f(stroke[i])} ${f(stroke[i + 1])} l`);
        push('S');
      }
      break;
    }

    case 'Circle': {
      const k = 0.5523;
      const p = sw / 2;
      const cx = (llx + urx) / 2, cy = (lly + ury) / 2;
      const rx = (urx - llx) / 2 - p, ry = (ury - lly) / 2 - p;
      if (rx <= 0 || ry <= 0) return null;
      push(`${f(cx - rx)} ${f(cy)} m`);
      push(`${f(cx - rx)} ${f(cy + ry * k)} ${f(cx - rx * k)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)} c`);
      push(`${f(cx + rx * k)} ${f(cy + ry)} ${f(cx + rx)} ${f(cy + ry * k)} ${f(cx + rx)} ${f(cy)} c`);
      push(`${f(cx + rx)} ${f(cy - ry * k)} ${f(cx + rx * k)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)} c`);
      push(`${f(cx - rx * k)} ${f(cy - ry)} ${f(cx - rx)} ${f(cy - ry * k)} ${f(cx - rx)} ${f(cy)} c`);
      if (ann.fillColor) { const [ir, ig, ib] = ann.fillColor; push(`${f(ir)} ${f(ig)} ${f(ib)} rg`, 'h B'); }
      else push('h S');
      break;
    }

    case 'Square': {
      const p = sw / 2;
      if (ann.fillColor) { const [ir, ig, ib] = ann.fillColor; push(`${f(ir)} ${f(ig)} ${f(ib)} rg`); }
      push(`${f(llx + p)} ${f(lly + p)} ${f(urx - llx - sw)} ${f(ury - lly - sw)} re ${ann.fillColor ? 'B' : 'S'}`);
      break;
    }

    case 'Polygon': {
      const verts = ann.vertices ?? [];
      if (verts.length < 6) return null;
      if (ann.fillColor) { const [ir, ig, ib] = ann.fillColor; push(`${f(ir)} ${f(ig)} ${f(ib)} rg`); }
      push(`${f(verts[0])} ${f(verts[1])} m`);
      for (let i = 2; i < verts.length; i += 2) push(`${f(verts[i])} ${f(verts[i + 1])} l`);
      push(ann.fillColor ? 'h B' : 'h S');
      break;
    }

    case 'PolyLine': {
      const verts = ann.vertices ?? [];
      if (verts.length < 4) return null;
      push(`${f(verts[0])} ${f(verts[1])} m`);
      for (let i = 2; i < verts.length; i += 2) push(`${f(verts[i])} ${f(verts[i + 1])} l`);
      push('S');
      break;
    }

    case 'Line': {
      const [x1, y1, x2, y2] = ann.line ?? [llx, lly, urx, ury];
      push(`${f(x1)} ${f(y1)} m`, `${f(x2)} ${f(y2)} l`, 'S');
      break;
    }

    case 'FreeText': {
      const text = ann.contents ?? '';
      if (!text.trim()) return null;
      const fs = ann.fontSize ?? 10;
      const [tr, tg, tb] = ann.fontColor ?? ann.color;
      const lines = text.split('\n');
      const textOps = ['q', 'BT', `/Helv ${f(fs)} Tf`, `${f(tr)} ${f(tg)} ${f(tb)} rg`, `${f(llx + 2)} ${f(ury - fs * 1.05)} Td`];
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) textOps.push(`0 ${f(-fs * 1.4)} Td`);
        textOps.push(`(${escapePdfStr(lines[i])}) Tj`);
      }
      textOps.push('ET', 'Q');
      const pad = 4;
      const streamObj = ctx.stream(new TextEncoder().encode(textOps.join('\n')), {
        Type: PDFName.of('XObject'), Subtype: PDFName.of('Form'),
        BBox: ctx.obj([llx - pad, lly - pad, urx + pad, ury + pad].map(PDFNumber.of)),
        Resources: buildFontResources(ctx),
      });
      return ctx.register(streamObj);
    }

    case 'Highlight': {
      ops.length = 0;
      push('q', '/GS1 gs');
      const [hr, hg, hb] = ann.color;
      push(`${f(hr)} ${f(hg)} ${f(hb)} rg`);
      const qp = ann.quadPoints ?? [llx, lly, urx, lly, urx, ury, llx, ury];
      for (let i = 0; i < qp.length; i += 8) {
        const pts = qp.slice(i, i + 8);
        if (pts.length < 8) break;
        const [x1, y1, x2, y2, x3, y3, x4, y4] = pts;
        push(`${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l ${f(x4)} ${f(y4)} l ${f(x3)} ${f(y3)} l h f`);
      }
      push('Q');
      const opacity = ann.opacity ?? 0.35;
      const gsRef = ctx.register(ctx.obj({ Type: PDFName.of('ExtGState'), ca: PDFNumber.of(opacity), CA: PDFNumber.of(opacity), BM: PDFName.of('Multiply') }) as PDFDict);
      const pad = sw + 2;
      const streamObj = ctx.stream(new TextEncoder().encode(ops.join('\n')), {
        Type: PDFName.of('XObject'), Subtype: PDFName.of('Form'),
        BBox: ctx.obj([llx - pad, lly - pad, urx + pad, ury + pad].map(PDFNumber.of)),
        Resources: ctx.obj({ ExtGState: ctx.obj({ GS1: gsRef }) }) as PDFDict,
      });
      return ctx.register(streamObj);
    }

    default:
      return null;
  }

  push('Q');
  const pad = sw + 2;
  const streamObj = ctx.stream(new TextEncoder().encode(ops.join('\n')), {
    Type: PDFName.of('XObject'), Subtype: PDFName.of('Form'),
    BBox: ctx.obj([llx - pad, lly - pad, urx + pad, ury + pad].map(PDFNumber.of)),
  });
  return ctx.register(streamObj);
}

/** Build a PDF annotation dict with AP stream and register it. */
export function buildAnnotDict(
  pdfDoc: PDFDocument,
  pageRef: PDFRef | null,
  ann: PdfAnnotation,
  creatorTool: string,
): PDFRef {
  const ctx = pdfDoc.context;
  const [r, g, b] = ann.color;
  const modDate = isoToPdfDate(ann.modDate);

  const dict = ctx.obj({
    Type: PDFName.of('Annot'), Subtype: PDFName.of(ann.subtype),
    NM: PDFString.of(ann.id),
    Rect: ctx.obj(ann.rect.map(PDFNumber.of)),
    C: ctx.obj([r, g, b].map(PDFNumber.of)),
    BS: ctx.obj({ W: PDFNumber.of(ann.strokeWidth), S: PDFName.of('S') }),
    T: PDFString.of(ann.author),
    M: PDFString.of(modDate),
    CreationDate: PDFString.of(modDate),
    F: PDFNumber.of(4),
  }) as PDFDict;

  if (pageRef) dict.set(PDFName.of('P'), pageRef);
  dict.set(PDFName.of('CreatorTool'), PDFString.of(creatorTool));
  if (ann.contents) dict.set(PDFName.of('Contents'), PDFString.of(ann.contents));
  if (ann.opacity !== undefined && ann.opacity < 1) dict.set(PDFName.of('CA'), PDFNumber.of(ann.opacity));
  if (ann.intent) dict.set(PDFName.of('IT'), PDFName.of(ann.intent));
  if (ann.cloudEffect) {
    dict.set(PDFName.of('BE'), ctx.obj({ S: PDFName.of('C'), I: PDFNumber.of(ann.cloudIntensity ?? 1) }));
  }

  switch (ann.subtype) {
    case 'Ink': {
      const inkList = PDFArray.withContext(ctx);
      for (const stroke of ann.inkList ?? []) {
        const arr = PDFArray.withContext(ctx);
        for (const n of stroke) arr.push(PDFNumber.of(n));
        inkList.push(arr);
      }
      dict.set(PDFName.of('InkList'), inkList);
      break;
    }

    case 'FreeText': {
      dict.set(PDFName.of('DA'), PDFString.of(buildDA(ann)));
      if (ann.richText)     dict.set(PDFName.of('RC'), PDFString.of(ann.richText));
      if (ann.defaultStyle) dict.set(PDFName.of('DS'), PDFString.of(ann.defaultStyle));
      if (ann.calloutLine && ann.calloutLine.length >= 4) {
        const cl = PDFArray.withContext(ctx);
        for (const n of ann.calloutLine) cl.push(PDFNumber.of(n));
        dict.set(PDFName.of('CL'), cl);
        dict.set(PDFName.of('LE'), PDFName.of('OpenArrow'));
      }
      if (ann.fontColor) {
        const [fr, fg, fb] = ann.fontColor;
        dict.set(PDFName.of('FC'), ctx.obj([fr, fg, fb].map(PDFNumber.of)));
      }
      if (ann.fillColor) {
        const [ir, ig, ib] = ann.fillColor;
        dict.set(PDFName.of('IC'), ctx.obj([ir, ig, ib].map(PDFNumber.of)));
      } else {
        dict.set(PDFName.of('IC'), PDFArray.withContext(ctx));
        dict.set(PDFName.of('BS'), ctx.obj({ W: PDFNumber.of(0), S: PDFName.of('S') }));
        dict.set(PDFName.of('C'), PDFArray.withContext(ctx));
      }
      break;
    }

    case 'Line': {
      if (ann.line) dict.set(PDFName.of('L'), ctx.obj(ann.line.map(PDFNumber.of)));
      if (ann.lineEndings) dict.set(PDFName.of('LE'), ctx.obj(ann.lineEndings.map(PDFName.of)));
      if (ann.intent === 'LineDimension') {
        dict.set(PDFName.of('LL'), PDFNumber.of(0));
        dict.set(PDFName.of('LLE'), PDFNumber.of(0));
        dict.set(PDFName.of('Cap'), PDFName.of('true'));
        dict.set(PDFName.of('CP'), PDFName.of('Inline'));
      }
      break;
    }

    case 'PolyLine':
    case 'Polygon': {
      if (ann.vertices) {
        const verts = PDFArray.withContext(ctx);
        for (const n of ann.vertices) verts.push(PDFNumber.of(n));
        dict.set(PDFName.of('Vertices'), verts);
      }
      if (ann.lineEndings) dict.set(PDFName.of('LE'), ctx.obj(ann.lineEndings.map(PDFName.of)));
      if (ann.fillColor && ann.subtype === 'Polygon') {
        const [ir, ig, ib] = ann.fillColor;
        dict.set(PDFName.of('IC'), ctx.obj([ir, ig, ib].map(PDFNumber.of)));
      }
      break;
    }

    case 'Circle':
    case 'Square': {
      if (ann.fillColor) {
        const [ir, ig, ib] = ann.fillColor;
        dict.set(PDFName.of('IC'), ctx.obj([ir, ig, ib].map(PDFNumber.of)));
      }
      const halfSw = ann.strokeWidth / 2;
      dict.set(PDFName.of('RD'), ctx.obj([halfSw, halfSw, halfSw, halfSw].map(PDFNumber.of)));
      break;
    }

    case 'Highlight': {
      if (ann.quadPoints) {
        const qp = PDFArray.withContext(ctx);
        for (const n of ann.quadPoints) qp.push(PDFNumber.of(n));
        dict.set(PDFName.of('QuadPoints'), qp);
      }
      dict.set(PDFName.of('CA'), PDFNumber.of(ann.opacity ?? 0.5));
      break;
    }
  }

  const apRef = buildAppearanceStream(ctx, ann);
  if (apRef) dict.set(PDFName.of('AP'), ctx.obj({ N: apRef }) as PDFDict);

  return ctx.register(dict);
}

/** Embed annotations into a PDF page. Resolves /Annots as direct array or indirect ref. */
export async function embedAnnotations(
  pdfDoc: PDFDocument,
  annotations: PdfAnnotation[],
  pageIndex = 0,
  creatorTool = '@r3k5/pdfscribe',
): Promise<PDFDocument> {
  const ctx     = pdfDoc.context;
  const page    = pdfDoc.getPage(pageIndex);
  const pageRef = page.ref as PDFRef;

  const annotsVal = page.node.get(PDFName.of('Annots'));
  let annotsArray: PDFArray;

  if (!annotsVal) {
    annotsArray = PDFArray.withContext(ctx);
    page.node.set(PDFName.of('Annots'), annotsArray);
  } else if (annotsVal instanceof PDFRef) {
    const resolved = ctx.lookup(annotsVal);
    annotsArray = resolved instanceof PDFArray ? resolved : PDFArray.withContext(ctx);
    if (!(resolved instanceof PDFArray)) page.node.set(PDFName.of('Annots'), annotsArray);
  } else if (annotsVal instanceof PDFArray) {
    annotsArray = annotsVal;
  } else {
    annotsArray = PDFArray.withContext(ctx);
    page.node.set(PDFName.of('Annots'), annotsArray);
  }

  for (const ann of annotations) {
    annotsArray.push(buildAnnotDict(pdfDoc, pageRef, ann, creatorTool));
  }

  return pdfDoc;
}
