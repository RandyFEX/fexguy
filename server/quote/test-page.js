// @ts-check
// https://funeralfunds.com/test/ (Randy, November 2026, V1.1): the owner's
// permanent sign-in page for testing the live quote funnels without creating
// leads. Served only by api/test.js (vercel.json rewrite /test/ -> /api/test).
// Without FUNNEL_TEST_PASSWORD (12+ characters) it answers 404.
//
// GET   signed in: the hub (links to the real /free-quote/ and /get-rates/
//       pages, which then run in owner test mode); otherwise the password form
// POST  application/x-www-form-urlencoded, same-site only:
//       password=...  sign in (10 attempts per IP per hour)
//       action=logout sign out
// See server/quote/owner-test.js for how test mode works.
import { createHmac } from 'node:crypto';
import { TEST_DAYS, loginCookies, logoutCookies, passwordMatches, signedIn, testPassword } from './owner-test.js';
import { allowedOrigin } from '../rates/public-pricing.js';

const HOUR = 60 * 60 * 1000;
const LOGIN_LIMIT = 10;
const HEADERS = {
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'no-store',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'content-type': 'text/html; charset=utf-8',
};

/** @param {Request} request */
const clientIp = (request) =>
  (request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

/** @param {string} title @param {string} body */
const page = (title, body) => `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} | Funeral Funds</title>
<link rel="icon" href="/images/favicon/funeral-funds-favicon-32.png" sizes="32x32">
<style>
*{box-sizing:border-box}
body{margin:0;background:#efebe2;color:#202522;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:1.0625rem;line-height:1.5}
.top{display:flex;justify-content:center;padding:1rem}
.top img{width:11rem;height:auto;display:block}
main{max-width:30rem;margin:0 auto;padding:0 1rem 2rem}
.card{background:#fff;border:1px solid #ddd7ca;border-radius:.75rem;padding:1.25rem}
h1{margin:0 0 .75rem;font-size:1.5rem;line-height:1.2;color:#173f35}
p{margin:0 0 1rem}
label{display:block;font-weight:700;margin-bottom:.25rem}
input{width:100%;font:inherit;border:1px solid #8a8f8b;border-radius:.5rem;padding:.625rem .75rem;min-height:2.75rem;margin-bottom:1rem}
input:focus,button:focus,a:focus{outline:3px solid #1a1a1a;outline-offset:2px}
button,.go{display:flex;align-items:center;justify-content:center;width:100%;min-height:3rem;border:0;border-radius:.625rem;background:#c2410c;color:#fff;font:inherit;font-size:1.125rem;font-weight:700;cursor:pointer;text-decoration:none;margin:0 0 .75rem}
.go{background:#173f35}
.out{background:#fff;color:#173f35;border:2px solid #173f35;font-size:1rem;min-height:2.75rem}
.note{font-size:.9375rem;color:#4a5552}
.err{color:#b91c1c;font-weight:600}
ul{margin:0 0 1rem;padding-left:1.25rem}
</style>
</head>
<body>
<div class="top"><a href="https://funeralfunds.com/" aria-label="Funeral Funds home"><img src="/images/logo/funeral-funds-wordmark-400.webp" width="1987" height="285" alt="Funeral Funds"></a></div>
<main><div class="card">${body}</div></main>
</body>
</html>`;

/** @param {string} [error] */
const loginPage = (error = '') =>
  page(
    'Funnel Test Mode',
    `<h1>Funnel Test Mode</h1>
<form method="post" action="/test/">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Sign In</button>
${error ? `<p class="err" role="alert">${error}</p>` : ''}
</form>`,
  );

const hubPage = () =>
  page(
    'Funnel Test Mode',
    `<h1>Funnel Test Mode</h1>
<p>This browser is in test mode for ${TEST_DAYS} days. Choose a quote funnel:</p>
<a class="go" href="/get-rates/">Test /get-rates/</a>
<a class="go" href="/free-quote/">Test /free-quote/</a>
<p class="note">Both buttons open the real, current funnel pages with the live rates. While this browser is in test mode:</p>
<ul class="note">
<li>nothing is sent to Agent CRM, so no contact, workflow, text or call;</li>
<li>no production lead record is created, and nothing counts toward the submission limits;</li>
<li>nothing is sent to Google Analytics or Meta.</li>
</ul>
<p class="note">The results show a yellow TEST MODE note. Use Start New Quote to begin again.</p>
<form method="post" action="/test/"><input type="hidden" name="action" value="logout"><button class="out" type="submit">Sign Out of Test Mode</button></form>`,
  );

/**
 * @param {Request} request @param {Record<string, string | undefined>} env
 * @param {{ limit?: (key: string, limit: number, windowMs: number) => Promise<boolean>, now?: () => number }} [deps]
 */
export async function handleTestPage(request, env, deps = {}) {
  if (!testPassword(env)) {
    // TEMPORARY diagnostics (remove once /test/ works): whether the variable
    // exists and passes validation, never its value or length.
    const v = env.FUNNEL_TEST_PASSWORD;
    const diag = [
      `password=${v === undefined ? 'absent' : v === '' ? 'empty' : 'too-short'}`,
      `env=${env.VERCEL_ENV ?? 'unset'}`,
      `commit=${(env.VERCEL_GIT_COMMIT_SHA ?? 'unset').slice(0, 8)}`,
      `deployment=${env.VERCEL_DEPLOYMENT_ID ?? 'unset'}`,
      `names=${Object.keys(env).filter((k) => /funnel|test_?pass/i.test(k)).map((k) => JSON.stringify(k)).join(',') || 'none'}`,
    ].join('; ');
    return new Response('Not found', { status: 404, headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-ff-test-diag': diag } });
  }
  const now = (deps.now ?? Date.now)();
  const html = (/** @type {number} */ status, /** @type {string} */ body, /** @type {string[]} */ cookies = []) => {
    const h = new Headers(HEADERS);
    for (const c of cookies) h.append('set-cookie', c);
    return new Response(body, { status, headers: h });
  };
  if (request.method === 'GET' || request.method === 'HEAD') return html(200, signedIn(request, env, now) ? hubPage() : loginPage());
  if (request.method !== 'POST') return html(405, loginPage());
  if (!allowedOrigin(request.headers.get('origin'), env)) return html(403, loginPage('Please open this page directly and try again.'));
  if (!/^application\/x-www-form-urlencoded\b/i.test(request.headers.get('content-type') ?? '')) return html(415, loginPage());
  const text = await request.text();
  if (text.length > 1000) return html(413, loginPage());
  const form = new URLSearchParams(text);
  const back = (/** @type {string[]} */ cookies) => {
    const h = new Headers({ ...HEADERS, location: '/test/' });
    for (const c of cookies) h.append('set-cookie', c);
    return new Response(null, { status: 303, headers: h });
  };
  if (form.get('action') === 'logout') return back(logoutCookies());
  // Sign-in attempts per IP per hour (stored as an HMAC, never the IP itself).
  const ipKey = createHmac('sha256', env.QUOTE_SESSION_SECRET || env.HEALTH_SEARCH_SECRET || 'ff-test').update(`test-login:${clientIp(request)}`).digest('hex').slice(0, 32);
  if (deps.limit && (await deps.limit(`tl:${ipKey}:${Math.floor(now / HOUR)}`, LOGIN_LIMIT, HOUR).catch(() => true)))
    return html(429, loginPage('Too many attempts. Please try again in an hour.'));
  if (!passwordMatches(form.get('password'), env)) return html(401, loginPage('That password is not correct.'));
  return back(loginCookies(env, now));
}
