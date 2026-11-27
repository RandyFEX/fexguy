// @ts-check
// 10 Easy Questions (Randy, November 2026, application funnel V1.0): the one
// shared definition of the questionnaire opened by APPLY NOW - 10 EASY
// QUESTIONS on the quote result cards. The page renders it
// (src/components/quote/ApplicationQuestions.astro) and the server validates
// submissions against it (server/quote/handler.js action `application`).
// Wording, order and feedback are Randy's, exactly; never reword, reorder or
// add questions. This is a preliminary questionnaire only: no underwriting,
// scoring, carrier matching or eligibility decision is made from it.

export const NONE = 'none';
export const NONE_LABEL = 'None of the above';

/** Feedback shown under an answered health question (exact wording; V1.7, Randy, November 2026). */
export const FEEDBACK = {
  conditions: 'Great news! Funeral Funds has companies that may cover these conditions.',
  none: 'Great news! You have no health concerns in this area.',
};

/**
 * Questions 2-10 (question 1 is height and weight). Options are listed in
 * Randy's alphabetical order; None of the above is always last.
 * @type {{ id: string, prompt: string, options: { id: string, label: string }[] }[]}
 */
export const HEALTH_QUESTIONS = [
  { id: 'q2', prompt: 'Do you have any of these health conditions?', options: [['arthritis', 'Arthritis'], ['high-blood-pressure', 'High blood pressure'], ['high-cholesterol', 'High cholesterol'], ['thyroid', 'Thyroid condition']] },
  { id: 'q3', prompt: 'Do you have any of these health conditions?', options: [['afib', 'AFib'], ['asthma', 'Asthma'], ['diabetes', 'Diabetes'], ['sleep-apnea', 'Sleep apnea']] },
  { id: 'q4', prompt: 'Do you have any of these health conditions?', options: [['anxiety', 'Anxiety'], ['bipolar', 'Bipolar disorder'], ['depression', 'Depression'], ['schizophrenia', 'Schizophrenia']] },
  { id: 'q5', prompt: 'In the last 2 years, have you had any of the following?', options: [['heart-attack', 'Heart attack'], ['heart-bypass', 'Heart bypass surgery'], ['heart-failure', 'Heart failure'], ['heart-stents', 'Heart stents'], ['stroke', 'Stroke']] },
  { id: 'q6', prompt: 'Have you ever had any of the following?', options: [['chronic-bronchitis', 'Chronic bronchitis'], ['copd', 'COPD'], ['emphysema', 'Emphysema'], ['oxygen', 'Supplemental oxygen use']] },
  // V2.5 (Randy, November 2026): no time limit in the question; the time frame is in the answers.
  { id: 'q7', prompt: 'Have you ever had cancer or received cancer treatment?', options: [['cancer-over-2-years', 'Cancer More Than 2 Years Ago'], ['cancer-last-2-years', 'Cancer In The Last 2 Years'], ['cancer-current', 'Currently Have Cancer']] },
  { id: 'q8', prompt: 'Have you ever had any of these diabetic complications?', options: [['diabetic-amputations', 'Diabetic amputations'], ['diabetic-coma', 'Diabetic coma'], ['diabetic-neuropathy', 'Diabetic neuropathy']] },
  { id: 'q9', prompt: 'Have you ever had any of the following?', options: [['alzheimers', 'Alzheimer’s disease'], ['dementia', 'Dementia'], ['kidney-disease', 'Kidney disease'], ['liver-disease', 'Liver disease']] },
  { id: 'q10', prompt: 'Do any of the following currently apply to you?', options: [['hospitalized', 'Hospitalized'], ['nursing-home', 'In a nursing home'], ['hospice', 'In hospice care'], ['pending-surgery', 'Pending surgery']] },
].map((q) => ({ id: q.id, prompt: q.prompt, options: [...q.options.map(([id, label]) => ({ id, label })), { id: NONE, label: NONE_LABEL }] }));

export const HEIGHT_PROMPT = 'What is your height and weight?';
export const LIMITS = { feet: { min: 3, max: 7 }, inches: { min: 0, max: 11 }, weight: { min: 50, max: 700 } };

/**
 * Validates a submission; returns the clean answers or null.
 * @param {any} a
 * @returns {{ heightFeet: number, heightInches: number, weight: number, health: Record<string, string[]> } | null}
 */
export function parseApplication(a) {
  if (!a || typeof a !== 'object') return null;
  const int = (/** @type {unknown} */ v, /** @type {{min:number,max:number}} */ r) => (Number.isInteger(v) && /** @type {number} */ (v) >= r.min && /** @type {number} */ (v) <= r.max ? /** @type {number} */ (v) : null);
  const heightFeet = int(a.heightFeet, LIMITS.feet);
  const heightInches = int(a.heightInches, LIMITS.inches);
  const weight = int(a.weight, LIMITS.weight);
  if (heightFeet === null || heightInches === null || weight === null) return null;
  /** @type {Record<string, string[]>} */
  const health = {};
  for (const q of HEALTH_QUESTIONS) {
    const v = a.health?.[q.id];
    if (!Array.isArray(v) || !v.length || v.length > q.options.length) return null;
    const ids = q.options.map((o) => o.id);
    if (v.some((x) => typeof x !== 'string' || !ids.includes(x)) || new Set(v).size !== v.length) return null;
    // None of the above stands alone.
    if (v.includes(NONE) && v.length > 1) return null;
    health[q.id] = ids.filter((id) => v.includes(id));
  }
  return { heightFeet, heightInches, weight, health };
}

/** The answers as readable lines, by question (exact labels). @param {NonNullable<ReturnType<typeof parseApplication>>} ans */
export function applicationLines(ans) {
  return [
    `1. ${HEIGHT_PROMPT} ${ans.heightFeet} ft ${ans.heightInches} in, ${ans.weight} lb`,
    ...HEALTH_QUESTIONS.map((q, i) => `${i + 2}. ${q.prompt} ${ans.health[q.id].map((id) => q.options.find((o) => o.id === id)?.label).join(', ')}`),
  ];
}
