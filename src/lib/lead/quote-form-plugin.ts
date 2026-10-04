// Markdown (Sätteri) HTML-tree plugin: replaces <div data-quote-form></div> in
// page Markdown with the inline quote box (see quote-box.ts). Lets content
// files place the form without containing its markup.
import { quoteBoxHtml } from './quote-box';

const MARKER = '<div data-quote-form></div>';

export const quoteFormPlugin = {
  name: 'fexguy-quote-form',
  // Raw HTML in Markdown reaches the HTML tree as `raw` nodes.
  raw(node: { type: 'raw'; value: string }) {
    if (!node.value.includes(MARKER)) return;
    return { type: 'raw' as const, value: node.value.replaceAll(MARKER, quoteBoxHtml('inline')) };
  },
};
