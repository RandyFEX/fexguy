// @ts-check
// The /reschedule/ page (server-rendered by api/reschedule.js, after the
// password check). Funeral Funds colors and type from src/styles/global.css;
// no external scripts, fonts or trackers.

const FREQUENCY_OPTIONS = [
  [2, 'Every 2 hours'],
  [3, 'Every 3 hours'],
  [24, 'Once a day'],
  [48, 'Every other day'],
];
const DURATION_OPTIONS = [7, 14, 30, 45, 60];

/** @param {{ preview: boolean }} opts */
export function renderReschedulePage({ preview }) {
  // Tap-to-select buttons (radio inputs), not dropdowns (Randy, November 2026).
  const freq = FREQUENCY_OPTIONS.map(([h, l]) => `<label class="opt"><input type="radio" name="frequency" value="${h}"${h === 3 ? ' checked' : ''}><span>${l}</span></label>`).join('');
  const dur = DURATION_OPTIONS.map((d) => `<label class="opt"><input type="radio" name="duration" value="${d}"${d === 30 ? ' checked' : ''}><span>${d} days</span></label>`).join('');
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Reschedule Follow-Up | Funeral Funds</title>
<link rel="icon" href="/images/favicon/funeral-funds-favicon-32.png" sizes="32x32">
<style>
:root{--text:#202522;--muted:#555b57;--bg:#fff;--surface:#efebe2;--border:#ddd7ca;--primary:#173f35;--primary-hover:#0e2d26;--cta:#c2410c;--error:#b91c1c;--font:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--font);font-size:1.0625rem;line-height:1.5}
.top{display:flex;justify-content:center;padding:1rem}
.top img{width:11rem;height:auto;display:block}
main{max-width:36rem;margin:0 auto;padding:0 1rem 2rem}
.card{background:var(--bg);border:1px solid var(--border);border-radius:.75rem;padding:1.25rem}
h1{margin:0 0 1rem;font-size:1.75rem;line-height:1.2;color:var(--primary)}
.field{margin-bottom:1rem}
label,.legend{display:block;font-weight:700;margin-bottom:.25rem}
fieldset{border:0;margin:0 0 1rem;padding:0}
legend{padding:0}
input,select,textarea{width:100%;font:inherit;color:var(--text);background:#fff;border:1px solid #8a8f8b;border-radius:.5rem;padding:.625rem .75rem;min-height:2.75rem}
textarea{min-height:8rem;resize:vertical}
input:focus,select:focus,textarea:focus,button:focus{outline:3px solid #1a1a1a;outline-offset:2px}
.pair{display:grid;grid-template-columns:1fr 1fr auto;gap:.75rem;align-items:start}
.now{align-self:start;margin-top:1.75rem;width:auto;min-height:2.75rem;padding:0 1.25rem;border:1px solid #8a8f8b;border-radius:.5rem;background:#fff;color:var(--text);font-size:1rem;font-weight:700}
.now:hover{filter:none;background:#f4f7f5}
.now[aria-pressed="true"]{background:var(--primary);border-color:var(--primary);color:#fff}
.opts{display:grid;gap:.5rem}
.opts--freq{grid-template-columns:repeat(4,1fr)}
.opts--dur{grid-template-columns:repeat(5,1fr)}
.opt{display:block;margin:0;font-weight:400;cursor:pointer}
.opt input{position:absolute;opacity:0;width:1px;height:1px}
.opt span{display:flex;align-items:center;justify-content:center;height:100%;min-height:2.75rem;padding:.375rem .25rem;font-size:.9375rem;border:1px solid #8a8f8b;border-radius:.5rem;background:#fff;text-align:center;line-height:1.2}
.opt input:checked+span{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:700}
.opt input:focus-visible+span{outline:3px solid #1a1a1a;outline-offset:2px}
.pair label{font-weight:600;font-size:.9375rem}
.err{display:block;color:var(--error);font-size:.9375rem;margin-top:.25rem}
.err:empty{display:none}
.summary{background:#f4f7f5;border-left:4px solid var(--primary);border-radius:.5rem;padding:.75rem 1rem;margin:0 0 1rem}
.summary p{margin:0}
.summary strong{color:var(--primary)}
button{width:100%;min-height:3.25rem;border:0;border-radius:.625rem;background:var(--cta);color:#fff;font:inherit;font-size:1.125rem;font-weight:700;cursor:pointer}
button:hover{filter:brightness(.9)}
button[disabled]{opacity:.6;cursor:wait}
.status{margin:1rem 0 0;padding:.75rem 1rem;border-radius:.5rem;font-weight:600}
.status:empty{display:none}
.status.ok{background:#e6f2ec;color:var(--primary)}
.status.fail{background:#fdecec;color:var(--error)}
.preview{background:#fff7e0;border:1px solid #e5c76b;border-radius:.5rem;padding:.5rem .75rem;margin:0 0 1rem;font-size:.9375rem}
</style>
</head>
<body>
<div class="top"><a href="https://funeralfunds.com/" aria-label="Funeral Funds home"><img src="/images/logo/funeral-funds-wordmark-400.webp" width="1987" height="285" alt="Funeral Funds"></a></div>
<main>
<div class="card">
<h1>Reschedule Follow-Up</h1>
${preview ? '<p class="preview"><strong>Preview:</strong> submissions are checked but nothing is sent to Agent CRM.</p>' : ''}
<form id="rf" novalidate>
<div class="field"><label for="rf-name">Full name</label><input id="rf-name" name="name" autocomplete="off" required aria-describedby="rf-name-err"><span class="err" id="rf-name-err"></span></div>
<div class="field"><label for="rf-phone">Phone number</label><input id="rf-phone" name="phone" type="tel" inputmode="tel" autocomplete="off" required aria-describedby="rf-phone-err"><span class="err" id="rf-phone-err"></span></div>
<div class="field"><label for="rf-notes">Comments / conversation notes</label><textarea id="rf-notes" name="notes" aria-describedby="rf-notes-err"></textarea><span class="err" id="rf-notes-err"></span></div>
<fieldset><legend class="legend">Start calling in</legend>
<div class="pair">
<div><label for="rf-days">Days</label><input id="rf-days" name="days" type="number" inputmode="numeric" min="0" max="365" step="1" value="1" aria-describedby="rf-days-err"><span class="err" id="rf-days-err"></span></div>
<div><label for="rf-hours">Hours</label><input id="rf-hours" name="hours" type="number" inputmode="numeric" min="0" max="999" step="1" value="8" aria-describedby="rf-hours-err"><span class="err" id="rf-hours-err"></span></div>
<button type="button" class="now" id="rf-now" aria-pressed="false">Now</button>
</div></fieldset>
<fieldset><legend class="legend">Follow-up frequency</legend><div class="opts opts--freq">${freq}</div><span class="err" id="rf-frequency-err"></span></fieldset>
<fieldset><legend class="legend">Continue follow-up for</legend><div class="opts opts--dur">${dur}</div><span class="err" id="rf-duration-err"></span></fieldset>
<div class="field"><label for="rf-method">Calling method</label><select id="rf-method" name="method"><option value="manual" selected>Manual calls / dialer queue</option></select><span class="err" id="rf-method-err"></span></div>
<div class="summary" aria-live="polite"><p id="rf-summary"></p></div>
<button type="submit" id="rf-submit">Schedule Follow-Up</button>
<p class="status" id="rf-status" role="status" aria-live="polite"></p>
</form>
</div>
</main>
<script>
(function () {
  var f = document.getElementById('rf');
  var summary = document.getElementById('rf-summary');
  var status = document.getElementById('rf-status');
  var btn = document.getElementById('rf-submit');
  var labels = { 2: 'every 2 hours', 3: 'every 3 hours', 24: 'once a day', 48: 'every other day' };
  var n = function (v) { return /^\\s*\\d+\\s*$/.test(v) ? Number(v) : NaN; };
  var plural = function (x, u) { return x + ' ' + u + (x === 1 ? '' : 's'); };
  function delayText(total) {
    var d = Math.floor(total / 24), h = total % 24;
    if (!d && !h) return 'right away';
    return [d ? plural(d, 'day') : '', h ? plural(h, 'hour') : ''].filter(Boolean).join(' and ');
  }
  function update() {
    var days = n(f.days.value), hours = n(f.hours.value);
    if (isNaN(days) || isNaN(hours)) { summary.textContent = 'Enter whole numbers for days and hours.'; return; }
    var total = days * 24 + hours;
    if (nowBtn) nowBtn.setAttribute('aria-pressed', total === 0 ? 'true' : 'false');
    summary.innerHTML = 'First call: <strong>' + (total ? 'in ' + delayText(total) + '</strong> (' + total + ' hours)' : 'right away</strong>') + '. Then <strong>' + labels[f.frequency.value] + '</strong> for <strong>' + f.duration.value + ' days</strong>, by manual calls / dialer queue.';
  }
  function clearErrors() { f.querySelectorAll('.err').forEach(function (e) { e.textContent = ''; }); f.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); }); }
  // Now (Randy, November 2026): one tap sets 0 days and 0 hours.
  var nowBtn = document.getElementById('rf-now');
  nowBtn.addEventListener('click', function () { f.days.value = '0'; f.hours.value = '0'; update(); });
  f.addEventListener('input', update);
  f.addEventListener('change', update);
  update();
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    status.className = 'status';
    status.textContent = '';
    var data = { name: f.name.value, phone: f.phone.value, notes: f.notes.value, days: f.days.value, hours: f.hours.value, frequency: f.frequency.value, duration: f.duration.value, method: f.method.value };
    btn.disabled = true;
    btn.textContent = 'Scheduling...';
    fetch(location.pathname, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return { status: 'failed' }; }); })
      .then(function (res) {
        if (res.status === 'scheduled') {
          status.className = 'status ok';
          status.textContent = res.dryRun ? 'Preview check passed for ' + data.name.trim() + '. Nothing was sent to Agent CRM.' : 'Follow-up scheduled for ' + data.name.trim() + '.' + (res.commentsWarning ? ' ' + res.commentsWarning : '');
          f.reset();
          update();
          f.name.focus();
          return;
        }
        if (res.errors) {
          var first = null;
          Object.keys(res.errors).forEach(function (k) {
            var el = document.getElementById('rf-' + k + '-err');
            if (el) el.textContent = res.errors[k];
            var input = f.elements[k];
            if (input && !input.setAttribute && input.length) input = input[0];
            if (input) { input.setAttribute('aria-invalid', 'true'); first = first || input; }
          });
          status.className = 'status fail';
          status.textContent = 'Please fix the highlighted fields.';
          if (first) first.focus();
          return;
        }
        status.className = 'status fail';
        status.textContent = res.message || 'Something went wrong. Your entries are kept: submit again.';
      })
      .catch(function () { status.className = 'status fail'; status.textContent = 'Connection problem. Your entries are kept: submit again.'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Schedule Follow-Up'; });
  });
})();
</script>
</body>
</html>`;
}

/** The one-field sign-in page (no user name). A correct password sets a
 * year-long cookie and reloads into the form. */
export function renderLoginPage() {
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Reschedule Follow-Up | Funeral Funds</title>
<link rel="icon" href="/images/favicon/funeral-funds-favicon-32.png" sizes="32x32">
<style>
*{box-sizing:border-box}
body{margin:0;background:#efebe2;color:#202522;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:1.0625rem;line-height:1.5}
.top{display:flex;justify-content:center;padding:1rem}
.top img{width:11rem;height:auto;display:block}
main{max-width:24rem;margin:0 auto;padding:0 1rem 2rem}
.card{background:#fff;border:1px solid #ddd7ca;border-radius:.75rem;padding:1.25rem}
h1{margin:0 0 1rem;font-size:1.5rem;line-height:1.2;color:#173f35}
label{display:block;font-weight:700;margin-bottom:.25rem}
input{width:100%;font:inherit;border:1px solid #8a8f8b;border-radius:.5rem;padding:.625rem .75rem;min-height:2.75rem;margin-bottom:1rem}
input:focus,button:focus{outline:3px solid #1a1a1a;outline-offset:2px}
button{width:100%;min-height:3rem;border:0;border-radius:.625rem;background:#c2410c;color:#fff;font:inherit;font-size:1.125rem;font-weight:700;cursor:pointer}
button[disabled]{opacity:.6;cursor:wait}
.err{color:#b91c1c;font-weight:600;margin:.75rem 0 0}
.err:empty{display:none}
</style>
</head>
<body>
<div class="top"><a href="https://funeralfunds.com/" aria-label="Funeral Funds home"><img src="/images/logo/funeral-funds-wordmark-400.webp" width="1987" height="285" alt="Funeral Funds"></a></div>
<main><div class="card">
<h1>Reschedule Follow-Up</h1>
<form id="lg">
<label for="lg-pw">Password</label>
<input id="lg-pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit" id="lg-btn">Open Form</button>
<p class="err" id="lg-err" role="alert"></p>
</form>
</div></main>
<script>
(function () {
  var f = document.getElementById('lg'), btn = document.getElementById('lg-btn'), err = document.getElementById('lg-err');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    fetch(location.pathname, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'login', password: f.password.value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (res) {
        if (res.status === 'signed-in') { location.reload(); return; }
        err.textContent = 'That password is not right. Try again.';
        f.password.select();
      })
      .catch(function () { err.textContent = 'Connection problem. Try again.'; })
      .then(function () { btn.disabled = false; });
  });
})();
</script>
</body>
</html>`;
}
