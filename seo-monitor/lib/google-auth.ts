// Keyless Google authentication from a Vercel Function, following Vercel's
// "Connect to Google Cloud Platform" guide: the function's Vercel OIDC token
// (x-vercel-oidc-token, read by @vercel/oidc) is exchanged at Google's
// Security Token Service for a federated token, which then impersonates the
// existing read-only service account. No service account key exists.
import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { SCOPES } from './config.js';

export class AuthStageError extends Error {
  constructor(
    readonly stage: 'vercel-oidc' | 'google-sts' | 'impersonation' | 'unknown',
    message: string,
    readonly hint: string,
  ) {
    super(message);
  }
}

/** Google's error text, never a token: error bodies hold codes and messages. */
const describe = (error: unknown): string => {
  const e = error as { message?: string; response?: { data?: unknown } };
  const data = e?.response?.data;
  const body = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : '';
  return [e?.message, body].filter(Boolean).join(' | ').slice(0, 600);
};

export async function getGoogleAccessToken(): Promise<string> {
  const env = process.env;

  // 1. The Vercel OIDC token (default audience https://vercel.com/<team>).
  try {
    await getVercelOidcToken();
  } catch (error) {
    throw new AuthStageError(
      'vercel-oidc',
      describe(error),
      'No Vercel OIDC token: this only works in a deployed Vercel Function with "Secure backend access with OIDC federation" enabled (Project Settings > Security).',
    );
  }

  const client = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${env.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${env.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    // Called without arguments so the token keeps Vercel's default audience,
    // which the provider's "Allowed audiences" accepts.
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
    scopes: SCOPES,
  });
  if (!client) throw new AuthStageError('unknown', 'Could not create the external account client.', 'Check the GCP_* environment variables.');

  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error('Google returned no access token.');
    return token;
  } catch (error) {
    const text = describe(error);
    if (/iamcredentials|generateAccessToken|serviceAccounts|iam\.serviceAccounts\.getAccessToken/i.test(text)) {
      throw new AuthStageError(
        'impersonation',
        text,
        'The federated identity could not impersonate the service account. Check: the "Workload Identity User" role on fexguy-seo-reader for the exact Vercel principal (owner:<team>:project:<project>:environment:production), and that the IAM Service Account Credentials API is enabled.',
      );
    }
    if (/sts\.googleapis|invalid_grant|invalid_target|unauthorized_client|audience|attribute condition|issuer/i.test(text)) {
      throw new AuthStageError(
        'google-sts',
        text,
        'Google rejected the Vercel token. Check the provider: issuer https://oidc.vercel.com/<team-slug>, allowed audience https://vercel.com/<team-slug>, mapping google.subject=assertion.sub, the attribute condition, and that this is the production deployment.',
      );
    }
    throw new AuthStageError('unknown', text, 'Unexpected authentication failure; see the message.');
  }
}
