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

export const LIMITS = { minQueryChars: 2, maxQueryChars: 60, groupsPerPage: 3, maxMatches: 40, maxPage: 10 };

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
  return { dataset, concepts, conceptById, carrierById, questions };
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
    .map(({ carrier, ms }) => presentGroup(carrier, ms));

  // Guaranteed issue carriers (no health questions) close the list.
  const giCarriers = prep.dataset.carriers.filter((c) => c.guaranteedIssue).sort((a, b) => a.displayOrder - b.displayOrder);
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
    guaranteedIssue: page >= totalPages && capped.length ? giCarriers.map(presentGuaranteedIssue) : [],
    sample: Boolean(prep.dataset.sample),
  };
}

/** @param {Carrier} carrier */
function publicName(carrier) {
  return carrier.publicDisplay === 'anonymized' ? carrier.anonymizedName ?? 'One insurance company' : carrier.name;
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

/** @param {Carrier} carrier @param {{ q: Question, type: 'direct' | 'related', because: string }[]} ms */
function presentGroup(carrier, ms) {
  // Direct matches first, then related ones; each in the application's own order.
  const ordered = [...ms].sort((a, b) => (a.type === b.type ? 0 : a.type === 'direct' ? -1 : 1) || /** @type {any} */ (a.q).order - /** @type {any} */ (b.q).order);
  const usedSchedules = new Set();
  const questions = ordered.map(({ q, type, because }) => {
    const yes = outcome(carrier, q.yes);
    const no = outcome(carrier, q.no);
    for (const c of [yes?.classification, no?.classification]) {
      if (c === 'modified' && carrier.schedules.modified) usedSchedules.add('modified');
      if ((c === 'graded' || c === 'timeframe') && carrier.schedules.graded) usedSchedules.add('graded');
    }
    return {
      section: q.section,
      number: q.number,
      variant: q.variant ?? null,
      text: q.text,
      match: type,
      because,
      info: outcome(carrier, q.info),
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
