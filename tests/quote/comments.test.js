// V1.4 (Randy, November 2026): the Agent CRM Comments summary (server/quote/comments.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { commentRates, commentsSummary, mergeComments, writeComments } from '../../server/quote/comments.js';
import { HEALTH_QUESTIONS } from '../../server/quote/application.js';

const record = { firstName: 'Pat Applicant', phone: '+12148675320', state: 'Texas', quoteAtSubmission: { age: 67, gender: 'female', tobacco: false, coverage: 5000 } };
const categories = [
  { status: 'ok', monthlyPremium: '26.53', carriers: [{ carrier: 'Mutual of Omaha' }] },
  { status: 'ok', monthlyPremium: '28.42', carriers: [{ carrier: 'Aetna' }] },
  { status: 'ok', monthlyPremium: '35.18', carriers: [{ carrier: 'Gerber Life' }] },
];
const quote = { age: 67, gender: 'female', tobacco: false, coverage: 5000 };
const BEFORE = '67 | Female | TX | Non-tobacco\n$5,000 Coverage\nMutual of Omaha: $26.53/mo\nCVS: $28.42/mo\nGerber Life: $35.18/mo';
const none = Object.fromEntries(HEALTH_QUESTIONS.map((q) => [q.id, ['none']]));

test('before the questionnaire: exactly the five lines', () => {
  assert.equal(commentsSummary(record, quote, commentRates(categories)), BEFORE);
});

test('after the questionnaire: height/weight and alphabetized conditions with their timeframes', () => {
  const answers = { heightFeet: 5, heightInches: 6, weight: 165, health: { ...none, q2: ['high-blood-pressure', 'arthritis'], q3: ['diabetes'], q5: ['stroke'], q10: ['hospitalized'] } };
  assert.equal(commentsSummary(record, quote, commentRates(categories), answers), `${BEFORE}\n5’6” | 165 lbs\nArthritis, Diabetes, High blood pressure, Hospitalized (currently), Stroke (last 2 years)`);
});

test('no conditions selected', () => {
  const s = commentsSummary(record, quote, commentRates(categories), { heightFeet: 6, heightInches: 0, weight: 200, health: none });
  assert.equal(s.split('\n').slice(-2).join('\n'), '6’0” | 200 lbs\nNo listed health conditions reported.');
  assert.ok(!/None of the above|RATES|APPLICATION|\n\n/.test(s));
});

test('merge: earlier generated summaries are replaced, other comments kept, no duplicates', () => {
  const after = `${BEFORE}\n5’6” | 165 lbs\nArthritis`;
  const existing = `${BEFORE}\n11/24/2026 3:52 PM: call after 5pm\nPrefers mornings`;
  assert.equal(mergeComments(after, existing), `${after}\n11/24/2026 3:52 PM: call after 5pm\nPrefers mornings`);
  assert.equal(mergeComments(after, mergeComments(after, existing)), mergeComments(after, existing));
  assert.equal(mergeComments(BEFORE, ''), BEFORE);
});

test('writes the existing Comments field (fieldKey contact.comments) by its id, never a note', async () => {
  const calls = [];
  const call = async (path, body, method = 'POST') => {
    calls.push({ path, method, body });
    if (path.includes('/customFields')) return { res: new Response(null, { status: 200 }), data: { customFields: [{ id: 'abc', fieldKey: 'contact.comments' }] } };
    if (method === 'GET') return { res: new Response(null, { status: 200 }), data: { contact: { customFields: [{ id: 'abc', value: 'Old note' }] } } };
    return { res: new Response(null, { status: 200 }), data: {} };
  };
  assert.equal(await writeComments(call, 'loc', 'c1', BEFORE), 'updated');
  const put = calls.find((c) => c.method === 'PUT');
  assert.deepEqual(put.body, { customFields: [{ id: 'abc', field_value: `${BEFORE}\nOld note` }] });
  assert.ok(!calls.some((c) => c.path.endsWith('/notes')));
});

test('V1.9: without the field list (lookup refused), Comments is written by key "comments", earlier text kept below', async () => {
  // A mock contact: field "cf9" is Comments (holds older text); "cf1" is another field.
  const fields = { cf1: '70', cf9: 'Older comment' };
  const calls = [];
  const call = async (path, body, method = 'POST') => {
    calls.push({ path, method, body });
    if (path.includes('/customFields')) return { res: new Response(null, { status: 403 }), data: {} };
    if (method === 'GET') return { res: new Response(null, { status: 200 }), data: { contact: { customFields: Object.entries(fields).map(([id, value]) => ({ id, value })) } } };
    for (const f of body.customFields) {
      if (f.key === 'comments') fields.cf9 = f.field_value;
      else if (f.id) fields[f.id] = f.field_value;
    }
    return { res: new Response(null, { status: 200 }), data: {} };
  };
  assert.equal(await writeComments(call, 'loc', 'c1', BEFORE), 'updated-by-key');
  assert.equal(fields.cf9, `${BEFORE}\nOlder comment`);
  assert.equal(fields.cf1, '70');
  assert.ok(!calls.some((c) => c.path.endsWith('/notes')));
  // A refused key write is a failure (the caller adds no tag).
  const refused = async (path, body, method = 'POST') => ({ res: new Response(null, { status: method === 'PUT' ? 422 : path.includes('/customFields') ? 403 : 200 }), data: { contact: { customFields: [] } } });
  assert.equal(await writeComments(refused, 'loc', 'c1', BEFORE), 'write-key-422 (lookup 403)');
});

test('questionnaire delivery: no tag unless the Comments write succeeds; no note ever', async () => {
  const { sendApplicationToCrm } = await import('../../server/quote/crm.js');
  const env = { AGENT_CRM_TOKEN: 't', AGENT_CRM_LOCATION_ID: 'loc' };
  for (const writeOk of [false, true]) {
    const calls = [];
    const fetchImpl = async (url, init) => {
      const u = String(url);
      calls.push({ u, method: init.method });
      if (u.includes('/customFields')) return Response.json({ customFields: [{ id: 'abc', fieldKey: 'contact.comments' }] });
      if (init.method === 'GET') return Response.json({ contact: { customFields: [] } });
      if (init.method === 'PUT' && !writeOk) return Response.json({ message: 'refused' }, { status: 422 });
      return Response.json({ ok: true });
    };
    const r = await sendApplicationToCrm(env, { crm: { contactId: 'c1' } }, { comments: BEFORE }, fetchImpl);
    assert.equal(r.ok, writeOk);
    assert.equal(calls.some((c) => c.u.endsWith('/tags')), writeOk);
    assert.ok(!calls.some((c) => c.u.endsWith('/notes') || c.u.endsWith('/upsert')));
  }
});

test('V1.9: the native State field gets the two-letter code; the note keeps the original funnel source and URL', async () => {
  const { crmContact, crmNote } = await import('../../server/quote/crm.js');
  assert.equal(crmContact({ firstName: 'Pat', phone: '+12145550100', state: 'Texas' }, 'loc').state, 'TX');
  assert.equal(crmContact({ firstName: 'Pat', phone: '+12145550100', state: 'New Hampshire', funnel: 'get-rates' }, 'loc').state, 'NH');
  const fb = crmNote({ leadId: 'x', funnel: 'get-rates', state: 'Texas' });
  const web = crmNote({ leadId: 'y', funnel: 'free-quote', state: 'Texas' });
  assert.ok(fb.includes('Lead Source: Facebook\nURL: https://funeralfunds.com/get-rates/'), fb);
  assert.ok(web.includes('Lead Source: Website\nURL: https://funeralfunds.com/free-quote/'), web);
});
