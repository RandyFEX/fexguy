// The mobile call button (.call-sticky, or a landing page's own
// #callnowbutton) is fixed to the bottom of the screen. With large text it
// wraps and grows taller than its 3.5rem minimum, so publish its real height
// as --call-sticky-h: global.css uses it for the page's bottom padding (the
// end of the page stays visible) and scroll-padding (keyboard focus never
// scrolls underneath it — WCAG 2.2 SC 2.4.11).
const bar = document.querySelector<HTMLElement>('.call-sticky, .wp-content a#callnowbutton');

if (bar && 'ResizeObserver' in window) {
  const root = document.documentElement;
  new ResizeObserver(() => {
    const h = bar.offsetHeight; // 0 when hidden (wider screens)
    if (h) root.style.setProperty('--call-sticky-h', `${h}px`);
    else root.style.removeProperty('--call-sticky-h');
  }).observe(bar);
}
