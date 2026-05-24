/** Scale an SVG/canvas X coordinate to PDF point space. */
export function svgXToPdf(x, opts) {
    return (x / opts.naturalWidth) * opts.pdfWidth;
}
/**
 * Scale an SVG/canvas Y coordinate to PDF point space.
 * SVG origin is top-left (Y down); PDF origin is bottom-left (Y up).
 */
export function svgYToPdf(y, opts) {
    return opts.pdfHeight - (y / opts.naturalHeight) * opts.pdfHeight;
}
/** Convert a flat [x,y,...] array from SVG/canvas space to PDF points. */
export function svgPointsToPdf(pts, opts) {
    const out = [];
    for (let i = 0; i < pts.length; i += 2) {
        out.push(svgXToPdf(pts[i], opts), svgYToPdf(pts[i + 1], opts));
    }
    return out;
}
/** Convert a flat [x,y,...] array to a PDF bounding rect [llx,lly,urx,ury]. */
export function svgPointsToPdfRect(pts, opts, padding = 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
        const px = svgXToPdf(pts[i], opts);
        const py = svgYToPdf(pts[i + 1], opts);
        if (px < minX)
            minX = px;
        if (px > maxX)
            maxX = px;
        if (py < minY)
            minY = py;
        if (py > maxY)
            maxY = py;
    }
    return [minX - padding, minY - padding, maxX + padding, maxY + padding];
}
//# sourceMappingURL=coords.js.map