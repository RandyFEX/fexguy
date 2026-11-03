// Pricing Explorer v1.0 (/final-expense-insurance-prices/). Reads the
// controls, asks the server for the three category prices
// (POST /api/price-explorer/), and renders them. No rates, tables or keys are
// in this script: the server calculates everything. "Apply Now" fills the
// lead form's hidden quote fields (src/lib/lead/lead-form.ts 'pricing' set)
// and opens it in a dialog; src/scripts/lead-form.ts submits it as usual.

type Category = {
  id: string;
  label: string;
  status: 'ok' | 'pending' | 'unavailable';
  monthlyPremium?: string;
  message?: string;
  attribution: string[];
};
type Input = { age: number; gender: 'male' | 'female'; tobacco: boolean; coverage: number };

const root = document.querySelector<HTMLElement>('[data-price-explorer]');

// Carrier logos available on the site, by attribution code (shown blurred,
// decorative only; codes are mapped in server/rates/pricing-categories.js).
// Products without a logo file show a blurred neutral mark.
const LOGOS: Record<string, string> = {
  'FF-102': '/wp-content/uploads/2018/05/Mutual-of-Omaha-Logo.jpg',
};
const MIN = 5000;
const MAX = 25000;
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

if (root) {
  const controls = root.querySelector<HTMLFormElement>('[data-px-controls]')!;
  const other = root.querySelector<HTMLElement>('[data-px-other]')!;
  const otherInput = root.querySelector<HTMLInputElement>('#px-other')!;
  const otherError = root.querySelector<HTMLElement>('[data-px-other-error]')!;
  const live = root.querySelector<HTMLElement>('[data-px-live]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-px-dialog]')!;
  const summary = root.querySelector<HTMLElement>('[data-px-summary]')!;
  const cards = new Map(
    Array.from(root.querySelectorAll<HTMLElement>('[data-px-card]')).map((el) => [el.dataset.pxCard!, el]),
  );
  const cache = new Map<string, Category[]>();
  let current: { input: Input; categories: Category[] } | null = null;
  let timer: number | undefined;
  let seq = 0;

  const radio = (name: string) => controls.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;

  function readInput(): Input | null {
    const age = Number((controls.querySelector('#px-age') as HTMLSelectElement).value);
    const gender = radio('gender') === 'female' ? 'female' : 'male';
    const tobacco = radio('tobacco') === 'yes';
    const choice = radio('coverage');
    other.hidden = choice !== 'other';
    let coverage = Number(choice);
    if (choice === 'other') {
      const raw = otherInput.value.replace(/[$,\s]/g, '');
      const n = Number(raw);
      const valid = raw !== '' && Number.isInteger(n) && n >= MIN && n <= MAX;
      otherError.hidden = valid || raw === '';
      otherError.textContent = valid || raw === '' ? '' : `Enter a whole-dollar amount from ${money(MIN)} to ${money(MAX)}.`;
      otherInput.setAttribute('aria-invalid', String(!valid && raw !== ''));
      if (!valid) return null;
      coverage = n;
    }
    return { age, gender, tobacco, coverage };
  }

  function setCard(el: HTMLElement, cat: Category | null, state: string, note: string) {
    el.dataset.state = state;
    const amount = el.querySelector<HTMLElement>('[data-px-amount]')!;
    const noteEl = el.querySelector<HTMLElement>('[data-px-note]')!;
    const apply = el.querySelector<HTMLButtonElement>('[data-px-apply]')!;
    const logo = el.querySelector<HTMLElement>('[data-px-logo]')!;
    amount.textContent =
      state === 'ok' && cat?.monthlyPremium ? `$${cat.monthlyPremium}` : state === 'pending' ? 'Coming soon' : state === 'loading' ? ' ' : 'Not available';
    noteEl.textContent = note;
    apply.disabled = state !== 'ok';
    const ids = cat?.attribution?.length ? cat.attribution : [''];
    logo.replaceChildren(
      ...ids.map((id) => {
        if (LOGOS[id]) {
          const img = new Image();
          img.src = LOGOS[id];
          img.alt = '';
          img.decoding = 'async';
          return img;
        }
        const blank = document.createElement('span');
        blank.className = 'px-logo-blank';
        return blank;
      }),
    );
  }

  function render(categories: Category[]) {
    for (const cat of categories) {
      const el = cards.get(cat.id);
      if (el) setCard(el, cat, cat.status, cat.status === 'ok' ? '' : cat.message ?? '');
    }
    const shown = categories.filter((c) => c.status === 'ok').map((c) => `${c.label} $${c.monthlyPremium} per month`);
    live.textContent = shown.length ? `Prices updated. ${shown.join('. ')}.` : 'Prices updated.';
  }

  function renderError(message: string) {
    for (const el of cards.values()) setCard(el, null, 'unavailable', message);
    live.textContent = message;
  }

  async function update() {
    const input = readInput();
    if (!input) return;
    const key = JSON.stringify(input);
    const hit = cache.get(key);
    if (hit) {
      current = { input, categories: hit };
      render(hit);
      return;
    }
    const mine = ++seq;
    for (const el of cards.values()) if (el.dataset.state !== 'ok') setCard(el, null, 'loading', 'Loading prices…');
    try {
      const res = await fetch('/api/price-explorer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: key,
      });
      const body = await res.json().catch(() => ({}));
      if (mine !== seq) return;
      if (!res.ok || body.status !== 'ok') {
        current = null;
        renderError(body.message ?? 'Prices are not available right now.');
        return;
      }
      cache.set(key, body.categories);
      current = { input, categories: body.categories };
      render(body.categories);
    } catch {
      if (mine !== seq) return;
      current = null;
      renderError('Prices are not available right now.');
    }
  }

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(update, 250);
  };
  controls.addEventListener('change', schedule);
  otherInput.addEventListener('input', schedule);
  controls.addEventListener('submit', (e) => e.preventDefault());
  update();

  // Apply Now: carry the quote into the lead form and open it.
  const form = dialog.querySelector<HTMLFormElement>('[data-lead-form]');
  const setField = (name: string, value: string) => {
    const input = form?.querySelector<HTMLInputElement>(`input[data-pricing-field][name="${name}"]`);
    if (input) input.value = value;
  };
  for (const [id, el] of cards) {
    el.querySelector<HTMLButtonElement>('[data-px-apply]')!.addEventListener('click', () => {
      const cat = current?.categories.find((c) => c.id === id);
      if (!current || !cat || cat.status !== 'ok') return;
      const { input } = current;
      setField('Quote Category', cat.label);
      setField('Quote Monthly Premium', `$${cat.monthlyPremium}`);
      setField('Quote Age', String(input.age));
      setField('Quote Sex', input.gender === 'female' ? 'Female' : 'Male');
      setField('Quote Tobacco', input.tobacco ? 'Smoker' : 'Non-Smoker');
      setField('Quote Coverage', money(input.coverage));
      setField('Quote Reference State', 'Texas');
      setField('Quote Product Codes', cat.attribution.join(', '));
      summary.textContent = `${cat.label}: $${cat.monthlyPremium} per month for ${money(input.coverage)} of coverage, age ${input.age}.`;
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('#lf-first')?.focus();
    });
  }
  dialog.querySelector('[data-px-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
