// Explicit table-of-contents labels, by page and section id, for headings
// whose stored text can't be turned into Title Case safely (headings stored
// in capitals). Each label is the heading's own wording in Title Case,
// written by hand so names and acronyms stay right. The article heading
// itself is unchanged; ArticleToc fails the build on an ALL CAPS heading
// with no label here (src/lib/article/title-case.ts).
export const TOC_LABELS: Record<string, Record<string, string>> = {};
