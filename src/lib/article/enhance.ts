// Build-time presentation pass for the article-v2 PROTOTYPE (see
// prototype.ts). It reshapes the page's already-rendered HTML so the
// template can present it, without changing any of the article's words:
//  - the body's <h1> moves into the article header;
//  - the "Here's the Bottom Line:" paragraph (lines separated by <br> and
//    typed "•" characters) becomes a real list for the key-takeaways panel;
//  - each <h2> gets an id, and the list of H2s feeds the contents panel;
//  - the "Frequently Asked Questions…" section is grouped into question
//    items (each question stays an <h3>) for the FAQ styling;
//  - "…'s Story:" sections are grouped as asides (the case stories);
//  - migrated sentences that point at "the form on this page" get a quiet
//    note style, so the article doesn't read as a run of calls to action
//    (the page already has the quote form, the quote button and call bar).
// Pages that don't match a pattern simply skip that step.

export interface TocItem {
  id: string;
  text: string;
}

export interface EnhancedArticle {
  /** Inner HTML of the page's H1. */
  h1: string;
  /** "Here's the Bottom Line:" label and its lines (inner HTML), if present. */
  takeaways?: { label: string; items: string[] };
  /** The article body that follows the takeaways (before the first H2). */
  intro: string;
  /** Everything from the first H2 on. */
  body: string;
  toc: TocItem[];
}

const stripTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

export function enhanceArticle(html: string): EnhancedArticle {
  let rest = html.trim();

  // 1. H1
  let h1 = '';
  rest = rest.replace(/^<h1[^>]*>([\s\S]*?)<\/h1>\s*/, (_, inner: string) => {
    h1 = inner.trim();
    return '';
  });

  // 2. Bottom line / key takeaways (the first paragraph, if it is one).
  let takeaways: EnhancedArticle['takeaways'];
  rest = rest.replace(
    /^<p><strong>(Here[’']s the Bottom Line:?)<\/strong>([\s\S]*?)<\/p>\s*/,
    (_, label: string, lines: string) => {
      const items = lines
        .split(/<br\s*\/?>/)
        .map((l) => l.replace(/^\s*[•·]\s*/, '').trim())
        .filter(Boolean);
      takeaways = { label: label.trim(), items };
      return '';
    },
  );

  // 3. H2 ids + contents list.
  const used = new Set<string>();
  const toc: TocItem[] = [];
  rest = rest.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (match, attrs: string, inner: string) => {
    const text = stripTags(inner);
    if (!text) return match;
    let id = slugify(text) || 'section';
    for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
    used.add(id);
    toc.push({ id, text });
    return /\sid=/.test(attrs) ? match : `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  // 4. FAQ section: from the "Frequently Asked Questions" H2 to the next H2.
  rest = rest.replace(
    /(<h2[^>]*>\s*Frequently Asked Questions[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2|$)/i,
    (_, heading: string, section: string) => {
      const parts = section.split(/(?=<h3)/);
      const lead = parts[0].startsWith('<h3') ? '' : parts.shift() ?? '';
      const items = parts.map((p) => `<div class="article-faq__item">${p.trim()}</div>`).join('\n');
      return `<section class="article-faq">${heading}${lead}<div class="article-faq__list">${items}</div></section>\n`;
    },
  );

  // 5. Case stories: an H3 ending "'s Story:" (or "s' Story:") and the text
  //    after it, up to the next heading.
  rest = rest.replace(
    /(<h3[^>]*>[^<]*(?:[’']s|s[’']) Story:?<\/h3>)([\s\S]*?)(?=<h[23]|<\/section>|$)/g,
    (_, heading: string, story: string) => `<div class="art-story">${heading}${story.trim()}</div>\n`,
  );

  // 6. Calls to action written into the migrated text ("…form on this page…"):
  //    same words, quiet note style.
  rest = rest.replace(/<p>((?:(?!<\/p>)[\s\S])*?(?:quote request form|form on this page)(?:(?!<\/p>)[\s\S])*?)<\/p>/gi, (_, inner: string) =>
    `<p class="art-note">${inner.replace(/<\/?strong>/g, '')}</p>`,
  );

  // 7. Split the intro (before the first H2) from the body.
  const firstH2 = rest.search(/<h2/);
  const intro = firstH2 === -1 ? rest : rest.slice(0, firstH2);
  const body = firstH2 === -1 ? '' : rest.slice(firstH2);

  return { h1, takeaways, intro: intro.trim(), body: body.trim(), toc };
}
