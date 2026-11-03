// @ts-check
// Carrier-specific health-question intake after Apply Now (Quote System
// v2.5). This is application information for Randy's review, not an
// application submitted to an insurer.
//
// Questions come only from the published Health Question Search records
// (Randy's verbatim carrier application wording, hqs:questions:<ns>), never
// from the fictional preview sample, and never invented. The browser gets one
// question at a time, only after a verified Apply Now (never a carrier's
// whole question set). Every answer is kept in the lead's evidence record.
//
// Products and their question sets:
//   FF-101 Aetna Standard          -> 'aetna' records
//   FF-102 Mutual of Omaha Level   -> no question set in the database yet:
//                                     agent-assistance continuation
//   FF-201 Gerber Guaranteed Life  -> guaranteed issue, no health questions

import { checkPayload, questionsKey } from '../health-search/question-store.js';
import { config } from '../health-search/config.generated.js';

/** Attribution code -> Health Question Search carrier id (null: no question set). */
export const INTAKE_CARRIER = /** @type {Record<string, string | null>} */ ({ 'FF-101': 'aetna', 'FF-102': null, 'FF-201': 'gerber-life' });

/**
 * The question set for a product, from the published records only.
 * @param {{ get(key: string): Promise<string | null> }} raw
 * @param {Record<string, string | undefined>} env
 * @param {string} code
 * @returns {Promise<{ mode: 'questions', carrierId: string, questions: any[] } | { mode: 'none', reason: 'guaranteed-issue' | 'no-question-set', carrierId: string | null }>}
 */
export async function intakePlan(raw, env, code) {
  const carrierId = INTAKE_CARRIER[code] ?? null;
  if (!carrierId) return { mode: 'none', reason: 'no-question-set', carrierId: null };
  const carrier = config.carriers.find((c) => c.id === carrierId);
  if (carrier?.guaranteedIssue) return { mode: 'none', reason: 'guaranteed-issue', carrierId };
  let payload = null;
  try {
    const text = await raw.get(questionsKey(env));
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!payload || !checkPayload(payload, config).ok) return { mode: 'none', reason: 'no-question-set', carrierId };
  const questions = payload.questions.filter((/** @type {any} */ q) => q.carrierId === carrierId);
  if (!questions.length) return { mode: 'none', reason: 'no-question-set', carrierId };
  return { mode: 'questions', carrierId, questions };
}

/** The classification a YES or NO answer leads to (decline, modified, ...), per the carrier's rules. @param {string} carrierId @param {any} q @param {'yes' | 'no'} answer */
export function outcomeOf(carrierId, q, answer) {
  const o = q?.[answer];
  if (!o) return null;
  if (o.classification) return String(o.classification);
  const carrier = /** @type {any} */ (config.carriers.find((c) => c.id === carrierId));
  return o.rule ? carrier?.rules?.[o.rule]?.classification ?? null : null;
}

/** The public view of a question (wording only: no outcomes or rules). @param {any} q @param {number} index @param {number} total */
export const publicQuestion = (q, index, total) => ({ id: String(q.id), section: String(q.section ?? ''), number: String(q.number ?? ''), text: String(q.text), index, total });
