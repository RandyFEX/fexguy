// Markdown (Sätteri) HTML-tree plugin: replaces <div data-quote-form></div> in
// page Markdown with the inline quote box (see quote-box.ts). Lets content
// files place the form without containing its markup.
import { quoteBoxHtml } from './quote-box';
import { withPagePhone } from '../../config/phones';

const MARKER = '<div data-quote-form></div>';
/** The same form with the CTV number (/roku/; see src/config/phones.ts). */
const CTV_MARKER = '<div data-quote-form data-phone="ctv"></div>';

export const quoteFormPlugin = {
  name: 'fexguy-quote-form',
  // Raw HTML in Markdown reaches the HTML tree as `raw` nodes.
  raw(node: { type: 'raw'; value: string }) {
    if (!node.value.includes(MARKER) && !node.value.includes(CTV_MARKER)) return;
    const value = node.value
      .replaceAll(CTV_MARKER, withPagePhone(quoteBoxHtml('inline'), 'ctv'))
      .replaceAll(MARKER, quoteBoxHtml('inline'));
    return { type: 'raw' as const, value };
  },
};
