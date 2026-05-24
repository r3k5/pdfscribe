import type { PdfAnnotation, RgbColor } from './types.js';

function colorHex([r, g, b]: RgbColor): string {
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function attr(name: string, val: string | number | undefined): string {
  return val !== undefined ? ` ${name}="${val}"` : '';
}

function floatArr(arr: number[]): string {
  return arr.map(n => n.toFixed(3)).join(',');
}

function annToXfdf(ann: PdfAnnotation): string {
  const common = [
    attr('name', ann.id),
    attr('color', colorHex(ann.color)),
    attr('interior-color', ann.fillColor ? colorHex(ann.fillColor) : undefined),
    attr('width', ann.strokeWidth),
    attr('opacity', ann.opacity),
    attr('title', ann.author),
    attr('date', ann.modDate),
    attr('flags', 'print'),
    attr('page', '0'),
    ann.contents ? ` contents="${ann.contents.replace(/"/g, '&quot;')}"` : '',
    ann.intent ? attr('intent', ann.intent) : '',
  ].join('');

  const rect = ann.rect.join(',');

  switch (ann.subtype) {
    case 'Ink': {
      const gestures = (ann.inkList ?? [])
        .map(s => `<gesture>${floatArr(s)}</gesture>`)
        .join('');
      return `<ink${common} rect="${rect}"><inklist>${gestures}</inklist></ink>`;
    }
    case 'FreeText': {
      const clAttr = ann.calloutLine ? attr('callout-line', floatArr(ann.calloutLine)) : '';
      const dsAttr = ann.defaultStyle ? ` defaultappearance="${ann.defaultStyle.replace(/"/g, '&quot;')}"` : '';
      return `<freetext${common}${clAttr}${dsAttr} rect="${rect}"><contents-richtext><body>${ann.richText ?? ann.contents ?? ''}</body></contents-richtext></freetext>`;
    }
    case 'Line': {
      const [x1, y1, x2, y2] = ann.line ?? [0, 0, 0, 0];
      const le = ann.lineEndings ?? ['None', 'None'];
      return `<line${common} start="${x1},${y1}" end="${x2},${y2}" head="${le[0]}" tail="${le[1]}" rect="${rect}"/>`;
    }
    case 'PolyLine':
      return `<polyline${common} vertices="${floatArr(ann.vertices ?? [])}" rect="${rect}"/>`;
    case 'Polygon': {
      const cloud = ann.cloudEffect ? ' cloudy="1"' : '';
      return `<polygon${common}${cloud} vertices="${floatArr(ann.vertices ?? [])}" rect="${rect}"/>`;
    }
    case 'Circle':
      return `<circle${common} rect="${rect}"/>`;
    case 'Square':
      return `<square${common} rect="${rect}"/>`;
    case 'Highlight': {
      const qp = ann.quadPoints ? floatArr(ann.quadPoints) : '';
      return `<highlight${common} rect="${rect}" coords="${qp}"/>`;
    }
  }
}

/** Serialize annotations to a complete XFDF document string. */
export function toXfdf(annotations: PdfAnnotation[], pdfFilename = ''): string {
  const body = annotations.map(annToXfdf).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
  <f href="${pdfFilename}"/>
  <annots>
  ${body}
  </annots>
</xfdf>`;
}

function parseColor(hex: string): RgbColor {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function parseFloats(s: string): number[] {
  return s.split(',').map(Number);
}

function gattr(el: Element, name: string): string {
  return el.getAttribute(name) ?? '';
}

function parseCommon(el: Element): Partial<PdfAnnotation> {
  const color = gattr(el, 'color');
  const ic    = gattr(el, 'interior-color');
  const rect  = gattr(el, 'rect');
  return {
    id:          gattr(el, 'name') || crypto.randomUUID(),
    color:       color ? parseColor(color) : [0, 0, 0],
    fillColor:   ic ? parseColor(ic) : undefined,
    strokeWidth: Number(gattr(el, 'width') || '1'),
    opacity:     gattr(el, 'opacity') ? Number(gattr(el, 'opacity')) : undefined,
    author:      gattr(el, 'title') || 'Unknown',
    modDate:     gattr(el, 'date') || new Date().toISOString(),
    contents:    gattr(el, 'contents') || undefined,
    intent:      (gattr(el, 'intent') as PdfAnnotation['intent']) || undefined,
    rect:        rect ? (parseFloats(rect) as [number, number, number, number]) : [0, 0, 0, 0],
  };
}

function parseOne(el: Element): PdfAnnotation | null {
  const tag  = el.tagName.toLowerCase();
  const base = parseCommon(el);

  switch (tag) {
    case 'ink': {
      const gestures = Array.from(el.querySelectorAll('gesture')).map(g => parseFloats(g.textContent ?? ''));
      return { ...base, subtype: 'Ink', inkList: gestures } as PdfAnnotation;
    }
    case 'freetext': {
      const cl = gattr(el, 'callout-line');
      const rc = el.querySelector('body')?.textContent ?? base.contents ?? '';
      return { ...base, subtype: 'FreeText', calloutLine: cl ? parseFloats(cl) : undefined, richText: rc, defaultStyle: gattr(el, 'defaultappearance') || undefined } as PdfAnnotation;
    }
    case 'line': {
      const start = parseFloats(gattr(el, 'start'));
      const end   = parseFloats(gattr(el, 'end'));
      return { ...base, subtype: 'Line', line: [start[0], start[1], end[0], end[1]], lineEndings: [gattr(el, 'head') || 'None', gattr(el, 'tail') || 'None'] } as PdfAnnotation;
    }
    case 'polyline':
      return { ...base, subtype: 'PolyLine', vertices: parseFloats(gattr(el, 'vertices')) } as PdfAnnotation;
    case 'polygon':
      return { ...base, subtype: 'Polygon', vertices: parseFloats(gattr(el, 'vertices')), cloudEffect: gattr(el, 'cloudy') === '1' } as PdfAnnotation;
    case 'circle':
      return { ...base, subtype: 'Circle' } as PdfAnnotation;
    case 'square':
      return { ...base, subtype: 'Square' } as PdfAnnotation;
    case 'highlight': {
      const coords = gattr(el, 'coords');
      return { ...base, subtype: 'Highlight', quadPoints: coords ? parseFloats(coords) : undefined } as PdfAnnotation;
    }
    default:
      return null;
  }
}

/** Parse an XFDF string back into PdfAnnotation[]. Requires browser DOMParser. */
export function fromXfdf(xfdf: string): PdfAnnotation[] {
  const doc    = new DOMParser().parseFromString(xfdf, 'application/xml');
  const annots = doc.querySelector('annots');
  if (!annots) return [];
  return Array.from(annots.children).map(parseOne).filter((a): a is PdfAnnotation => a !== null);
}
