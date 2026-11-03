// @ts-check
// Consent disclosures for the quote funnel (/final-expense-insurance-prices/,
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

export const VERIFY_NOTICE_VERSION = 'ff-quote-verify-notice-v2-2026-11';
export const VERIFY_NOTICE_TEXT = "We'll text a 6-digit verification code to your mobile number. Msg & data rates may apply.";
const VERIFY_NOTICE_V1 = 'We will text a 6-digit code to this number to verify it. Msg & data rates may apply.';

/** Text of every version ever shown (never remove an entry: old evidence refers to it). */
export const CONSENT_VERSIONS = { [CONSENT_VERSION]: CONSENT_TEXT };
export const VERIFY_NOTICE_VERSIONS = { 'ff-quote-verify-notice-v1-2026-11': VERIFY_NOTICE_V1, [VERIFY_NOTICE_VERSION]: VERIFY_NOTICE_TEXT };
