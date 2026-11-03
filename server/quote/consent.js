// @ts-check
// Consent disclosures for the quote funnel (/free-quote/,
// Quote System v2.2). The page renders these exact strings from this module
// and the server records the text of the version the visitor saw, so the
// evidence record always holds the wording that was on screen.
//
// v6.0 (Randy, November 2026): the approved launch wording, Randy's preferred
// text with "at the number I provided" added so the consent names the number
// it covers (TCPA prior express written consent identifies the number). The
// box is optional and never pre-checked; consent is recorded only when the
// visitor checks it. Change the version whenever the wording changes, and
// never remove an old version (old evidence refers to it).

export const CONSENT_VERSION = 'ff-quote-consent-v2-2026-11';
export const CONSENT_TEXT =
  'I agree Funeral Funds may call or text me at the number I provided about life insurance, including automated messages. ' +
  'Msg & data rates may apply. Reply STOP to opt out. Consent is not required to get prices or buy insurance.';
const CONSENT_V1 =
  'Yes, Funeral Funds (Randy VanderVaate) may call and text me at the number I provide about life insurance, ' +
  'including automated texts. Msg & data rates may apply. Reply STOP to opt out. ' +
  'Consent is not required to see prices or to buy.';

// The Unlock Your Rates panel (v5.0) shows, under the orange button, one sentence
// ending in the masked number ("We'll text a 6-digit verification code to
// (***) ***-1234."), then Change Number, then the rates line. The evidence
// record keeps both lines as VERIFY_NOTICE_TEXT under this version, with the
// number written as (***) ***-XXXX (the full number is stored separately).
// The page imports them from here, so the panel and the evidence can't drift apart.
export const VERIFY_NOTICE_VERSION = 'ff-quote-verify-notice-v4-2026-11';
export const VERIFY_NOTICE_LEAD = "We'll text a 6-digit verification code to";
export const VERIFY_NOTICE_RATES = 'Message and data rates may apply.';
export const VERIFY_NOTICE_TEXT = `${VERIFY_NOTICE_LEAD} (***) ***-XXXX. ${VERIFY_NOTICE_RATES}`;
const VERIFY_NOTICE_V3 = "We'll text a 6-digit verification code to your mobile number. Message and data rates may apply.";
const VERIFY_NOTICE_V1 = 'We will text a 6-digit code to this number to verify it. Msg & data rates may apply.';
const VERIFY_NOTICE_V2 = "We'll text a 6-digit verification code to your mobile number. Msg & data rates may apply.";

/** Text of every version ever shown (never remove an entry: old evidence refers to it). */
export const CONSENT_VERSIONS = { 'ff-quote-consent-v1-draft-2026-11': CONSENT_V1, [CONSENT_VERSION]: CONSENT_TEXT };
export const VERIFY_NOTICE_VERSIONS = { 'ff-quote-verify-notice-v1-2026-11': VERIFY_NOTICE_V1, 'ff-quote-verify-notice-v2-2026-11': VERIFY_NOTICE_V2, 'ff-quote-verify-notice-v3-2026-11': VERIFY_NOTICE_V3, [VERIFY_NOTICE_VERSION]: VERIFY_NOTICE_TEXT };
