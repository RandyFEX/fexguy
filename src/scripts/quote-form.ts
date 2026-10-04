// Turns the page's quote box (see src/lib/lead/quote-box.ts) into the live
// Fillout form. The embed is ~4 MB of third-party JavaScript, so it never
// loads with the page:
//  - inline box (the page's main purpose): loads as it nears the screen;
//  - sidebar box: waits until the page has fully loaded and the browser is
//    idle, then loads as it nears the screen (on phones the sidebar sits
//    below the article, so most readers never download it);
//  - any click on the box's button or a link to #quote loads it immediately.
// There is at most one quote box per page.
import { lead } from '@/config/lead';

const box = document.querySelector<HTMLElement>('[data-quote-box]');
const slot = box?.querySelector<HTMLElement>('[data-quote-slot]');

if (box && slot) {
  let loaded = false;

  const load = () => {
    if (loaded) return;
    loaded = true;
    const embed = document.createElement('div');
    embed.className = 'quote-box__embed';
    embed.dataset.filloutId = lead.fillout.formId;
    embed.dataset.filloutEmbedType = 'standard';
    embed.setAttribute('data-fillout-inherit-parameters', '');
    embed.setAttribute('data-fillout-dynamic-resize', '');
    slot.replaceChildren(embed);
    box.classList.add('is-loaded');
    // Fillout's page shifts its own layout while it starts up, and Chrome
    // counts layout shifts inside iframes toward the page's CLS. Keep the
    // iframe invisible (Fillout's loading spinner shows meanwhile) until the
    // form reports itself ready, or at most a few seconds.
    const reveal = () => embed.classList.add('is-ready');
    const onMessage = (e: MessageEvent) => {
      const frame = embed.querySelector('iframe');
      if (e.origin !== lead.fillout.embedOrigin || !frame || e.source !== frame.contentWindow) return;
      const type = (e.data as { type?: unknown } | null)?.type;
      if (type === 'form_init' || type === 'form_resized' || type === 'page_change') {
        window.removeEventListener('message', onMessage);
        reveal();
      }
    };
    window.addEventListener('message', onMessage);
    setTimeout(reveal, 8000);
    // Fillout's loader scans the page for embeds when it runs.
    const script = document.createElement('script');
    script.src = lead.fillout.script;
    script.async = true;
    document.body.append(script);
  };

  const loadWhenNear = (margin: string) => {
    if (!('IntersectionObserver' in window)) return load();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: margin },
    );
    io.observe(box);
  };

  const whenIdleAfterLoad = (fn: () => void) => {
    const idle = () =>
      'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500);
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  };

  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest?.('a');
    if (!link) return;
    if (link.hasAttribute('data-quote-open')) {
      e.preventDefault();
      load();
    } else if (link.getAttribute('href') === '#quote') {
      load();
    }
  });

  if (location.hash === '#quote') load();
  else if (box.dataset.quoteBox === 'inline') loadWhenNear('300px');
  else whenIdleAfterLoad(() => loadWhenNear('200px'));
}
