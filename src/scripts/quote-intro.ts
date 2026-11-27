// Quote funnel video introduction (Randy, November 2026, v1.2; config in
// src/config/quote-intro.ts). Browsers allow sound only after a user action,
// and iPhones (Safari and the Facebook/Instagram in-app browsers) allow it for
// about a second, too short to outlast the lead submission. So:
//   prepare(): the contact step shows; the video starts downloading.
//   prime():   called synchronously in the SEE MY RATES submit handler (before
//              any await): play() then pause() on the same <video>, which
//              unlocks that element for later playback with sound.
//   open():    after the lead is accepted and the rates are showing: the
//              overlay opens and play() is called at once (no timer first).
// V1.1 startup (Randy, November 2026): iPhones ignore preload and stream the
// video only once play() is called, so playback could wait on the network
// (or stall) after the overlay opened. warm() (from the age question on)
// downloads the small MP4 in full at low priority and plays it from memory
// (a blob: URL), so the start doesn't wait on the network; it is skipped with
// Save-Data, aborted by prime() if unfinished (then the video streams as
// before), and the source never changes after prime(). A stall (waiting) of
// STALL_MS while open shows the button too, and a tap restarts a stalled
// playback.
// Blocked sound: a Play With Sound button (the overlay stays open). V1.0 fix
// (Randy, November 2026): iPhones don't always refuse the unprimed play() with
// NotAllowedError; the request can stay pending or be aborted, which left a
// frozen video with no control. So the button now shows whenever an automatic
// start doesn't begin within AUTO_START_MS, for any refusal other than an
// unsupported source, and whenever playback pauses before the end; a tap on
// the video works like the button, and the button hides once playback starts.
// A load failure, or a tapped start that never comes within START_LIMIT_MS,
// closes the overlay. Ending, the close button and Escape close it. Shown
// once per quote session (key cleared by Start New Quote with the other
// ff:quote-* keys). GA4-only events through `track` (tracking.ts).

type Track = (name: string, extra?: Record<string, unknown>) => void;

const PLAYED_KEY = 'ff:quote-intro-played';
/** How long a requested playback may take to start before it counts as failed. */
const START_LIMIT_MS = 12000;
/** How long an automatic start may take before the Play With Sound button shows. */
const AUTO_START_MS = 2500;
/** How long playback may stall (waiting for data) before the button shows. */
const STALL_MS = 2500;

// v1.3 (Randy, November 2026): `veil(true)` while the overlay is open blurs
// only the price figures behind it; every way the overlay closes (end, close
// button, Escape, failure) calls `veil(false)`. Presentation only.
export function createIntro(root: HTMLElement, track: Track, visit: () => string, veil: (on: boolean) => void = () => {}) {
  const overlay = root.querySelector<HTMLElement>('[data-qv]');
  const video = overlay?.querySelector<HTMLVideoElement>('video');
  if (!overlay || !video) return { warm() {}, prepare() {}, prime() {}, open(_after: () => void) {}, openPreview(_after: () => void) {} };
  const closeBtn = overlay.querySelector<HTMLButtonElement>('[data-qv-close]')!;
  const playBtn = overlay.querySelector<HTMLButtonElement>('[data-qv-play]')!;
  const videoId = overlay.dataset.qvId ?? '';
  const send = (name: string, extra: Record<string, unknown> = {}) => track(name, { videoId, ...extra });

  const played = () => {
    try {
      return localStorage.getItem(PLAYED_KEY) === visit();
    } catch {
      return false;
    }
  };
  let failed = false;
  let primed = false;
  let isOpen = false;
  let started = false;
  let ended = false;
  let watchdog = 0;
  let blockedSent = false;
  let stallTimer = 0;
  // warm(): the in-memory copy of the MP4.
  let warming: AbortController | null = null;
  let warmed = false;
  let afterClose: () => void = () => {};

  const fail = () => {
    if (failed) return;
    failed = true;
    if (isOpen) {
      send('quote_video_error', { position: Math.floor(video.currentTime || 0) });
      close();
    }
  };
  // A <source> failure doesn't bubble; a capturing listener on the video sees it.
  video.addEventListener(
    'error',
    () => {
      // The in-memory copy failed to play: back to the streamed sources.
      if (warmed && video.getAttribute('src')?.startsWith('blob:')) {
        warmed = false;
        video.removeAttribute('src');
        video.load();
        if (isOpen) request(true);
        return;
      }
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();
    },
    true,
  );
  video.addEventListener('waiting', () => {
    if (!isOpen || ended) return;
    window.clearTimeout(stallTimer);
    stallTimer = window.setTimeout(() => {
      if (isOpen && !ended && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) showPlay();
    }, STALL_MS);
  });
  video.addEventListener('playing', () => {
    window.clearTimeout(stallTimer);
    window.clearTimeout(watchdog);
    if (isOpen) playBtn.hidden = true;
    if (!isOpen || started) return;
    started = true;
    send('quote_video_start');
  });
  // Paused before the end while open (e.g. the phone interrupted it): offer the button again.
  video.addEventListener('pause', () => {
    if (isOpen && started && !ended && video.paused && !video.ended) showPlay();
  });
  video.addEventListener('ended', () => {
    if (!isOpen) return;
    ended = true;
    send('quote_video_complete');
    close();
  });

  function close() {
    if (!isOpen) return;
    isOpen = false;
    window.clearTimeout(watchdog);
    window.clearTimeout(stallTimer);
    video!.pause();
    if (!ended && !failed) send('quote_video_dismiss', { position: Math.floor(video!.currentTime || 0) });
    overlay!.hidden = true;
    veil(false);
    document.documentElement.classList.remove('qv-open');
    document.removeEventListener('keydown', onKey, true);
    afterClose();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      // Keep focus inside the dialog.
      const items = [closeBtn, playBtn].filter((b) => !b.hidden);
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length]?.focus();
    }
  }
  /** The automatic start didn't happen: show Play With Sound (never a frozen video with no control). */
  function showPlay() {
    if (!isOpen || failed || !playBtn.hidden) return;
    window.clearTimeout(watchdog);
    if (!started && !blockedSent) {
      blockedSent = true;
      send('quote_video_autoplay_blocked');
    }
    playBtn.hidden = false;
    playBtn.focus({ preventScroll: true });
  }
  /** auto: the start after SEE MY RATES; otherwise a tap (Play With Sound or the video). */
  function request(auto: boolean) {
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(() => {
      if (!isOpen || started) return;
      if (auto) showPlay();
      else fail();
    }, auto ? AUTO_START_MS : START_LIMIT_MS);
    video!.muted = false;
    let p: Promise<void> | undefined;
    try {
      p = video!.play();
    } catch {
      if (auto) showPlay();
      return;
    }
    p?.catch((err: DOMException) => {
      if (!isOpen || started || !video!.paused) return;
      if (err?.name === 'NotSupportedError') fail();
      else showPlay();
    });
  }
  // Called within the tap itself, so the browser allows sound.
  const tapPlay = () => {
    // Ignore taps while it plays normally; a stalled or pending start restarts.
    if (!isOpen || (!video.paused && playBtn.hidden && started)) return;
    playBtn.hidden = true;
    closeBtn.focus({ preventScroll: true });
    if (!video.paused) video.pause();
    request(false);
  };
  playBtn.addEventListener('click', tapPlay);
  video.addEventListener('click', tapPlay);
  closeBtn.addEventListener('click', close);

  return {
    /** From the age question on: download the MP4 in full (low priority) and
     *  play it from memory. Never changes the source after prime(). */
    warm() {
      if (warming || warmed || primed || failed || played()) return;
      const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
      if (nav.connection?.saveData || typeof fetch !== 'function' || !URL.createObjectURL) return;
      const mp4 = video.querySelector<HTMLSourceElement>('source[type="video/mp4"]')?.src;
      if (!mp4) return;
      const ctl = new AbortController();
      warming = ctl;
      fetch(mp4, { signal: ctl.signal, priority: 'low' } as RequestInit)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((blob) => {
          if (primed || ctl.signal.aborted) return;
          warmed = true;
          video.src = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'video/mp4' }));
        })
        .catch(() => {})
        .finally(() => {
          if (warming === ctl) warming = null;
        });
    },
    /** The contact step is showing: start downloading the video. */
    prepare() {
      if (warming || warmed) return;
      if (failed || played() || video.preload === 'auto') return;
      video.preload = 'auto';
      video.load();
    },
    /** Synchronously inside the SEE MY RATES submit handler (the user's action). */
    prime() {
      if (failed || played()) return;
      primed = true;
      // An unfinished download stops here; the video streams as before.
      warming?.abort();
      video.muted = false;
      try {
        video.play()?.catch(() => {});
        video.pause();
      } catch {}
    },
    /** The rates are showing: open the overlay and play at once. */
    open(after: () => void) {
      if (!primed || failed || played() || isOpen) return;
      try {
        localStorage.setItem(PLAYED_KEY, visit());
      } catch {}
      afterClose = after;
      isOpen = true;
      started = false;
      ended = false;
      blockedSent = false;
      playBtn.hidden = true;
      veil(true);
      overlay.hidden = false;
      document.documentElement.classList.add('qv-open');
      document.addEventListener('keydown', onKey, true);
      try {
        video.currentTime = 0;
      } catch {}
      request(true);
      closeBtn.focus({ preventScroll: true });
    },
    /** Preview builds only (?preview=video): open on every load, ignoring
     *  once-per-session; Play With Sound starts it (a page load has no tap). */
    openPreview(after: () => void) {
      if (failed || isOpen) return;
      afterClose = after;
      isOpen = true;
      started = false;
      ended = false;
      veil(true);
      overlay.hidden = false;
      document.documentElement.classList.add('qv-open');
      document.addEventListener('keydown', onKey, true);
      video.preload = 'auto';
      playBtn.hidden = false;
      playBtn.focus({ preventScroll: true });
    },
  };
}
