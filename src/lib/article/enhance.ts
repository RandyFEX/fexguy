// Build-time presentation pass for the article template (ArticleLayout). It
// reshapes a page's already-rendered HTML so the template can present it,
// without changing any of the article's words. The Markdown source is never
// edited: legacy WordPress blocks the template replaces are only left out of
// the page it renders.
//
//  - the body's <h1> moves into the article header;
//  - legacy blocks the template replaces are left out: the pasted byline
//    (logo, "last updated", "Written by", "Verified"), the "TABLE OF CONTENTS"
//    table, the "About Final Expense Guy" bio, the "Keep Reading" list and the
//    in-article "GET … QUOTE(S)" buttons (the page already has the quote form,
//    the quote button and the call bar);
//  - "Here's the Bottom Line:" (lines separated by <br> and typed "•"
//    characters, in one paragraph or two, or a bold label paragraph followed
//    by a list, also labelled "The short version", or an opening "… key
//    takeaways" H2 with a list) becomes the key-points list;
//  - duplicate ids get a numeric suffix; each <h2> gets an id (or keeps its
//    own), and the H2s feed the contents panel;
//  - FAQ sections (question <h3>s or bold question paragraphs) are grouped
//    into items, and runs of <details> into one list;
//  - "…'s Story:" sections become asides; "PROS"/"CONS" lists become a pair;
//  - migrated sentences that point at "the form on this page" get a quiet
//    note style; the one-line "Complete my quote request form on this page…"
//    calls to action at the top (before the first H2) are left out (the
//    template's quote button and form replace them);
//  - the article's header illustration (the first figure, in the opening or
//    the first section, showing an /images/articles/ illustration or a 2026
//    "…Image" upload) moves out of the text into `feature`, which the
//    template shows above the contents panel;
//  - opening paragraphs a page's Quick Answer replaces (options.legacyIntro,
//    from src/config/article-intros.ts) are left out;
//  - hub pages (variant 'hub'): "✓"/"✘" link lines become grouped lists.
// Pages that don't match a pattern simply skip that step.

export interface TocItem {
  id: string;
  text: string;
}

export interface HubGroup {
  label: string;
  items: number;
}

/** What the pass found and did on a page (for audits; not rendered). */
export interface EnhanceReport {
  bottomLine: 'one paragraph' | 'two paragraphs' | 'list' | null;
  bottomLineNotes: string[];
  oldByline: boolean;
  oldToc: { links: string[]; missingTargets: string[] } | null;
  oldBio: boolean;
  keepReading: boolean;
  ctaButtons: string[];
  ctaNotes: number;
  faqAnswersKept: number;
  duplicateIds: string[];
  faq: 'headings' | 'paragraphs' | null;
  detailsLists: number;
  stories: number;
  prosCons: number;
  linkLists: number;
  hubGroups: HubGroup[];
  /** Migrated reader comments (div.comment) set aside and shown after the article. */
  comments: number;
  /** Opening "…quote request form…" one-liners left out. */
  introCtas: string[];
  /** src of the header illustration moved to `feature`, and where it was. */
  feature: { src: string; from: 'intro' | 'first section' } | null;
  /** options.legacyIntro openings left out, and any not found. */
  legacyIntro: { removed: string[]; missing: string[] };
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
  /** The header illustration (a <figure>), shown above the contents panel. */
  feature: string;
  toc: TocItem[];
  report: EnhanceReport;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Plain text of an HTML fragment (tags removed, entities decoded). */
export const htmlToText = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
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

// "Anything but the end of this element": keeps a match inside one block.
const IN_P = '(?:(?!<\\/p>)[\\s\\S])*?';

// The pasted WordPress byline, block by block (at the top of the body).
const BYLINE_PARTS: RegExp[] = [
  /^<p>\s*<picture>(?:(?!<\/picture>)[\s\S])*?alt="Final Expense Guy"(?:(?!<\/picture>)[\s\S])*?<\/picture>\s*<\/p>/,
  /^<p>\s*last updated on [^<]*<\/p>/i,
  new RegExp(`^<p>\\s*Written by ${IN_P}Randy VanderVaate${IN_P}<\\/p>`),
  new RegExp(`^<p>${IN_P}Licensed Agent${IN_P}Founder${IN_P}<\\/p>`),
  new RegExp(`^<p>\\s*✓ Verified ✓${IN_P}<\\/p>`),
];

// The opening call to action the template's quote button and form replace
// (the paragraph's whole text). One page's copy carries a leftover fragment of
// an older version of the line.
const INTRO_CTA =
  /^(?:Get a quote on this page by completing my quote request form now|Complete my quote request form on this page\b[^.]*)\.?(?: help you qualify for burial insurance with first-day coverage and no waiting period\.)?$/i;
// Header illustrations: the replacement illustrations and the 2026 WordPress
// header images ("…-Image….png", "Term-Life-Insurance.png").
const FEATURE_SRC = /src="\/(?:images\/articles\/[^"]+|wp-content\/uploads\/2026\/0[1-6]\/[^"]*(?:-Image|Term-Life-Insurance)[^"]*\.png)"/;

export function enhanceArticle(
  html: string,
  options: { variant?: 'article' | 'hub'; legacyIntro?: readonly string[] } = {},
): EnhancedArticle {
  const report: EnhanceReport = {
    bottomLine: null,
    bottomLineNotes: [],
    oldByline: false,
    oldToc: null,
    oldBio: false,
    keepReading: false,
    ctaButtons: [],
    ctaNotes: 0,
    faqAnswersKept: 0,
    duplicateIds: [],
    faq: null,
    detailsLists: 0,
    stories: 0,
    prosCons: 0,
    linkLists: 0,
    hubGroups: [],
    comments: 0,
    introCtas: [],
    feature: null,
    legacyIntro: { removed: [], missing: [] },
  };
  let rest = html.trim();

  // 1. H1
  let h1 = '';
  rest = rest.replace(/^<h1[^>]*>([\s\S]*?)<\/h1>\s*/, (_, inner: string) => {
    h1 = inner.trim();
    return '';
  });

  // 2. Old pasted byline: only when its "Written by" line is there.
  {
    let probe = rest;
    const found: number[] = [];
    for (let progress = true; progress; ) {
      progress = false;
      for (const [i, re] of BYLINE_PARTS.entries()) {
        const m = probe.match(re);
        if (m) {
          found.push(i);
          probe = probe.slice(m[0].length).trimStart();
          progress = true;
        }
      }
    }
    if (found.includes(2)) {
      rest = probe;
      report.oldByline = true;
    }
  }

  // 3. Bottom line / key takeaways: "Here's the Bottom Line:" and its "•"
  //    lines, in the same paragraph or the next one. Forms found on the site:
  //    the lines after the bold label; the first <br> (and "• ") inside the
  //    bold label; a WordPress block id on the paragraph; one introductory
  //    paragraph before it (that paragraph stays in the intro, after the
  //    panel). Only taken when every line is a "•" line.
  let takeaways: EnhancedArticle['takeaways'];
  {
    const P_OPEN = '<p(?:\\s+id="[^"]*")?>';
    const IN_PARA = '(?:(?!<\\/p>)[\\s\\S])*';
    const re = new RegExp(
      `^((?:<p>${IN_PARA}<\\/p>\\s*)?)${P_OPEN}<strong>(Here[’']s the Bottom Line:?)((?:\\s*<br\\s*\\/?>)?(?:\\s*[•·]\\s*)?)<\\/strong>(${IN_PARA})<\\/p>\\s*((?:${P_OPEN}(\\s*[•·]${IN_PARA})<\\/p>\\s*)?)`,
    );
    rest = rest.replace(re, (match, intro: string, label: string, tail: string, same: string, nextPara: string, next?: string) => {
      const inline = (tail + same).trim();
      const lines = inline ? inline : (next ?? '');
      if (inline && !/^<br/.test(inline)) return match;
      const raw = lines.split(/<br\s*\/?>/).map((l) => l.trim()).filter(Boolean);
      if (!raw.length || !raw.every((l) => /^[•·]/.test(l))) return match;
      takeaways = { label: label.trim(), items: raw.map((l) => l.replace(/^[•·]\s*/, '').trim()).filter(Boolean) };
      report.bottomLine = inline ? 'one paragraph' : 'two paragraphs';
      if (/^\s*<br/.test(tail) || /[•·]/.test(tail)) report.bottomLineNotes.push('line break inside the bold label');
      if (/^<p\s+id=/.test(match.slice(intro.length))) report.bottomLineNotes.push('WordPress block id on the paragraph');
      if (intro) report.bottomLineNotes.push('after an introductory paragraph');
      // The intro paragraph stays; a bullet paragraph after a one-paragraph
      // Bottom Line isn't part of it.
      return intro + (inline ? nextPara : '');
    });
  }
  // 3a. The same key points written as a Markdown list (rewritten pages):
  //     a paragraph holding only the bold label ("Here's the Bottom Line:" or
  //     "The short version") followed by a plain <ul>; each <li> becomes a
  //     point. Only at the top of the body, like the form above.
  if (!takeaways) {
    rest = rest.replace(
      /^<p><strong>(Here[’']s the Bottom Line:?|The short version)<\/strong><\/p>\s*<ul>((?:\s*<li>(?:(?!<\/?(?:li|ul|ol)\b)[\s\S])*<\/li>)+)\s*<\/ul>\s*/,
      (_, label: string, list: string) => {
        const items = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim()).filter(Boolean);
        takeaways = { label: label.trim(), items };
        report.bottomLine = 'list';
        return '';
      },
    );
  }
  //     Or as an H2 "… key takeaways" (some company reviews) with a plain
  //     list, right after the opening paragraph(s), which stay in the intro.
  if (!takeaways) {
    rest = rest.replace(
      /^((?:<p>(?:(?!<\/p>)[\s\S])*<\/p>\s*){0,2})<h2[^>]*>([^<]*\bkey (?:[a-z ]+ )?takeaways)<\/h2>\s*<ul>((?:\s*<li>(?:(?!<\/?(?:li|ul|ol)\b)[\s\S])*<\/li>)+)\s*<\/ul>\s*/i,
      (_, intro: string, label: string, list: string) => {
        const items = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim()).filter(Boolean);
        takeaways = { label: label.trim(), items };
        report.bottomLine = 'list';
        return intro;
      },
    );
  }

  // 3b. Migrated reader comments: <div class="comments"> (one div.comment per
  //     comment, replies in div.comment-replies) and the heading right before
  //     it ("2 Comments"). Not part of the article: set aside so no article
  //     transform (contents list, FAQ, stories, notes…) sees them, and put back
  //     unchanged at the end, after the article.
  let comments = '';
  {
    const start = rest.search(/(?:<h2[^>]*>(?:(?!<\/h2>)[\s\S])*<\/h2>\s*)?<div class="comments">/);
    if (start !== -1) {
      const open = rest.indexOf('<div class="comments">', start);
      let depth = 0;
      let end = -1;
      for (const m of rest.slice(open).matchAll(/<div\b|<\/div>/g)) {
        depth += m[0] === '<div' ? 1 : -1;
        if (depth === 0) {
          end = open + (m.index ?? 0) + m[0].length;
          break;
        }
      }
      if (end !== -1) {
        comments = rest.slice(start, end).trim();
        rest = rest.slice(0, start) + rest.slice(end);
        report.comments = (comments.match(/<div class="comment"/g) ?? []).length;
      }
    }
  }

  // 4. Legacy blocks the template replaces.
  rest = rest.replace(
    /<table>\s*<thead>\s*<tr>\s*<th[^>]*>\s*TABLE OF CONTENTS\s*<\/th>[\s\S]*?<\/table>\s*/i,
    (table: string) => {
      const links = [...table.matchAll(/href="#([^"]*)"/g)].map((m) => htmlToText(m[1]));
      report.oldToc = { links, missingTargets: [] };
      return '';
    },
  );
  rest = rest.replace(
    /<h2[^>]*>\s*About Final Expense Guy\s*<\/h2>\s*(?:<p>\s*<picture>[\s\S]*?<\/picture>\s*<\/p>\s*)?<p>\s*Randy VanderVaate[\s\S]*?<\/p>\s*/,
    () => {
      report.oldBio = true;
      return '';
    },
  );
  rest = rest.replace(/<h2[^>]*>\s*Keep Reading\s*<\/h2>\s*<div>[\s\S]*?<\/div>\s*/i, () => {
    report.keepReading = true;
    return '';
  });
  rest = rest.replace(/<p class="quote-cta">\s*<a [^>]*href="#quote"[^>]*>([^<]*)<\/a>\s*<\/p>\s*/g, (_, label: string) => {
    report.ctaButtons.push(label.trim());
    return '';
  });
  rest = rest.replace(
    /<div class="button-link">\s*<a [^>]*href="(?:#quote|\/free-quote\/)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>\s*/g,
    (_, label: string) => {
      report.ctaButtons.push(htmlToText(label));
      return '';
    },
  );

  // 5. A <br> right after an opening tag only adds an empty line.
  rest = rest.replace(/(<(?:h[2-6]|p)(?:\s[^>]*)?>)\s*(?:<br\s*\/?>\s*)+/g, '$1');

  // 6. Unique ids (the first keeps its id; later duplicates get -2, -3…).
  //    The comments come last on the page, so their ids are checked last.
  const used = new Set<string>();
  const uniqueIds = (html: string) =>
    html.replace(/(<[a-z][a-z0-9]*\b[^>]*?\sid=")([^"]*)(")/gi, (m, pre: string, id: string, post: string) => {
      if (!used.has(id)) {
        used.add(id);
        return m;
      }
      let n = 2;
      while (used.has(`${id}-${n}`)) n++;
      used.add(`${id}-${n}`);
      report.duplicateIds.push(id);
      return `${pre}${id}-${n}${post}`;
    });
  rest = uniqueIds(rest);
  comments = uniqueIds(comments);

  // 7. H2 ids + contents list (a heading's own id is kept).
  const toc: TocItem[] = [];
  rest = rest.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (match, attrs: string, inner: string) => {
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
  if (report.oldToc) {
    const ids = new Set([...rest.matchAll(/\sid="([^"]*)"/g)].map((m) => htmlToText(m[1])));
    report.oldToc.missingTargets = report.oldToc.links.filter((l) => !ids.has(l));
  }

  // 8. FAQ section: from the "Frequently Asked Questions" H2 to the next H2.
  //    Questions are <h3>s, or else wholly bold paragraphs ending in "?".
  rest = rest.replace(
    /(<h2[^>]*>(?:\s|<[^>]+>)*Frequently Asked Questions[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2|$)/i,
    (match, heading: string, section: string) => {
      const byHeading = /<h3/.test(section);
      const q = byHeading ? /(?=<h3)/ : /(?=<p><strong>[^<]*\?\s*<\/strong><\/p>)/;
      const parts = section.split(q);
      const lead = q.test(parts[0]) ? '' : parts.shift() ?? '';
      if (!parts.length) return match;
      report.faq = byHeading ? 'headings' : 'paragraphs';
      const items = parts
        .map((p) => p.trim().replace(/^<p><strong>/, '<p class="article-faq__q"><strong>'))
        .map((p) => `<div class="article-faq__item">${p}</div>`)
        .join('\n');
      return `<section class="article-faq">${heading}${lead}<div class="article-faq__list">${items}</div></section>\n`;
    },
  );

  // 9. Runs of <details> (e.g. a review's "Top 10 Questions") as one list.
  rest = rest.replace(/(?:<details>[\s\S]*?<\/details>\s*)+/g, (run: string) => {
    report.detailsLists++;
    return `<div class="art-details">${run.trim()}</div>\n`;
  });

  // 10. Case stories: an H3 ending "'s Story:" (or "s' Story:", any case)
  //     and the text after it, up to the next heading.
  rest = rest.replace(
    /(<h3[^>]*>[^<]*(?:[’']s|s[’']) Story:?<\/h3>)([\s\S]*?)(?=<h[23]|<\/section>|$)/gi,
    (_, heading: string, story: string) => {
      report.stories++;
      return `<div class="art-story">${heading}${story.trim()}</div>\n`;
    },
  );

  // 11. "PROS" list followed by a "CONS" list (company reviews): one pair.
  rest = rest.replace(
    /<p><strong>(PROS:?)<\/strong><\/p>\s*(<ul>[\s\S]*?<\/ul>)\s*<p><strong>(CONS:?)<\/strong><\/p>\s*(<ul>[\s\S]*?<\/ul>)/g,
    (_, pros: string, prosList: string, cons: string, consList: string) => {
      report.prosCons++;
      return (
        `<div class="art-proscons">` +
        `<div class="art-proscons__col art-proscons__col--pros"><p class="art-proscons__label"><strong>${pros}</strong></p>${prosList}</div>` +
        `<div class="art-proscons__col art-proscons__col--cons"><p class="art-proscons__label"><strong>${cons}</strong></p>${consList}</div>` +
        `</div>`
      );
    },
  );

  // 11b. Lists of six or more items where each item is just one link (e.g. the
  //      pillar's links to condition pages): shown in columns.
  rest = rest.replace(/<ul>((?:(?!<\/ul>)[\s\S])*)<\/ul>/g, (m, inner: string) => {
    const items = inner.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    const linksOnly = items.length >= 6 && items.every((li) => /^<li>\s*<a [^>]*>[^<]*<\/a>\s*<\/li>$/.test(li));
    if (!linksOnly) return m;
    report.linkLists++;
    return `<ul class="art-linklist">${inner}</ul>`;
  });

  // 12. Calls to action written into the migrated text ("…form on this page…"):
  //     same words, quiet note style, except when the paragraph is an FAQ
  //     question's whole answer (then it stays an ordinary answer).
  rest = rest.replace(/(<div class="article-faq__item">)([\s\S]*?)(<\/div>)/g, (m, open: string, inner: string, close: string) => {
    const answer = inner.replace(/^\s*<(h3[^>]*|p class="article-faq__q")>[\s\S]*?<\/(?:h3|p)>/, '');
    const blocks = answer.match(/<(?:p|ul|ol|table|figure|div|blockquote|details|h[2-6])\b/g) ?? [];
    if (blocks.length !== 1 || blocks[0] !== '<p') return m;
    return open + inner.replace(/<p>(?=(?:(?!<\/p>)[\s\S])*<\/p>\s*$)/, '<p data-faq-answer>') + close;
  });
  rest = rest.replace(/<p>((?:(?!<\/p>)[\s\S])*?(?:quote request form|form on this page)(?:(?!<\/p>)[\s\S])*?)<\/p>/gi, (_, inner: string) => {
    report.ctaNotes++;
    return `<p class="art-note">${inner.replace(/<\/?strong>/g, '')}</p>`;
  });
  rest = rest.replace(/<p data-faq-answer>((?:(?!<\/p>)[\s\S])*?<\/p>)/g, (_, inner: string) => {
    if (/quote request form|form on this page/i.test(inner)) report.faqAnswersKept++;
    return `<p>${inner}`;
  });

  // 13. Hub pages: paragraphs of "✓ …" / "✘ …" lines under bold labels become
  //     labelled link lists (same words and links). A label repeated by the
  //     next paragraph continues the same group.
  if (options.variant === 'hub') rest = hubLists(rest, report);

  // The reader comments, after the article.
  if (comments) rest = `${rest.trim()}\n<section class="art-comments">${comments}</section>`;

  // 14. The header illustration: the first <figure> before the second H2,
  //     when it shows one. A rule left doubled by the move becomes one.
  let feature = '';
  const firstSection = rest.split(/(?=<h2[\s>])/).slice(0, 2).join('');
  const figure = firstSection.match(/<figure\b[\s\S]*?<\/figure>/);
  if (figure && FEATURE_SRC.test(figure[0])) {
    const at = rest.indexOf(figure[0]);
    feature = figure[0].replace(/\sloading="lazy"/, ' loading="eager"');
    rest = rest.slice(0, at) + rest.slice(at + figure[0].length).replace(/^\s*/, '\n');
    rest = rest.replace(/(<hr\s*\/?>)\s*<hr\s*\/?>/, '$1');
    report.feature = { src: figure[0].match(/src="([^"]+)"/)?.[1] ?? '', from: at < rest.search(/<h2[\s>]/) ? 'intro' : 'first section' };
  }

  // 15. Split the intro (before the first H2) from the body.
  const firstH2 = rest.search(/<h2/);
  let intro = firstH2 === -1 ? rest : rest.slice(0, firstH2);
  const body = firstH2 === -1 ? '' : rest.slice(firstH2);

  // 16. In the intro: the opening calls to action and the paragraphs the
  //     Quick Answer replaces are left out; then rules with nothing left
  //     before them, and an intro of rules alone.
  const replaced = [...(options.legacyIntro ?? [])];
  intro = intro.replace(/<p\b[^>]*>((?:(?!<\/p>)[\s\S])*)<\/p>\s*/g, (p, inner: string) => {
    const text = htmlToText(inner.replace(/<[^>]+>/g, ' '));
    if (INTRO_CTA.test(text)) {
      report.introCtas.push(text);
      return '';
    }
    const i = replaced.findIndex((start) => text.startsWith(start));
    if (i === -1) return p;
    report.legacyIntro.removed.push(replaced.splice(i, 1)[0]);
    return '';
  });
  report.legacyIntro.missing = replaced;
  intro = intro.replace(/^\s*(?:<hr\s*\/?>\s*)+/, '');
  if (/^(?:\s*<hr\s*\/?>)*\s*$/.test(intro)) intro = '';

  return { h1, takeaways, intro: intro.trim(), body: body.trim(), feature, toc, report };
}

function hubLists(html: string, report: EnhanceReport): string {
  type Group = { label: string; items: { mark: string; html: string }[] };
  const isHubParagraph = (inner: string) => /(?:^|<br\s*\/?>)\s*[✓✘]/.test(inner);
  // Consecutive hub paragraphs are handled as one run.
  return html.replace(/(?:<p>(?:(?!<\/p>)[\s\S])*?<\/p>\s*)+/g, (run: string) => {
    const paragraphs = [...run.matchAll(/<p>((?:(?!<\/p>)[\s\S])*?)<\/p>/g)].map((m) => m[1]);
    if (!paragraphs.some(isHubParagraph)) return run;
    const out: string[] = [];
    let groups: Group[] = [];
    const flush = () => {
      for (const g of groups) {
        const id = `hub-${slugify(htmlToText(g.label)) || 'list'}`;
        report.hubGroups.push({ label: htmlToText(g.label), items: g.items.length });
        out.push(
          (g.label
            ? `<section class="hub-group" aria-labelledby="${id}"><h3 class="hub-group__title" id="${id}">${g.label}</h3>`
            : `<section class="hub-group">`) +
            `<ul class="hub-list" role="list">` +
            g.items
              .map(
                (it) =>
                  `<li class="hub-item hub-item--${it.mark === '✓' ? 'yes' : 'no'}"><span class="hub-item__mark" aria-hidden="true">${it.mark}</span><span class="hub-item__text">${it.html}</span></li>`,
              )
              .join('') +
            `</ul></section>`,
        );
      }
      groups = [];
    };
    for (const p of paragraphs) {
      if (!isHubParagraph(p)) {
        flush();
        out.push(`<p>${p}</p>`);
        continue;
      }
      for (const raw of p.split(/<br\s*\/?>/)) {
        const line = raw.trim();
        if (!line) continue;
        const label = line.match(/^<strong>([^<]+)<\/strong>$/)?.[1].trim();
        if (label) {
          const last = groups[groups.length - 1];
          if (!last || last.label !== label) groups.push({ label, items: [] });
          continue;
        }
        const item = line.match(/^([✓✘])\s*([\s\S]*)$/);
        if (!item) {
          // Not a list line: keep it as its own paragraph.
          flush();
          out.push(`<p>${line}</p>`);
          continue;
        }
        if (!groups.length) groups.push({ label: '', items: [] });
        groups[groups.length - 1].items.push({ mark: item[1], html: item[2].trim() });
      }
    }
    flush();
    return out.join('\n') + '\n';
  });
}
