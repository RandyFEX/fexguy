// Read-only REST calls to the Google Analytics Data API and the Search
// Console API with a short-lived access token. Errors are classified so the
// connectivity report says what to fix.

export type ApiFailure = {
  ok: false;
  status: number;
  reason: string;
  message: string;
  hint: string;
};

const HINTS: Record<string, string> = {
  SERVICE_DISABLED: 'Enable this API in Google Cloud project fexguy-seo-monitoring (APIs & Services > Library).',
  PERMISSION_DENIED: 'The service account lacks access: add fexguy-seo-reader@fexguy-seo-monitoring.iam.gserviceaccount.com as a Viewer (GA4) or a Restricted user (Search Console).',
  UNAUTHENTICATED: 'The access token was rejected; re-check the authentication setup.',
  NOT_FOUND: 'The GA4 property or Search Console site was not found; check the ID.',
  RESOURCE_EXHAUSTED: 'Quota exceeded; try again later.',
};

export async function googleFetch<T>(
  url: string,
  token: string,
  body?: unknown,
): Promise<{ ok: true; data: T } | ApiFailure> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body: reported as text below.
  }
  if (res.ok) return { ok: true, data: json as T };

  const err = json?.error ?? {};
  const details: any[] = Array.isArray(err.details) ? err.details : [];
  const reason: string =
    details.find((d) => d?.reason)?.reason ??
    err.status ??
    (res.status === 403 ? 'PERMISSION_DENIED' : res.status === 401 ? 'UNAUTHENTICATED' : `HTTP_${res.status}`);
  const status: string = err.status ?? '';
  return {
    ok: false,
    status: res.status,
    reason,
    message: String(err.message ?? text).slice(0, 600),
    hint: HINTS[reason] ?? HINTS[status] ?? 'See the message from Google.',
  };
}
