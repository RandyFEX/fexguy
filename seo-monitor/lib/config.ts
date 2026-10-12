// Settings for read-only Google access. Identifiers only: none of these are
// secrets. The Google credential is never stored anywhere; each request
// exchanges this deployment's short-lived Vercel OIDC token for a short-lived
// Google access token (Workload Identity Federation + service account
// impersonation).

export const GA4_PROPERTY_ID = '386621285';
export const GSC_SITE = 'sc-domain:fexguy.com';

/** Read-only scopes only. */
export const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

/** Environment variables the Vercel project must define (see README.md). */
export const REQUIRED_ENV = [
  'GCP_PROJECT_NUMBER',
  'GCP_SERVICE_ACCOUNT_EMAIL',
  'GCP_WORKLOAD_IDENTITY_POOL_ID',
  'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID',
] as const;

export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}
