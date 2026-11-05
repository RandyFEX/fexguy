// Intrinsic width and height of a PNG, JPEG or SVG file (build time only), so
// the /free-quote/ logo wall can give every <img> its real width/height
// attributes (no layout shift) without an image library.
export function imageSize(buf: Buffer, name: string): { w: number; h: number } | null {
  if (name.endsWith('.svg')) {
    const head = buf.toString('utf8', 0, Math.min(buf.length, 4000));
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(head);
    if (vb) return { w: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) };
    const w = /\swidth\s*=\s*["']([\d.]+)/i.exec(head);
    const h = /\sheight\s*=\s*["']([\d.]+)/i.exec(head);
    return w && h ? { w: Math.round(Number(w[1])), h: Math.round(Number(h[1])) } : null;
  }
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}
