// @ts-check
// Validates the health-question dataset against the approved inventory:
// 7 carriers, 88 question records, per-carrier counts, Aetna/Aflac section
// counts, CICA D-1/D-2 variants, shared-wording pairs and required wording.
// It never edits data: problems are reported for a person to resolve.

import { normalize } from './normalize.js';

const EM_DASH = /\u2014|&mdash;|&#8212;/;

/**
 * @typedef {{ rule?: string, classification?: string, explanation?: string }} Outcome
 * @typedef {{ id: string, carrierId?: string, section: string, number: string, variant?: string | null,
 *   text: string, sharedKey?: string | null, yes?: Outcome, no?: Outcome,
 *   search?: { direct?: string[], related?: string[] }, source?: { document?: string, page?: number | string } }} Question
 * @typedef {{ carrierId: string, status: string, source: unknown, questions: Question[] }} QuestionFile
 * @typedef {{ id: string, name: string, displayOrder: number, guaranteedIssue: boolean, expectedQuestionCount: number,
 *   expectedSections?: Record<string, number>, variants?: string[], sharedWordingGroup: string | null,
 *   publicDisplay: 'named' | 'anonymized', anonymizedName?: string, summary?: string,
 *   schedules: Record<string, { label: string, periods: { months: string, benefit: string }[], verification?: string }>,
 *   rules: Record<string, { classification: string, explanation: string }>,
 *   requiredWording?: { section: string, number: string, mustInclude?: string, mustNotInclude?: string, reason: string }[] }} Carrier
 * @typedef {{ id: string, label: string, terms: string[], indicators: string[], related: string[] }} Concept
 * @typedef {{ expectedQuestionTotal: number, carriers: Carrier[] }} CarrierFile
 */

/**
 * @param {{ carriers: CarrierFile, questionFiles: QuestionFile[], concepts: { concepts: Concept[] } }} input
 * @param {{ requireComplete?: boolean }} [opts]
 * @returns {{ errors: string[], warnings: string[], pending: string[], counts: Record<string, number>, total: number, complete: boolean }}
 */
export function validateDataset({ carriers, questionFiles, concepts }, opts = {}) {
  const errors = [];
  const warnings = [];
  const pending = [];
  /** @type {Record<string, number>} */
  const counts = {};
  const byId = new Map(carriers.carriers.map((c) => [c.id, c]));
  const conceptIds = new Set(concepts.concepts.map((c) => c.id));

  if (carriers.carriers.length !== 7) errors.push(`Expected 7 carrier identities, found ${carriers.carriers.length}.`);
  const expectedSum = carriers.carriers.reduce((s, c) => s + c.expectedQuestionCount, 0);
  if (expectedSum !== carriers.expectedQuestionTotal) errors.push(`Carrier expected counts add to ${expectedSum}, not ${carriers.expectedQuestionTotal}.`);
  if (new Set(carriers.carriers.map((c) => c.id)).size !== carriers.carriers.length) errors.push('Duplicate carrier ids.');

  // Consumer-facing carrier text: plain English, no em dashes.
  for (const c of carriers.carriers) {
    const copy = [c.summary ?? '', c.anonymizedName ?? '', ...Object.values(c.rules).map((r) => r.explanation),
      ...Object.values(c.schedules).flatMap((s) => [s.label, ...s.periods.map((p) => p.benefit)])];
    if (copy.some((t) => EM_DASH.test(t))) errors.push(`${c.id}: consumer text contains an em dash.`);
    if (c.publicDisplay === 'anonymized' && !c.anonymizedName) errors.push(`${c.id}: anonymized without anonymizedName.`);
  }

  const seenIds = new Set();
  for (const file of questionFiles) {
    const carrier = byId.get(file.carrierId);
    if (!carrier) { errors.push(`Question file for unknown carrier "${file.carrierId}".`); continue; }
    counts[carrier.id] = file.questions.length;
    if (file.status === 'awaiting-source') {
      pending.push(`${carrier.name}: awaiting the original application (${carrier.expectedQuestionCount} questions expected).`);
      if (file.questions.length) errors.push(`${carrier.id}: has questions but status is still "awaiting-source".`);
      continue;
    }
    if (!file.source) errors.push(`${carrier.id}: questions loaded without a recorded source document.`);
    if (file.questions.length !== carrier.expectedQuestionCount) {
      errors.push(`${carrier.id}: ${file.questions.length} questions, expected ${carrier.expectedQuestionCount}.`);
    }
    /** @type {Record<string, number>} */
    const sections = {};
    for (const q of file.questions) {
      if (!q.id || seenIds.has(q.id)) errors.push(`${carrier.id}: missing or duplicate question id "${q.id}".`);
      seenIds.add(q.id);
      if (!q.text || !q.text.trim()) errors.push(`${q.id}: empty question text.`);
      if (q.text && EM_DASH.test(q.text)) warnings.push(`${q.id}: source wording contains an em dash; kept verbatim, needs Randy's decision before publishing.`);
      if (!q.section || !q.number) errors.push(`${q.id}: section and number are required.`);
      sections[q.section] = (sections[q.section] ?? 0) + 1;
      for (const side of /** @type {const} */ (['yes', 'no'])) {
        const o = q[side];
        if (!o) continue;
        if (o.rule && !carrier.rules[o.rule]) errors.push(`${q.id}: ${side} rule "${o.rule}" is not defined for ${carrier.id}.`);
        if (!o.rule && !(o.classification && o.explanation)) errors.push(`${q.id}: ${side} needs a rule or a classification and explanation.`);
        if (o.explanation && EM_DASH.test(o.explanation)) errors.push(`${q.id}: ${side} explanation contains an em dash.`);
      }
      if (!q.yes) warnings.push(`${q.id}: no YES outcome recorded.`);
      for (const k of /** @type {const} */ (['direct', 'related'])) {
        for (const ref of q.search?.[k] ?? []) if (!conceptIds.has(ref)) errors.push(`${q.id}: search.${k} refers to unknown concept "${ref}".`);
      }
      if (carrier.variants?.length && !carrier.variants.includes(q.variant ?? '')) {
        errors.push(`${q.id}: ${carrier.id} questions must carry one of the variants ${carrier.variants.join(', ')}.`);
      }
    }
    for (const [section, n] of Object.entries(carrier.expectedSections ?? {})) {
      if ((sections[section] ?? 0) !== n) errors.push(`${carrier.id}: ${section} has ${sections[section] ?? 0} questions, expected ${n}.`);
    }
    for (const v of carrier.variants ?? []) {
      if (!file.questions.some((q) => q.variant === v)) errors.push(`${carrier.id}: no questions for variant ${v}.`);
    }
    for (const req of carrier.requiredWording ?? []) {
      const q = file.questions.find((x) => x.section === req.section && x.number === req.number);
      if (!q) { errors.push(`${carrier.id}: ${req.section} ${req.number} not found (${req.reason}).`); continue; }
      if (req.mustInclude && !q.text.includes(req.mustInclude)) errors.push(`${q.id}: must include "${req.mustInclude}" (${req.reason}).`);
      if (req.mustNotInclude && q.text.includes(req.mustNotInclude)) errors.push(`${q.id}: must not include "${req.mustNotInclude}" (${req.reason}).`);
    }
  }
  for (const c of carriers.carriers) {
    if (!questionFiles.some((f) => f.carrierId === c.id)) errors.push(`${c.id}: no question file.`);
  }

  // Shared wording: questions with the same sharedKey in one group must read
  // the same once each carrier's own name is neutralized.
  const groups = new Map();
  for (const file of questionFiles) {
    const carrier = byId.get(file.carrierId);
    if (!carrier?.sharedWordingGroup || file.status === 'awaiting-source') continue;
    if (!groups.has(carrier.sharedWordingGroup)) groups.set(carrier.sharedWordingGroup, []);
    groups.get(carrier.sharedWordingGroup).push({ carrier, file });
  }
  const namesIn = (/** @type {Carrier[]} */ cs) => cs.flatMap((c) => [c.name, c.name.split(' (')[0], c.name.split(' ')[0]]);
  for (const [group, members] of groups) {
    if (members.length < 2) continue;
    const names = namesIn(members.map((/** @type {{carrier: Carrier}} */ m) => m.carrier));
    const neutral = (/** @type {string} */ t) => normalize(names.reduce((s, n) => s.split(n).join('CARRIER'), t));
    const [first, ...rest] = members;
    for (const q of first.file.questions) {
      if (!q.sharedKey) { errors.push(`${q.id}: shared-wording carrier question without sharedKey.`); continue; }
      for (const other of rest) {
        const twin = other.file.questions.find((/** @type {Question} */ x) => x.sharedKey === q.sharedKey);
        if (!twin) { errors.push(`${group}: ${other.carrier.id} has no question with sharedKey ${q.sharedKey}.`); continue; }
        if (neutral(twin.text) !== neutral(q.text)) {
          warnings.push(`${group}: ${q.id} and ${twin.id} share key ${q.sharedKey} but the wording differs beyond the carrier name. Check against the source.`);
        }
      }
    }
  }

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const complete = pending.length === 0 && errors.length === 0 && total === carriers.expectedQuestionTotal;
  if (opts.requireComplete && !complete) {
    if (total !== carriers.expectedQuestionTotal) errors.push(`Dataset has ${total} question records, expected ${carriers.expectedQuestionTotal}.`);
  }
  return { errors, warnings, pending, counts, total, complete };
}
