// Splits a content-layout editorial article (src/config/content-articles.ts)
// into the pieces ContentLayout renders around the shared article components:
// the H1, then the byline, the page's own summary (Quick Answer, Key Points),
// the table of contents and the rest of the body. Section H2s without an id get
// one (as on the article template) so the table of contents can link to them.
// No text is added, removed or reordered.
import { htmlToText, slugify, type TocItem } from './enhance';

export interface ContentArticleParts {
  /** Everything up to and including the H1. */
  head: string;
  /** From the H1 to the end of the summary block (or nothing). */
  summary: string;
  /** The rest of the body. */
  rest: string;
  /** The section H2s, for the shared table of contents. */
  toc: TocItem[];
  /** The page has its own table of contents (data-article-part="toc"). */
  ownToc: boolean;
}

export function splitContentArticle(html: string): ContentArticleParts {
  const h1End = html.indexOf('</h1>');
  if (h1End < 0) throw new Error('content article without an <h1>');
  const head = html.slice(0, h1End + 5);
  let body = html.slice(h1End + 5);

  const used = new Set([...body.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]));
  const toc: TocItem[] = [];
  body = body.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (match, attrs: string, inner: string) => {
    if (/class="[^"]*summary__label/.test(attrs)) return match;
    const text = htmlToText(inner);
    if (!text) return match;
    const own = attrs.match(/\sid="([^"]*)"/)?.[1];
    if (own) {
      toc.push({ id: htmlToText(own), text });
      return match;
    }
    let id = slugify(text) || 'section';
    for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
    used.add(id);
    toc.push({ id, text });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  const summaryEnd = body.match(/<div class="summary"[^>]*>[\s\S]*?<\/section>\s*<\/div>/);
  const cut = summaryEnd ? (summaryEnd.index ?? 0) + summaryEnd[0].length : 0;
  return {
    head,
    summary: body.slice(0, cut),
    rest: body.slice(cut),
    toc,
    ownToc: /data-article-part="toc"/.test(body),
  };
}
