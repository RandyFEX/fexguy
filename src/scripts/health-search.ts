// Health Question Search (src/components/health-search/). Talks only to the
// protected API; renders with DOM methods (never innerHTML of server data).
// The 3-searches-a-day allowance is enforced on the server; this script only
// shows it. Nothing here is sent to GA4 or Meta.

const API = '/api/health-search/';

type Outcome = { classification: string | null; explanation: string } | null;
type Schedule = { label: string; periods: { months: string; benefit: string }[]; verification?: string };
type Question = { section: string; number: string; variant: string | null; text: string; match: 'direct' | 'related'; because: string; yes: Outcome; no: Outcome };
type Group = { carrier: string; anonymized: boolean; questions: Question[]; schedules: Schedule[] };
type GiCard = { carrier: string; summary: string; schedules: Schedule[] };
type Response = {
  status: string;
  message?: string;
  remaining?: number;
  limit?: number;
  resetAt?: number | null;
  counted?: boolean;
  matchCount?: number;
  directCount?: number;
  page?: number;
  totalPages?: number;
  groups?: Group[];
  guaranteedIssue?: GiCard[];
  sample?: boolean;
};

const CLASS_LABELS: Record<string, string> = {
  decline: 'Not eligible for this plan',
  modified: 'Modified benefit plan',
  graded: 'Graded benefit plan',
  timeframe: 'Depends on timing',
  'standard-or-preferred': 'Standard or preferred rates',
  'guaranteed-issue-referral': 'Guaranteed issue plan instead',
  level: 'Full coverage from the first day',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function whenText(resetAt: number | null | undefined) {
  if (!resetAt) return 'tomorrow';
  return new Date(resetAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' });
}

async function call(body: object): Promise<{ http: number; data: Response }> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({ status: 'unavailable' }))) as Response;
    return { http: res.status, data };
  } catch {
    return { http: 0, data: { status: 'unavailable' } };
  }
}

function renderSchedules(schedules: Schedule[]) {
  const wrap = el('div', 'hqs-schedules');
  for (const s of schedules) {
    const box = el('div', 'hqs-schedule');
    box.append(el('p', 'hqs-schedule__label', s.label));
    const list = el('ul', 'hqs-schedule__list');
    for (const p of s.periods) {
      const li = el('li');
      li.append(el('strong', undefined, `Months ${p.months}: `), document.createTextNode(p.benefit));
      list.append(li);
    }
    box.append(list);
    if (s.verification) box.append(el('p', 'hqs-schedule__note', s.verification));
    wrap.append(box);
  }
  return wrap;
}

function renderOutcome(label: string, o: Outcome) {
  if (!o) return null;
  const div = el('div', 'hqs-outcome');
  const head = el('p', 'hqs-outcome__head');
  head.append(el('strong', undefined, label));
  if (o.classification && CLASS_LABELS[o.classification]) head.append(el('span', 'hqs-outcome__class', CLASS_LABELS[o.classification]));
  div.append(head, el('p', 'hqs-outcome__text', o.explanation));
  return div;
}

function renderGroup(g: Group) {
  const card = el('article', 'hqs-carrier');
  card.append(el('h3', 'hqs-carrier__name', g.carrier));
  for (const q of g.questions) {
    const item = el('div', `hqs-q hqs-q--${q.match}`);
    const meta = el('p', 'hqs-q__meta');
    meta.append(el('span', `hqs-badge hqs-badge--${q.match}`, q.match === 'direct' ? 'Direct match' : 'Related'));
    meta.append(el('span', 'hqs-q__num', [q.variant, q.section, `Question ${q.number}`].filter(Boolean).join(', ')));
    item.append(meta);
    const quote = el('blockquote', 'hqs-q__text');
    quote.append(el('p', undefined, q.text));
    item.append(quote, el('p', 'hqs-q__why', q.because));
    for (const o of [renderOutcome('If you answer YES', q.yes), renderOutcome('If you answer NO', q.no)]) if (o) item.append(o);
    card.append(item);
  }
  if (g.schedules.length) card.append(renderSchedules(g.schedules));
  return card;
}

function renderGi(c: GiCard) {
  const card = el('article', 'hqs-carrier hqs-carrier--gi');
  card.append(el('h3', 'hqs-carrier__name', c.carrier), el('p', 'hqs-gi__summary', c.summary));
  if (c.schedules.length) card.append(renderSchedules(c.schedules));
  return card;
}

function setup(root: HTMLElement) {
  if (root.dataset.hqsReady) return;
  root.dataset.hqsReady = '1';
  const form = root.querySelector<HTMLFormElement>('[data-hqs-form]')!;
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const status = root.querySelector<HTMLElement>('[data-hqs-status]')!;
  const results = root.querySelector<HTMLElement>('[data-hqs-results]')!;
  const allowance = root.querySelector<HTMLElement>('[data-hqs-allowance]')!;
  const phoneHref = root.dataset.phoneHref ?? 'tel:8888629456';
  const phoneDisplay = root.dataset.phoneDisplay ?? '888-862-9456';
  let busy = false;

  const showAllowance = (remaining: number | undefined, resetAt?: number | null) => {
    if (remaining === undefined) return;
    if (remaining > 0) {
      allowance.textContent = `${remaining} of 3 searches left today.`;
      allowance.classList.remove('is-out');
    } else {
      allowance.textContent = `No searches left until ${whenText(resetAt)}.`;
      allowance.classList.add('is-out');
    }
  };

  const callBox = (lead: string) => {
    const box = el('div', 'hqs-callbox');
    box.append(el('p', 'hqs-callbox__text', lead));
    const a = el('a', 'btn btn--primary hqs-callbox__btn', `Call ${phoneDisplay}`);
    a.href = phoneHref;
    box.append(a);
    return box;
  };

  const setStatus = (text: string, node?: HTMLElement) => {
    status.replaceChildren();
    if (text) status.append(el('p', undefined, text));
    if (node) status.append(node);
  };

  const showExhausted = (resetAt?: number | null) => {
    showAllowance(0, resetAt);
    setStatus('', callBox(`You've used your 3 searches for today. You can search again ${resetAt ? `after ${whenText(resetAt)}` : 'tomorrow'}. To go over more health questions and your coverage options, call Funeral Funds.`));
    status.querySelector('.hqs-callbox')?.classList.add('hqs-callbox--strong');
  };

  const renderResults = (q: string, data: Response, append: boolean) => {
    if (!append) results.replaceChildren();
    const frag = document.createDocumentFragment();
    if (!append) {
      if (data.sample) frag.append(el('p', 'hqs-sample', 'Preview: these are sample questions, not real insurance company questions.'));
      if (!data.matchCount) {
        const empty = el('div', 'hqs-empty');
        empty.append(el('p', undefined, `No application questions matched "${q}".`), el('p', undefined, 'Try another name for it, for example "heart attack" instead of "MI", or the name of the condition instead of a medication. This search did not use up one of your searches.'));
        frag.append(empty);
      } else {
        const direct = data.directCount ?? 0;
        frag.append(el('p', 'hqs-summary', direct
          ? `Questions that ask about "${q}", grouped by insurance company.`
          : `No question asks about "${q}" by name. These questions are related to it.`));
      }
    }
    for (const g of data.groups ?? []) frag.append(renderGroup(g));
    for (const c of data.guaranteedIssue ?? []) frag.append(renderGi(c));
    results.querySelector('[data-hqs-more]')?.remove();
    results.append(frag);
    if ((data.page ?? 1) < (data.totalPages ?? 1)) {
      const more = el('button', 'btn btn--secondary hqs-more', 'Show more insurance companies');
      more.type = 'button';
      more.dataset.hqsMore = '';
      more.addEventListener('click', () => run(q, (data.page ?? 1) + 1));
      results.append(more);
    }
  };

  const run = async (q: string, page = 1) => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    if (page === 1) setStatus('Searching...');
    const { http, data } = await call({ q, page });
    busy = false;
    button.disabled = false;
    if (data.status === 'ok') {
      showAllowance(data.remaining, data.resetAt);
      setStatus(page === 1 ? `${data.matchCount ? `${data.matchCount} matching question${data.matchCount === 1 ? '' : 's'} found.` : 'No matching questions found.'}` : 'More insurance companies loaded.');
      renderResults(q, data, page > 1);
      if (data.remaining === 0 && data.counted) showExhausted(data.resetAt);
      return;
    }
    if (data.status === 'exhausted') {
      // Keep the last results on screen; block new searches.
      showExhausted(data.resetAt);
      status.focus();
      return;
    }
    if (data.status === 'too-short' || data.status === 'invalid') {
      setStatus(data.message ?? 'Please check what you typed.');
      input.focus();
      return;
    }
    if (data.status === 'rate-limited') {
      setStatus('', callBox('Too many searches have come from this network. Please try again later, or call Funeral Funds and we can go over your health questions with you.'));
      return;
    }
    setStatus('', callBox(http === 0
      ? 'The search could not connect. Please check your connection and try again, or call Funeral Funds.'
      : 'The health question search is not available right now. Please call Funeral Funds and we can go over your health questions with you.'));
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) {
      setStatus('Please type at least 2 letters, such as "COPD" or "heart attack".');
      input.focus();
      return;
    }
    // Always ask the server, even when the allowance is used up: it decides
    // whether this is a new search (refused) or one already accepted today
    // (reopened free).
    run(q, 1);
  });

  // Show the remaining allowance once the search comes into view.
  const loadStatus = async () => {
    const { data } = await call({ action: 'status' });
    if (data.status === 'quota') {
      showAllowance(data.remaining, data.resetAt);
    }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) { io.disconnect(); loadStatus(); }
    });
    io.observe(root);
  }
}

export function initHealthSearch() {
  document.querySelectorAll<HTMLElement>('[data-hqs]').forEach(setup);
  document.querySelectorAll<HTMLButtonElement>('[data-hqs-open]').forEach((btn) => {
    if (btn.dataset.hqsBound) return;
    btn.dataset.hqsBound = '1';
    const dialog = document.getElementById(btn.dataset.hqsOpen ?? '') as HTMLDialogElement | null;
    if (!dialog) return;
    btn.addEventListener('click', () => {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('input[name="q"]')?.focus();
    });
    dialog.querySelector('[data-hqs-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => btn.focus());
    // Click on the backdrop closes it.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  });
}
