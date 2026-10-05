// Wide content tables scroll sideways on small screens (global.css gives them
// display: block; overflow-x: auto). A scroll container must be reachable by
// keyboard (WCAG 2.2 SC 2.1.1), so every table that actually overflows gets
// tabindex="0" (arrow keys then scroll it); tables that fit get no extra tab
// stop. Re-checked when the viewport size changes.
const TABLES = '.wp-content table, .prose table';

function update(): void {
  document.querySelectorAll<HTMLTableElement>(TABLES).forEach((table) => {
    const scrolls = table.scrollWidth > table.clientWidth + 1;
    if (scrolls && !table.hasAttribute('tabindex')) {
      table.tabIndex = 0;
      table.dataset.scrollFocus = '';
    } else if (!scrolls && table.dataset.scrollFocus !== undefined) {
      table.removeAttribute('tabindex');
      delete table.dataset.scrollFocus;
    }
  });
}

if (document.querySelector(TABLES)) {
  update();
  let timer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(update, 200);
  });
}
