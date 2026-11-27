// @ts-check
// Agent CRM Comments summary (Randy, November 2026, V1.4): a compact, plain
// summary of the prospect written to the contact's existing "Comments" custom
// field (fieldKey contact.comments, the same field the Reschedule form writes;
// server/reschedule/handler.js), never to Notes. Written once at lead delivery
// and replaced with the extended version when the 10 Easy Questions are
// submitted. Earlier generated summaries are removed; any other text in the
// field is kept below the summary. The full answers and the time stay in the
// lead record only.
import { HEALTH_QUESTIONS, NONE } from './application.js';

export const COMMENTS_FIELD_KEY = 'comments';
const COMMENTS_MAX = 50000;

export const STATE_ABBR = /** @type {Record<string, string>} */ ({
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY',
  Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
});

/** The questions' own timeframes, kept on affirmative answers. */
// V2.5: question 7's answers carry their own time frame (e.g. "Cancer In The Last 2 Years").
const TIMEFRAME = /** @type {Record<string, string>} */ ({ q5: ' (last 2 years)', q10: ' (currently)' });

/** Comments name for a carrier (Aetna's card shows the CVS/aetna logo; Randy's format says CVS). @param {string} c */
const shortName = (c) => (c === 'Aetna' ? 'CVS' : c);
/** @param {number} n */
const dollars = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * The displayed rates, in card order, as stored on the lead.
 * @param {any[]} categories priceCategories() output
 * @returns {{ name: string, premium: string, coverage: number | null }[]}
 */
export function commentRates(categories) {
  return (categories ?? [])
    .filter((c) => c?.status === 'ok' && c.monthlyPremium)
    .map((c) => ({ name: shortName(c.carriers?.[0]?.carrier ?? c.label), premium: String(c.monthlyPremium), coverage: typeof c.coverage === 'number' ? c.coverage : null }));
}

/** @param {any} answers parseApplication() output */
export function conditionsLine(answers) {
  /** @type {string[]} */
  const picked = [];
  for (const q of HEALTH_QUESTIONS) {
    for (const id of answers?.health?.[q.id] ?? []) {
      if (id === NONE) continue;
      const o = q.options.find((x) => x.id === id);
      if (o) picked.push(`${o.label}${TIMEFRAME[q.id] ?? ''}`);
    }
  }
  if (!picked.length) return 'No listed health conditions reported.';
  return picked.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).join(', ');
}

/**
 * The summary. Before the questionnaire: identity line, coverage, rates.
 * After it: plus height/weight and the conditions.
 * @param {any} record the lead record @param {any} quote the displayed quote
 * @param {{ name: string, premium: string, coverage: number | null }[]} rates
 * @param {any} [answers] parseApplication() output, once submitted
 */
export function commentsSummary(record, quote, rates, answers) {
  const q = { ...(record.quoteAtSubmission ?? {}), ...(quote ?? {}) };
  const state = STATE_ABBR[record.state] ?? record.state ?? '';
  const lines = [
    [q.age, q.gender === 'female' ? 'Female' : q.gender === 'male' ? 'Male' : '', state, q.tobacco === true ? 'Tobacco' : q.tobacco === false ? 'Non-tobacco' : ''].filter((x) => x !== '' && x !== undefined && x !== null).join(' | '),
    'premium' in q ? `$${q.premium}/mo Budget` : `${dollars(Number(q.coverage))} Coverage`,
    ...rates.map((r) => ('premium' in q && r.coverage ? `${r.name}: ${dollars(r.coverage)} for $${r.premium}/mo` : `${r.name}: $${r.premium}/mo`)),
  ];
  if (answers) {
    lines.push(`${answers.heightFeet}’${answers.heightInches}” | ${answers.weight} lbs`);
    lines.push(conditionsLine(answers));
  }
  return lines.join('\n');
}

/** First line of a generated summary ("67 | Female | TX | Non-tobacco"). */
const HEAD = /^\d{2} \| (Male|Female) \| [A-Z]{2} \| (Tobacco|Non-tobacco)$/;
/** Lines that belong to a generated summary block. */
const BODY = [/^\$[\d,.]+ Coverage$/, /^\$[\d.]+\/mo Budget$/, /^[A-Za-z .&']+: (\$[\d,]+ for )?\$[\d.]+\/mo$/, /^\d’\d{1,2}” \| \d{2,3} lbs$/];

/**
 * The new field value: the summary on top, earlier generated summaries
 * removed, every other line kept below in its order.
 * @param {string} summary @param {string} existing
 */
export function mergeComments(summary, existing) {
  const lines = String(existing ?? '').replace(/\r\n?/g, '\n').split('\n');
  /** @type {string[]} */
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (!HEAD.test(lines[i].trim())) { kept.push(lines[i]); continue; }
    // Skip the generated block that starts here.
    let j = i + 1;
    let measured = false;
    while (j < lines.length && BODY.some((r) => r.test(lines[j].trim()))) {
      if (BODY[3].test(lines[j].trim())) measured = true;
      j++;
    }
    // An extended summary's conditions line always follows its height line.
    if (measured && j < lines.length) j++;
    i = j - 1;
  }
  const rest = kept.join('\n').replace(/^\n+|\n+$/g, '');
  return (rest ? `${summary}\n${rest}` : summary).slice(0, COMMENTS_MAX);
}

/**
 * Writes the summary to the contact's Comments field. Returns "updated" or the
 * step that failed ("field-lookup-<status>", "field-not-found", "read-<status>", "write-<status>").
 * @param {(path: string, body: unknown, method?: string) => Promise<{ res: Response, data: any }>} call
 * @param {string} locationId @param {string} contactId @param {string} summary
 */
export async function writeComments(call, locationId, contactId, summary) {
  const id = encodeURIComponent(contactId);
  const values = (/** @type {any} */ c) => /** @type {{ id: string, value: unknown }[]} */ (c.data?.contact?.customFields ?? []);
  // The contact's custom fields come back by id, so find the Comments field's id first
  // (key contact.comments, or the field named "Comments").
  const defs = await call(`/locations/${encodeURIComponent(locationId)}/customFields?model=contact`, undefined, 'GET');
  const field = defs.res.ok
    ? (defs.data?.customFields ?? []).find((/** @type {any} */ f) => f?.fieldKey === `contact.${COMMENTS_FIELD_KEY}`) ??
      (defs.data?.customFields ?? []).find((/** @type {any} */ f) => String(f?.name ?? '').trim().toLowerCase() === COMMENTS_FIELD_KEY)
    : null;
  const contact = await call(`/contacts/${id}`, undefined, 'GET');
  if (!contact.res.ok) return `read-${contact.res.status}`;
  if (field?.id) {
    const current = values(contact).find((f) => f?.id === field.id)?.value;
    const value = mergeComments(summary, typeof current === 'string' ? current : '');
    const put = await call(`/contacts/${id}`, { customFields: [{ id: field.id, field_value: value }] }, 'PUT');
    return put.res.ok ? 'updated' : `write-${put.res.status}`;
  }
  // V1.9 (Randy, November 2026): when the field list can't be read (the token may lack
  // the custom-fields read scope; the contact writes by key already work, as for
  // lowest_10k_rate), write by the field key, then find which field took the value
  // and put any earlier text of that field back below the summary.
  const byKey = await call(`/contacts/${id}`, { customFields: [{ key: COMMENTS_FIELD_KEY, field_value: summary }] }, 'PUT');
  if (!byKey.res.ok) return `write-key-${byKey.res.status}${defs.res.ok ? '' : ` (lookup ${defs.res.status})`}`;
  const after = await call(`/contacts/${id}`, undefined, 'GET');
  const hit = after.res.ok ? values(after).find((f) => f?.value === summary) : null;
  if (!hit) return 'updated-by-key';
  const before = values(contact).find((f) => f?.id === hit.id)?.value;
  const merged = mergeComments(summary, typeof before === 'string' ? before : '');
  if (merged === summary) return 'updated-by-key';
  const put = await call(`/contacts/${id}`, { customFields: [{ id: hit.id, field_value: merged }] }, 'PUT');
  return put.res.ok ? 'updated-by-key' : `write-${put.res.status}`;
}
