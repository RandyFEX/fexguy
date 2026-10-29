// @ts-check
// FICTIONAL SAMPLE DATA for previews and tests only. These are NOT real
// carrier names, application questions or outcomes. The API uses this set
// only outside production and only while the real dataset has no questions;
// every response built from it carries `sample: true`, and the component
// shows a "sample data" notice.

import { dataset as generated } from './dataset.generated.js';

const SAMPLE = 'SAMPLE QUESTION, not real carrier wording: ';

/** @type {import('./search.js').Dataset} */
export const sampleDataset = {
  sample: true,
  concepts: generated.concepts,
  carriers: [
    {
      id: 'sample-a', name: 'Sample Carrier A', displayOrder: 1, guaranteedIssue: false, expectedQuestionCount: 5,
      expectedSections: { 'Part A': 3, 'Part B': 2 }, sharedWordingGroup: null, publicDisplay: 'named',
      schedules: { modified: { label: 'Modified benefit (sample)', periods: [
        { months: '1-12', benefit: 'Sample: return of premiums paid plus interest' },
        { months: '13 and later', benefit: 'Sample: 100% of the death benefit' },
      ] } },
      rules: {
        'part-a': { classification: 'decline', explanation: 'Sample: a YES answer here means the applicant does not qualify for this sample plan.' },
        'part-b': { classification: 'modified', explanation: 'Sample: a YES answer here points to the sample modified plan.' },
      },
    },
    {
      id: 'sample-b', name: 'Sample Carrier B', displayOrder: 2, guaranteedIssue: false, expectedQuestionCount: 3,
      sharedWordingGroup: null, publicDisplay: 'named',
      schedules: { graded: { label: 'Graded benefit (sample)', periods: [
        { months: '1-24', benefit: 'Sample: a partial benefit' },
        { months: '25 and later', benefit: 'Sample: 100% of the death benefit' },
      ] } },
      rules: {
        timeframe: { classification: 'timeframe', explanation: 'Sample: the timing in the question decides between declined, graded and level coverage.' },
      },
    },
    {
      id: 'sample-gi', name: 'Sample Guaranteed Issue Co.', displayOrder: 3, guaranteedIssue: true, expectedQuestionCount: 0,
      sharedWordingGroup: null, publicDisplay: 'named', summary: 'Sample: this plan asks no health questions.',
      schedules: { 'guaranteed-issue': { label: 'Guaranteed issue (sample)', periods: [
        { months: '1-24', benefit: 'Sample: return of premiums paid plus interest' },
        { months: '25 and later', benefit: 'Sample: 100% of the death benefit' },
      ] } },
      rules: {},
    },
  ],
  questions: [
    { id: 'sa-A-1', carrierId: 'sample-a', section: 'Part A', number: '1', text: `${SAMPLE}Are you currently using oxygen equipment, or have you been diagnosed with congestive heart failure?`, yes: { rule: 'part-a' } },
    { id: 'sa-A-2', carrierId: 'sample-a', section: 'Part A', number: '2', text: `${SAMPLE}Are you currently receiving kidney dialysis or hospice care?`, yes: { rule: 'part-a' } },
    { id: 'sa-A-3', carrierId: 'sample-a', section: 'Part A', number: '3', text: `${SAMPLE}Have you ever been diagnosed with ALS or Alzheimer's disease?`, yes: { rule: 'part-a' } },
    { id: 'sa-B-1', carrierId: 'sample-a', section: 'Part B', number: '1', text: `${SAMPLE}In the past 2 years, have you had a heart attack, stroke or TIA?`, yes: { rule: 'part-b' } },
    { id: 'sa-B-2', carrierId: 'sample-a', section: 'Part B', number: '2', text: `${SAMPLE}Have you been diagnosed with chronic obstructive pulmonary disease (COPD) or emphysema?`, yes: { rule: 'part-b' } },
    { id: 'sb-1', carrierId: 'sample-b', section: 'Health questions', number: '1', text: `${SAMPLE}Have you had heart surgery, angioplasty or a stent placed? If yes, how many months ago?`, yes: { rule: 'timeframe' }, search: { direct: ['heart-procedure'] } },
    { id: 'sb-2', carrierId: 'sample-b', section: 'Health questions', number: '2', text: `${SAMPLE}Do you take insulin to treat diabetes?`, yes: { classification: 'graded', explanation: 'Sample: a YES answer points to the sample graded plan.' } },
    { id: 'sb-3', carrierId: 'sample-b', section: 'Health questions', number: '3', text: `${SAMPLE}Have you been treated for coronary artery disease in the past 12 months?`, yes: { rule: 'timeframe' } },
  ],
};
