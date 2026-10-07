// Markup for the hub navigation (data: src/config/hub-nav.ts). Plain HTML
// links only: no script, nothing collapsed or hidden. Styles: ArticleLayout.
// Kept out of the search index (data-pagefind-ignore), like other navigation.
//
// On the three hubs the page Markdown holds <div data-hub-nav="ID"></div>,
// replaced at build time by hubNavPlugin (below); the health category pages
// get categoryMoreHtml() after the article, from ArticleLayout.
import {
  BURIAL_GUIDES,
  CATEGORY_MORE,
  COMMON_CONDITIONS,
  COMPANY_GROUPS,
  HEALTH_CATEGORIES,
  MORE_CONDITIONS,
  type CompanyEntry,
  type HubLink,
} from '../config/hub-nav';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const a = (l: HubLink, cls?: string) => `<a${cls ? ` class="${cls}"` : ''} href="${esc(l.href)}">${esc(l.label)}</a>`;
const list = (links: HubLink[], cls: string) =>
  `<ul class="${cls}" role="list">${links.map((l) => `<li>${a(l)}</li>`).join('')}</ul>`;
// Each block starts with its own H2 (enhance.ts splits the article at the
// first H2, so a wrapper around a heading could be cut in two).
const heading = (id: string, text: string) => `<h2 id="${id}" data-pagefind-ignore>${esc(text)}</h2>`;
const ARROW =
  '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>';

/** /burial-insurance/: the eight guide clusters, one card each. */
function burialGuides(): string {
  const cards = BURIAL_GUIDES.map(
    (c) =>
      `<section class="hubnav-card" aria-labelledby="${c.id}">` +
      `<h3 class="hubnav-card__title" id="${c.id}">${esc(c.title)}</h3>` +
      `<a class="hubnav-card__primary" href="${esc(c.primary.href)}"><span>${esc(c.primary.label)}</span>${ARROW}</a>` +
      list(c.supporting, 'hubnav-card__links') +
      (c.more.length
        ? `<div class="hubnav-card__more"><p class="hubnav-card__more-label">More guides:</p>${list(c.more, 'hubnav-more')}</div>`
        : '') +
      `</section>`,
  ).join('');
  return (
    heading('burial-insurance-guides', 'Burial insurance guides') +
    `<div class="hubnav" data-pagefind-ignore><div class="hubnav-cards">${cards}</div></div>`
  );
}

/** /burial-insurance/: the health categories (under the page's own heading). */
function burialHealth(): string {
  return (
    `<div class="hubnav" data-pagefind-ignore>` +
    list(HEALTH_CATEGORIES, 'hubnav-tiles') +
    `<p class="hubnav-all"><a href="/a-z-health/">All Health Conditions (A–Z)</a></p></div>`
  );
}

/** /a-z-health/: categories, common conditions, and conditions without a category page. */
function azHealth(): string {
  const groups = MORE_CONDITIONS.map(
    (g) =>
      `<section class="hubnav-group" aria-labelledby="${g.id}">` +
      `<h3 class="hubnav-group__title" id="${g.id}">${esc(g.title)}</h3>${list(g.links, 'hubnav-grid')}</section>`,
  ).join('');
  return (
    heading('browse-by-category', 'Browse by category') +
    `<div class="hubnav" data-pagefind-ignore>${list(HEALTH_CATEGORIES, 'hubnav-tiles')}</div>` +
    heading('common-conditions', 'Common conditions') +
    `<div class="hubnav" data-pagefind-ignore>${list(COMMON_CONDITIONS, 'hubnav-grid')}</div>` +
    heading('more-conditions', 'More conditions') +
    `<div class="hubnav" data-pagefind-ignore>${groups}</div>`
  );
}

const company = (e: CompanyEntry) =>
  `<li>${a(e, 'hubnav-company__name')}` +
  (e.also?.length
    ? `<ul class="hubnav-company__also" role="list">${e.also.map((s) => `<li><span>also:</span> ${a(s)}</li>`).join('')}</ul>`
    : '') +
  `</li>`;

/** /a-z-companies/: review pages A–Z, grouped by what the company is. */
function azCompanies(): string {
  const groups = COMPANY_GROUPS.map((g) => {
    let body: string;
    if (g.byLetter) {
      const letters = new Map<string, CompanyEntry[]>();
      for (const e of g.entries) {
        const k = e.label[0].toUpperCase();
        letters.set(k, [...(letters.get(k) ?? []), e]);
      }
      body =
        `<div class="hubnav-az">` +
        [...letters]
          .map(
            ([k, es]) =>
              `<div class="hubnav-az__letter"><p class="hubnav-az__key" aria-hidden="true">${k}</p>` +
              `<ul class="hubnav-company" role="list">${es.map(company).join('')}</ul></div>`,
          )
          .join('') +
        `</div>`;
    } else {
      body = `<ul class="hubnav-company hubnav-company--plain" role="list">${g.entries.map(company).join('')}</ul>`;
    }
    return `<section class="hubnav-group" aria-labelledby="${g.id}"><h3 class="hubnav-group__title" id="${g.id}">${esc(g.title)}</h3>${body}</section>`;
  }).join('');
  return heading('company-reviews-a-z', 'Company reviews A to Z') + `<div class="hubnav" data-pagefind-ignore>${groups}</div>`;
}

const BUILDERS: Record<string, () => string> = {
  'burial-guides': burialGuides,
  'burial-health': burialHealth,
  'az-health': azHealth,
  'az-companies': azCompanies,
};

/** A health category page's remaining conditions (after the article). */
export function categoryMoreHtml(path: string): string {
  const m = CATEGORY_MORE[path];
  if (!m) return '';
  const id = 'category-more';
  return heading(id, m.title) + `<div class="hubnav" data-pagefind-ignore>${list(m.links, 'hubnav-grid')}</div>`;
}

// Markdown (Sätteri) HTML-tree plugin, like quote-form-plugin.ts.
const MARKER = /<div data-hub-nav="([a-z-]+)"><\/div>/g;

export const hubNavPlugin = {
  name: 'fexguy-hub-nav',
  raw(node: { type: 'raw'; value: string }) {
    if (!node.value.includes('data-hub-nav=')) return;
    return {
      type: 'raw' as const,
      value: node.value.replace(MARKER, (_, id: string) => {
        const build = BUILDERS[id];
        if (!build) throw new Error(`Unknown hub navigation "${id}" (src/lib/hub-nav.ts)`);
        return build();
      }),
    };
  },
};
