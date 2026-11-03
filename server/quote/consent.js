// @ts-check
// Consent disclosures for the quote funnel (/free-quote/,
// Quote System v2.2). The page renders these exact strings from this module
// and the server records the text of the version the visitor saw, so the
// evidence record always holds the wording that was on screen.
//
// LEGAL REVIEW REQUIRED before production: CONSENT_TEXT is a draft built from
// the site's approved form disclosure ("Submit to give Randy permission to
// call, text, or email you. Msg & data rates may apply. No purchase
// required.") adapted to name Funeral Funds, describe the communications and
// stay optional. Change the version whenever the wording changes.

export const CONSENT_VERSION = 'ff-quote-consent-v1-draft-2026-11';
export const CONSENT_TEXT =
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
export const CONSENT_VERSIONS = { [CONSENT_VERSION]: CONSENT_TEXT };
export const VERIFY_NOTICE_VERSIONS = { 'ff-quote-verify-notice-v1-2026-11': VERIFY_NOTICE_V1, 'ff-quote-verify-notice-v2-2026-11': VERIFY_NOTICE_V2, 'ff-quote-verify-notice-v3-2026-11': VERIFY_NOTICE_V3, [VERIFY_NOTICE_VERSION]: VERIFY_NOTICE_TEXT };
