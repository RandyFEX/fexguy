// @ts-check
// Health-question search over the private dataset. Matching uses normalized
// text and medical terminology (concepts.json); what is returned is always
// the verbatim application wording plus the approved outcome explanations.
//
// Match types:
//   direct  - the question's own wording contains the searched term, or a
//             medically equivalent name for it (e.g. "MI" for heart attack),
//             or the record lists the concept as one it asks about.
//   related - only connected through a related condition or an indicator
//             (medication, device, treatment). Always labeled as related:
//             the carrier is not said to ask about the searched term.

import { normalize, tokens, phraseKey, containsPhrase, editDistance, allowedTypos } from './normalize.js';

// groupsPerPage covers every carrier (7), so all matching carriers show on
// the first page instead of behind "Show more" (Randy, November 2026).
export const LIMITS = { minQueryChars: 2, maxQueryChars: 60, groupsPerPage: 7, maxMatches: 40, maxPage: 10 };

/** @typedef {import('./validate.js').Carrier} Carrier */
/** @typedef {import('./validate.js').Question} Question */
/** @typedef {import('./validate.js').Concept} Concept */
/** @typedef {{ carriers: Carrier[], questions: (Question & { carrierId: string })[], concepts: Concept[], sample?: boolean }} Dataset */

/**
 * Pre-computes normalized keys once per dataset.
 * @param {Dataset} dataset
 */
export function prepare(dataset) {
  const concepts = dataset.concepts.map((c) => ({
    ...c,
    termKeys: c.terms.map(phraseKey).filter(Boolean),
    indicatorKeys: c.indicators.map(phraseKey).filter(Boolean),
  }));
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const carrierById = new Map(dataset.carriers.map((c) => [c.id, c]));
  const questions = dataset.questions.map((q, order) => ({ ...q, order, textKey: phraseKey(q.text) }));
  // Carrier names a visitor may type ("Aflac COPD"); longest first so
  // "family benefit life" is removed whole before "family benefit".
  const carrierNames = dataset.carriers
    .flatMap((c) => (c.searchNames ?? [c.name]).map((n) => ({ id: c.id, key: phraseKey(n) })))
    .filter((n) => n.key)
    .sort((a, b) => b.key.length - a.key.length);
  // Each carrier's own payout lines per plan, from the "MODIFIED COVERAGE:" /
  // "GRADED COVERAGE:" sections of its records (Randy's wording), used where
  // an outcome points to that plan without listing the payouts itself.
  /** @type {Map<string, Record<string, string[]>>} */
  const planLines = new Map();
  for (const q of dataset.questions) {
    for (const o of [q.yes, q.no]) {
      let plan = null;
      for (const line of (o?.explanation ?? '').split('\n').map((l) => l.trim())) {
        const m = line.match(SECTION);
        if (m) { plan = schedulePlan(m[1].toLowerCase()); continue; }
        if (plan && /^Months\b/.test(line)) {
          const own = planLines.get(q.carrierId) ?? {};
          if (!own[plan]) own[plan] = [];
          if (!own[plan].includes(line) && own[plan].length < 3) own[plan].push(line);
          planLines.set(q.carrierId, own);
        }
      }
    }
  }
  return { dataset, concepts, conceptById, carrierById, questions, carrierNames, planLines };
}

/** @typedef {ReturnType<typeof prepare>} Prepared */

/**
 * Which concepts the query names (exactly, or within typo tolerance) and
 * which it only points to through an indicator.
 * @param {Prepared} prep @param {string} query
 */
export function detectConcepts(prep, query) {
  const qKey = phraseKey(query);
  const qTokens = qKey.split(' ').filter(Boolean);
  /** @type {Map<string, { via: 'term' | 'fuzzy' | 'indicator', term: string }>} */
  const found = new Map();
  for (const c of prep.concepts) {
    for (let i = 0; i < c.termKeys.length; i++) {
      const tk = c.termKeys[i];
      if (containsPhrase(qKey, tk)) { found.set(c.id, { via: 'term', term: c.terms[i] }); break; }
    }
    if (found.has(c.id)) continue;
    for (let i = 0; i < c.termKeys.length && !found.has(c.id); i++) {
      const tk = c.termKeys[i];
      const tTokens = tk.split(' ');
      // Whole-query typo match ("diabetis", "emphazema", "congestive hart failure").
      if (qTokens.length <= 4 && tk.length >= 5 && editDistance(qKey, tk, allowedTypos(tk.length)) <= allowedTypos(tk.length)) {
        found.set(c.id, { via: 'fuzzy', term: c.terms[i] });
      } else if (tTokens.length === 1 && tk.length >= 5) {
        // Single-word term mistyped inside a longer query ("i had a strok").
        if (qTokens.some((t) => t.length >= 4 && editDistance(t, tk, allowedTypos(tk.length)) <= allowedTypos(tk.length))) {
          found.set(c.id, { via: 'fuzzy', term: c.terms[i] });
        }
      }
    }
    if (found.has(c.id)) continue;
    for (let i = 0; i < c.indicatorKeys.length; i++) {
      if (containsPhrase(qKey, c.indicatorKeys[i])) { found.set(c.id, { via: 'indicator', term: c.indicators[i] }); break; }
    }
  }
  return found;
}

/**
 * @param {Prepared} prep
 * @param {string} rawQuery
 * @param {{ page?: number }} [opts]
 */
export function search(prep, rawQuery, opts = {}) {
  // A carrier name narrows the results to that carrier. On its own it is not
  // a search: the API never lists a carrier's whole question set.
  const named = findCarriers(prep, rawQuery);
  if (named.ids.size) {
    if (!tokens(normalize(named.rest)).join('').length) {
      return { ok: false, reason: 'carrier-only', carriers: [...named.ids].map((id) => publicName(/** @type {Carrier} */ (prep.carrierById.get(id)))) };
    }
    const r = searchConditions(prep, named.rest, opts, named.ids);
    return r.ok ? { ...r, carrierFilter: [...named.ids].map((id) => publicName(/** @type {Carrier} */ (prep.carrierById.get(id)))) } : r;
  }
  return searchConditions(prep, rawQuery, opts, null);
}

/**
 * Carrier names in the query, and the query without them.
 * @param {Prepared} prep @param {string} rawQuery
 */
export function findCarriers(prep, rawQuery) {
  let rest = ` ${phraseKey(rawQuery)} `;
  /** @type {Set<string>} */
  const ids = new Set();
  for (const n of prep.carrierNames) {
    if (rest.includes(` ${n.key} `)) {
      ids.add(n.id);
      rest = rest.split(` ${n.key} `).join(' ');
    }
  }
  return { ids, rest: rest.trim() };
}

/**
 * @param {Prepared} prep
 * @param {string} rawQuery
 * @param {{ page?: number }} opts
 * @param {Set<string> | null} onlyCarriers
 */
function searchConditions(prep, rawQuery, opts, onlyCarriers) {
  const query = normalize(rawQuery);
  const meaningful = tokens(query);
  if (meaningful.join('').length < LIMITS.minQueryChars) return { ok: false, reason: 'too-short' };
  const qKey = meaningful.join(' ');
  const concepts = detectConcepts(prep, rawQuery);
  const named = [...concepts].filter(([, m]) => m.via !== 'indicator').map(([id]) => id);
  const indicated = [...concepts].filter(([, m]) => m.via === 'indicator').map(([id]) => id);
  const relatedIds = new Set(named.flatMap((id) => prep.conceptById.get(id)?.related ?? []).filter((id) => !named.includes(id)));

  /** @param {string} id @param {string} textKey */
  const conceptInText = (id, textKey) => {
    const c = prep.conceptById.get(id);
    if (!c) return null;
    const i = c.termKeys.findIndex((tk) => containsPhrase(textKey, tk));
    return i >= 0 ? c.terms[i] : null;
  };

  const matches = [];
  for (const q of prep.questions) {
    if (onlyCarriers && !onlyCarriers.has(q.carrierId)) continue;
    let score = 0;
    /** @type {'direct' | 'related' | null} */
    let type = null;
    let because = '';
    const direct = q.search?.direct ?? [];
    const related = q.search?.related ?? [];
    if (qKey.length >= 3 && containsPhrase(q.textKey, qKey)) {
      score = 100; type = 'direct'; because = 'Your search words appear in this question.';
    }
    for (const id of named) {
      if (type === 'direct') break;
      const term = conceptInText(id, q.textKey);
      const label = prep.conceptById.get(id)?.label ?? id;
      if (term) { score = 90; type = 'direct'; because = `This question names ${label.toLowerCase()} (as "${term}").`; }
      else if (direct.includes(id)) { score = 85; type = 'direct'; because = `This question covers ${label.toLowerCase()}.`; }
    }
    if (!type && meaningful.length >= 2 && meaningful.every((t) => t.length >= 3 && containsPhrase(q.textKey, t))) {
      score = 70; type = 'direct'; because = 'All of your search words appear in this question.';
    }
    if (!type) {
      for (const id of [...relatedIds, ...indicated]) {
        if (conceptInText(id, q.textKey) || direct.includes(id) || related.includes(id)) {
          score = indicated.includes(id) ? 35 : 40; type = 'related';
          because = `Related: this question is about ${(prep.conceptById.get(id)?.label ?? id).toLowerCase()}, which is connected to your search. It does not mention your search term itself.`;
          break;
        }
      }
    }
    if (!type) {
      for (const id of named) {
        if (related.includes(id)) {
          score = 30; type = 'related';
          because = `Related: this question may be relevant to ${(prep.conceptById.get(id)?.label ?? id).toLowerCase()}, but it does not ask about it by name.`;
          break;
        }
      }
    }
    if (type) matches.push({ q, score, type, because });
  }

  matches.sort((a, b) => (a.type === b.type ? 0 : a.type === 'direct' ? -1 : 1) || b.score - a.score || a.q.order - b.q.order);
  const capped = matches.slice(0, LIMITS.maxMatches);

  // Group by carrier: carriers with direct matches first (best score), then
  // the configured display order; questions keep their source order.
  /** @type {Map<string, typeof capped>} */
  const groupsMap = new Map();
  for (const m of capped) {
    if (!groupsMap.has(m.q.carrierId)) groupsMap.set(m.q.carrierId, []);
    groupsMap.get(m.q.carrierId)?.push(m);
  }
  const groups = [...groupsMap.entries()]
    .map(([carrierId, ms]) => ({ carrier: /** @type {Carrier} */ (prep.carrierById.get(carrierId)), ms }))
    .sort((a, b) => {
      const bestA = Math.max(...a.ms.map((m) => (m.type === 'direct' ? 1000 : 0) + m.score));
      const bestB = Math.max(...b.ms.map((m) => (m.type === 'direct' ? 1000 : 0) + m.score));
      return bestB - bestA || a.carrier.displayOrder - b.carrier.displayOrder;
    })
    .map(({ carrier, ms }) => presentGroup(carrier, ms, prep.planLines.get(carrier.id) ?? {}));

  // Guaranteed issue carriers (no health questions) close the list.
  const giCarriers = prep.dataset.carriers.filter((c) => c.guaranteedIssue && (!onlyCarriers || onlyCarriers.has(c.id))).sort((a, b) => a.displayOrder - b.displayOrder);
  const page = Math.min(Math.max(1, Math.trunc(opts.page ?? 1) || 1), LIMITS.maxPage);
  const totalPages = Math.max(1, Math.ceil(groups.length / LIMITS.groupsPerPage));
  const pageGroups = groups.slice((page - 1) * LIMITS.groupsPerPage, page * LIMITS.groupsPerPage);
  return {
    ok: true,
    matchCount: capped.length,
    directCount: capped.filter((m) => m.type === 'direct').length,
    page: Math.min(page, totalPages),
    totalPages,
    groups: pageGroups,
    guaranteedIssue: page >= totalPages && (capped.length || onlyCarriers) ? giCarriers.map(presentGuaranteedIssue) : [],
    sample: Boolean(prep.dataset.sample),
  };
}

/** @param {Carrier} carrier */
function publicName(carrier) {
  return carrier.publicDisplay === 'anonymized' ? carrier.anonymizedName ?? 'One insurance company' : carrier.name;
}

// Answer rows for display: "YES/NO + primary outcome" with its supporting
// lines underneath. Built only from the approved wording, never reworded:
// - "X COVERAGE:" labels in Randy's text start a section; the label itself
//   isn't shown, its section becomes one row (so an answer with two approved
//   outcomes, e.g. first-day or modified, shows two rows with the same
//   YES/NO), and the section's lines become the details.
// - Otherwise the first line is the primary outcome and the rest are details.
//   Where that first line is only a call instruction, the primary names the
//   outcome the line itself states (CALL_PRIMARY) and the line stays a detail.
// - An outcome that points to a modified or graded plan without payout lines
//   of its own gets the carrier's approved schedule as details.
// - A carrier rule's note (e.g. CICA's eligibility note) is the last detail.
const SECTION = /^([A-Z][A-Z -]*?) COVERAGE:$/;
export const LUCK = "You're in luck! ";
const CALL_PRIMARY = /** @type {Record<string, string>} */ ({
  'first-day-standard': 'First-day standard coverage',
  'first-day-preferred': 'First-day preferred coverage',
  'non-smoker-rates': 'Lower "non-smoker" rates',
});
/** @param {string} label e.g. "FIRST-DAY" -> "First-day coverage" */
const sectionName = (label) => `${label.charAt(0)}${label.slice(1).toLowerCase()} coverage`;

/**
 * @param {Carrier} carrier
 * @param {'YES' | 'NO'} answer
 * @param {import('./validate.js').Outcome | undefined} o
 * @param {Record<string, string[]>} [ownPlanLines] the carrier's own payout lines per plan
 * @returns {{ answer: 'YES' | 'NO', primary: string, details: string[] }[]}
 */
export function answerRows(carrier, answer, o, ownPlanLines = {}) {
  if (!o) return [];
  const rule = o.rule ? carrier.rules[o.rule] : null;
  const classification = o.classification ?? rule?.classification ?? null;
  const lines = (o.explanation ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  /** @type {string[]} */
  const head = [];
  /** @type {{ label: string, lines: string[] }[]} */
  const sections = [];
  for (const line of lines) {
    const m = line.match(SECTION);
    if (m) sections.push({ label: m[1], lines: [] });
    else if (sections.length) sections[sections.length - 1].lines.push(line);
    else head.push(line);
  }
  /** @type {{ answer: 'YES' | 'NO', primary: string, details: string[] }[]} */
  let rows;
  if (sections.length > 1) {
    // "First-day or modified coverage may be available." + one section each.
    const may = head.some((l) => /may be available/i.test(l)) ? ' may be available' : '';
    rows = sections.map((sec) => ({ answer, primary: `${sectionName(sec.label)}${may}`, details: sec.lines }));
  } else if (sections.length === 1) {
    const sec = sections[0];
    const first = head[0];
    if (first && !/^Call\b/.test(first)) rows = [{ answer, primary: first, details: [...head.slice(1), ...sec.lines] }];
    else rows = [{ answer, primary: (classification && CALL_PRIMARY[classification]) || sectionName(sec.label), details: [...head, ...sec.lines] }];
  } else if (head.length) {
    const first = head[0];
    if (/^Call\b/.test(first) && classification && CALL_PRIMARY[classification]) rows = [{ answer, primary: CALL_PRIMARY[classification], details: head }];
    else rows = [{ answer, primary: first, details: head.slice(1) }];
  } else if (rule?.explanation) {
    return [{ answer, primary: rule.explanation, details: [] }];
  } else {
    return [];
  }
  // Exact repeats of a line add nothing (the wording itself is never changed).
  for (const r of rows) r.details = r.details.filter((d, i, all) => d !== r.primary && all.indexOf(d) === i);
  const plan = schedulePlan(classification);
  if (plan && rows.length === 1 && !rows[0].details.some((d) => /^Months\b/.test(d))) {
    const own = ownPlanLines[plan];
    const schedule = carrier.schedules[plan];
    if (own?.length) rows[0].details.push(...own);
    else if (schedule) rows[0].details.push(...schedule.periods.map((p) => `Months ${p.months}: ${p.benefit}`));
  }
  if (rule?.explanation) rows[rows.length - 1].details.push(rule.explanation);
  // The bold primary line reads as a label, without a closing period.
  for (const r of rows) r.primary = r.primary.replace(/\.$/, '');
  // First-day outcomes: the first call instruction opens with "You're in
  // luck!" (Randy, November 2026). Presentation only; the records keep their
  // wording. Never on graded, modified, guaranteed issue or decline rows.
  for (const r of rows) {
    if (!/^First-day\b/.test(r.primary)) continue;
    const i = r.details.findIndex((d) => /^Call 888-862-9456\b/.test(d));
    if (i >= 0) r.details[i] = `${LUCK}${r.details[i]}`;
  }
  return rows;
}

/** @param {Carrier} carrier @param {import('./validate.js').Outcome | undefined} o */
function outcome(carrier, o) {
  if (!o) return null;
  const rule = o.rule ? carrier.rules[o.rule] : null;
  const classification = o.classification ?? rule?.classification ?? null;
  // A record's own wording comes first; an approved carrier rule adds its note.
  const explanation = [o.explanation, rule?.explanation].filter(Boolean).join('\n') || null;
  return explanation ? { classification, explanation } : null;
}

// Outcomes that point to a reduced-benefit plan show that plan's approved
// payout schedule. Randy's records name them "modified-may-be-available",
// "graded-may-be-available" and "graded-plan" (the sample data uses the
// short forms). "first-day-or-…" outcomes don't point to one plan.
const SCHEDULE_FOR = /** @type {Record<string, 'modified' | 'graded'>} */ ({
  modified: 'modified',
  'modified-may-be-available': 'modified',
  graded: 'graded',
  'graded-may-be-available': 'graded',
  'graded-plan': 'graded',
  timeframe: 'graded',
});
/** @param {string | null | undefined} c */
function schedulePlan(c) {
  return c ? SCHEDULE_FOR[c] ?? null : null;
}

/** @param {Carrier} carrier @param {{ q: Question, type: 'direct' | 'related', because: string }[]} ms @param {Record<string, string[]>} [planLines] */
function presentGroup(carrier, ms, planLines = {}) {
  // Direct matches first, then related ones; each in the application's own order.
  const ordered = [...ms].sort((a, b) => (a.type === b.type ? 0 : a.type === 'direct' ? -1 : 1) || /** @type {any} */ (a.q).order - /** @type {any} */ (b.q).order);
  const usedSchedules = new Set();
  const questions = ordered.map(({ q, type, because }) => {
    const yes = outcome(carrier, q.yes);
    const no = outcome(carrier, q.no);
    for (const c of [yes?.classification, no?.classification]) {
      const plan = schedulePlan(c);
      if (plan && carrier.schedules[plan]) usedSchedules.add(plan);
    }
    return {
      section: q.section,
      number: q.number,
      variant: q.variant ?? null,
      text: q.text,
      match: type,
      because,
      info: outcome(carrier, q.info),
      answers: [...answerRows(carrier, 'YES', q.yes, planLines), ...answerRows(carrier, 'NO', q.no, planLines)],
      yes,
      no,
    };
  });
  return {
    carrier: publicName(carrier),
    anonymized: carrier.publicDisplay === 'anonymized',
    questions,
    schedules: [...usedSchedules].map((k) => carrier.schedules[k]),
  };
}

/** @param {Carrier} carrier */
function presentGuaranteedIssue(carrier) {
  return {
    carrier: publicName(carrier),
    summary: carrier.summary ?? '',
    schedules: Object.values(carrier.schedules),
  };
}
