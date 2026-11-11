// Homepage state map (V4.4): a tooltip with the state name and an
// instruction while a state is hovered or focused. Navigation is the
// states' own links (new tab); this script never navigates.
const wrap = document.querySelector<HTMLElement>('[data-home-map]');
const tip = wrap?.querySelector<HTMLElement>('[data-home-map-tip]');
if (wrap && tip) {
  const links = Array.from(wrap.querySelectorAll<SVGAElement>('a[data-name]'));
  const show = (a: SVGAElement, x: number, y: number) => {
    const name = a.dataset.name!;
    tip.innerHTML = `<strong></strong>Click for details`;
    tip.querySelector('strong')!.textContent = name;
    tip.hidden = false;
    const box = wrap.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const left = Math.min(Math.max(x - box.left, half), box.width - half);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(y - box.top, tip.offsetHeight + 12)}px`;
  };
  const hide = () => { tip.hidden = true; };
  for (const a of links) {
    a.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') show(a, e.clientX, e.clientY); });
    a.addEventListener('pointerleave', hide);
    a.addEventListener('focus', () => {
      if (!a.matches(':focus-visible')) return; // keyboard focus only; a tap leaves no tooltip
      const r = a.getBoundingClientRect();
      show(a, r.left + r.width / 2, r.top + r.height / 2);
    });
    a.addEventListener('blur', hide);
  }
}
