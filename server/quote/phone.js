// @ts-check
// US mobile/landline numbers only (NANP), normalized to E.164 (+1XXXXXXXXXX).
// Rejecting everything else (international, premium and fictional ranges) is
// the first line of defense against SMS pumping.

/** @param {unknown} raw @returns {string | null} */
export function toE164US(raw) {
  if (typeof raw !== 'string' || raw.length > 32) return null;
  // Letters are refused; any other punctuation or spacing (including the
  // non-breaking hyphens and invisible marks phones add when autofilling or
  // pasting a number) is ignored, as on the page, which uses this same check.
  if (/[A-Za-z]/.test(raw)) return null;
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length !== 10) return null;
  const area = d.slice(0, 3);
  const exchange = d.slice(3, 6);
  if (!/^[2-9]\d\d$/.test(area) || !/^[2-9]\d\d$/.test(exchange)) return null;
  if (/^[2-9]11$/.test(area) || /^[2-9]11$/.test(exchange)) return null; // N11 service codes
  if (/^(800|833|844|855|866|877|888|900|976)$/.test(area)) return null; // toll-free and premium
  if (area === '555' || (exchange === '555' && /^01\d\d$/.test(d.slice(6)))) return null; // fictional
  if (/^(37|96)\d$/.test(area)) return null; // reserved
  return `+1${d}`;
}

/** +1 (214) 555-1212 style display, for Randy's notification only. @param {string} e164 */
export const displayPhone = (e164) => `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;

/** Last 4 digits, for anything shown back to the visitor. @param {string} e164 */
export const maskPhone = (e164) => `(***) ***-${e164.slice(-4)}`;
