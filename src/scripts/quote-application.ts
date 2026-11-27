// 10 Easy Questions (Randy, November 2026, application funnel V1.0; markup in
// src/components/quote/ApplicationQuestions.astro, wording in
// server/quote/application.js). One page of questions, opened from any rate
// card's APPLY NOW - 10 EASY QUESTIONS; nothing is preselected; None of the
// above excludes the other answers in its question; one feedback line per
// answered health question; SUBMIT MY ANSWERS appears once all 10 are done.
// The answers go only to the server (action `application`), never to
// analytics; after the server confirms they are saved, the page opens
// Randy's card in its confirmation state (/randy/, sessionStorage flag).
import { FEEDBACK, HEALTH_QUESTIONS, LIMITS, NONE } from '../../server/quote/application.js';

/** /randy/ shows its confirmation state only with this fresh flag (src/pages/randy/index.astro). */
export const APPLICATION_FLAG = 'ff:application-submitted';

type Api = (body: Record<string, unknown>) => Promise<{ http: number; body: Record<string, any> }>;

export function createApplication(root: HTMLElement, opts: { api: Api; quote: () => unknown; resume: () => Promise<boolean>; phone: string; back: () => void }) {
  const found = root.querySelector<HTMLElement>('[data-qa]');
  if (!found) return { reset() {} };
  const box: HTMLElement = found;
  const $ = <T extends Element = HTMLElement>(s: string) => box.querySelector<T>(s)!;
  const feet = $<HTMLSelectElement>('[data-qa-feet]');
  const inches = $<HTMLSelectElement>('[data-qa-inches]');
  const weight = $<HTMLInputElement>('[data-qa-weight]');
  const bar = $('[data-qa-bar]');
  const count = $('[data-qa-count]');
  const done = $('[data-qa-done]');
  const submit = $<HTMLButtonElement>('[data-qa-submit]');
  const status = $('[data-qa-status]');

  const weightValue = () => {
    const n = Number(weight.value.trim());
    return /^\d{2,3}$/.test(weight.value.trim()) && n >= LIMITS.weight.min && n <= LIMITS.weight.max ? n : null;
  };
  const q1Done = () => feet.value !== '' && inches.value !== '' && weightValue() !== null;
  const picked = (id: string) => Array.from(box.querySelectorAll<HTMLInputElement>(`input[name="${id}"]:checked`)).map((i) => i.value);

  function update() {
    let n = q1Done() ? 1 : 0;
    for (const q of HEALTH_QUESTIONS) {
      const sel = picked(q.id);
      const fb = box.querySelector<HTMLElement>(`[data-qa-q="${q.id}"] [data-qa-fb]`)!;
      if (sel.length) n++;
      fb.hidden = !sel.length;
      fb.querySelector('[data-qa-fb-text]')!.textContent = !sel.length ? '' : sel.includes(NONE) ? FEEDBACK.none : FEEDBACK.conditions;
    }
    bar.style.width = `${n * 10}%`;
    count.textContent = `${n} of 10 completed`;
    done.hidden = n < 10;
  }

  // None of the above stands alone; any condition clears it.
  box.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type === 'checkbox' && t.checked) {
      for (const other of box.querySelectorAll<HTMLInputElement>(`input[name="${t.name}"]`)) {
        if (other !== t && (t.value === NONE || other.value === NONE)) other.checked = false;
      }
    }
    update();
  });
  weight.addEventListener('input', () => {
    weight.value = weight.value.replace(/\D/g, '').slice(0, 3);
    update();
  });
  $('[data-qa-back]').addEventListener('click', () => opts.back());

  submit.addEventListener('click', async () => {
    if (submit.disabled) return;
    const answers = {
      heightFeet: Number(feet.value),
      heightInches: Number(inches.value),
      weight: weightValue(),
      health: Object.fromEntries(HEALTH_QUESTIONS.map((q) => [q.id, picked(q.id)])),
    };
    submit.disabled = true;
    status.textContent = 'Sending your answers…';
    let r = await opts.api({ action: 'application', answers, quote: opts.quote() });
    if (r.http === 401 && (await opts.resume())) r = await opts.api({ action: 'application', answers, quote: opts.quote() });
    if (r.http === 200 && r.body.status === 'ok' && r.body.saved === true) {
      try {
        sessionStorage.setItem(APPLICATION_FLAG, String(Date.now()));
      } catch {}
      status.textContent = 'Your answers were received.';
      // V1.5: test mode only: show the Agent CRM update that would be made (nothing was sent).
      const p = r.body.crmPreview;
      if (r.body.testMode === true && p) {
        const pre = document.createElement('pre');
        pre.className = 'qa-preview';
        pre.dataset.qaPreview = '';
        pre.textContent = `TEST MODE: nothing was sent to Agent CRM.\nWould update: ${p.contact}\nNew contact: ${p.newContact ? 'yes' : 'no'} | Note: ${p.note ? 'yes' : 'no'}\nField ${p.commentsField}:\n${p.comments}\nThen tag: ${p.tagAfterComments}`;
        const go = document.createElement('a');
        go.className = 'btn qf-btn-cta qa-submit';
        go.href = '/randy/';
        go.textContent = 'Continue to the contact card';
        status.after(pre, go);
        return;
      }
      window.location.assign('/randy/');
      return;
    }
    submit.disabled = false;
    status.textContent = typeof r.body.message === 'string' ? r.body.message : `Sorry, your answers couldn't be sent just now. Please try again, or call ${opts.phone}.`;
  });

  update();
  return {
    /** A new quote: clear every answer. */
    reset() {
      for (const i of box.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) i.checked = false;
      feet.value = '';
      inches.value = '';
      weight.value = '';
      status.textContent = '';
      submit.disabled = false;
      update();
    },
  };
}
