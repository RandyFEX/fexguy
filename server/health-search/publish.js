// @ts-check
// Building, checking and exporting the private question payload (used by
// scripts/health-search-publish.mjs and by the tests).

import { validateDataset } from './validate.js';

/**
 * @param {{ expectedQuestionTotal: number, carriers: any[] }} carriers
 * @param {{ concepts: any[] }} concepts
 * @param {import('./validate.js').QuestionFile[]} questionFiles
 * @param {'preview' | 'production'} target
 * @param {Date} [now]
 */
export function buildPayload(carriers, concepts, questionFiles, target, now = new Date()) {
  const result = validateDataset({ carriers, questionFiles, concepts }, { requireComplete: target === 'production' });
  if (result.errors.length) return { ok: false, result, payload: null };
  /** @type {import('./question-store.js').QuestionPayload} */
  const payload = {
    format: 1,
    target,
    publishedAt: now.toISOString(),
    total: result.total,
    complete: result.complete,
    questions: questionFiles.flatMap((f) => f.questions.map((q) => ({ carrierId: f.carrierId, ...q }))),
  };
  return { ok: true, result, payload };
}

/**
 * Splits a payload back into per-carrier files (for backup and editing).
 * @param {import('./question-store.js').QuestionPayload} payload
 */
export function payloadToFiles(payload) {
  /** @type {Map<string, any[]>} */
  const by = new Map();
  for (const { carrierId, ...q } of payload.questions) {
    if (!by.has(carrierId)) by.set(carrierId, []);
    by.get(carrierId)?.push(q);
  }
  return [...by].map(([carrierId, questions]) => ({
    carrierId,
    status: 'complete',
    source: `Exported from the search store (published ${payload.publishedAt})`,
    questions,
  }));
}
