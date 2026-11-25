// Quote funnel video introduction (Randy, November 2026, v1.2): a short
// portrait (9:16) video message that opens over the pricing results right
// after SEE MY RATES, plays once per quote session and closes itself when it
// ends (src/scripts/quote-intro.ts; markup in QuoteFunnelPage.astro).
//
// To replace the video: put the new files in public/videos/quote-intro/ under
// a NEW file name (the files are cached long-term), then change the paths and
// `id` below. No overlay code changes. Encoding (720x1280, about 20-30 s):
//   ffmpeg -i in.mov -vf scale=720:1280 -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 26 -c:a aac -b:a 96k -movflags +faststart out.mp4
//   ffmpeg -i out.mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -c:a libopus -b:a 64k out.webm
//   ffmpeg -ss 0.2 -i out.mp4 -frames:v 1 -q:v 5 out.jpg
// plus a WebVTT captions file with the exact spoken words.
// Leaving `mp4` empty turns the overlay off (nothing is rendered).
export const QUOTE_INTRO = {
  /** Sent to GA4 as video_id (letters, digits, hyphens). */
  // Randy's recording (November 2026; 1080x1920 source, encoded 720x1280).
  id: 'randy-intro-v1',
  mp4: '/videos/quote-intro/randy-intro-v1.mp4',
  webm: '/videos/quote-intro/randy-intro-v1.webm',
  captions: '/videos/quote-intro/randy-intro-v1.vtt',
  poster: '/videos/quote-intro/randy-intro-v1.jpg',
  /** The dialog's accessible name. */
  label: 'Video message from Funeral Funds',
} as const;
