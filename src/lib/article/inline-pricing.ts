// Where the phone copy of the Get Pricing module goes inside an article
// (Randy, Quote System v5.9). It is placed only between two complete
// top-level sections: directly before a top-level <h2> (never inside a list,
// table, figure, quote, details or other block, never between a heading and
// its content, never inside a paragraph), and only after the article has
// given some real information (MIN_TEXT characters of text before it). If no
// such boundary exists, it goes after the end of the article body (the
// conservative fallback). The Quick Answer and Key Points are outside the
// body, so they can never be interrupted. The article text is never changed:
// the body is only split in two.

const MIN_TEXT = 500;
const CONTAINERS = 'div|section|table|thead|tbody|ul|ol|li|dl|figure|figcaption|blockquote|details|aside|nav|form|picture|p';

/** [before, after] for the module, or [body, ''] for the end-of-article fallback. */
export function splitForInlinePricing(body: string): [string, string] {
  const tag = new RegExp(`<!--[\\s\\S]*?-->|<(/?)(${CONTAINERS}|h2)\\b[^>]*>`, 'gi');
  let depth = 0;
  for (const m of body.matchAll(tag)) {
    if (m[0].startsWith('<!--')) continue;
    const [, close, name] = m;
    const n = name.toLowerCase();
    if (n === 'h2') {
      if (!close && depth === 0) {
        const at = m.index ?? 0;
        const text = body.slice(0, at).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        // Not before the first section, and only after some useful text.
        if (/<h2\b/i.test(body.slice(0, at)) && text.length >= MIN_TEXT) return [body.slice(0, at), body.slice(at)];
      }
      continue;
    }
    depth += close ? -1 : 1;
    if (depth < 0) depth = 0;
  }
  return [body, ''];
}
