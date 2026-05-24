/** Convert ISO-8601 to PDF date format: D:YYYYMMDDHHmmSSZ */
export function isoToPdfDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `D:${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Hex-encode a string as UTF-16-BE (BOM included). */
export function toUtf16Hex(str: string): string {
  const bytes: string[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 0;
    bytes.push(cp.toString(16).padStart(4, '0'));
  }
  return 'FEFF' + bytes.join('');
}
