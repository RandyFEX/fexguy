# FEXGUY SEO monitor (read-only Google access)

A separate Vercel project (Root Directory `seo-monitor/`) with server-side
Vercel Functions only. It is not part of the public FEXGUY.com site: the site
project builds from the repository root and never includes this folder.

Authentication is keyless: each request exchanges the function's short-lived
Vercel OIDC token for a short-lived Google access token through Workload
Identity Federation, impersonating the existing read-only service account
`fexguy-seo-reader@fexguy-seo-monitoring.iam.gserviceaccount.com`. No service
account key is created or stored. Scopes are read-only
(`analytics.readonly`, `webmasters.readonly`).

## Endpoint

`GET /api/connectivity` (optionally `?test=ga4` or `?test=gsc`), with header
`Authorization: Bearer <SEO_MONITOR_TOKEN>`.

- GA4 property `386621285`: active users, sessions and page views for the last
  7 complete days.
- Search Console `sc-domain:fexguy.com`: the service account's permission
  level, then daily clicks, impressions, CTR and position for the 28 days
  ending 3 days ago.

Responses never contain a token. Failures name the stage (`configuration`,
`vercel-oidc`, `google-sts`, `impersonation`, or the API step) with Google's
error and a hint.

## Setup values

| Setting | Value |
|---|---|
| Google Cloud project ID | `fexguy-seo-monitoring` |
| Google Cloud project number | `370960302513` |
| Service account | `fexguy-seo-reader@fexguy-seo-monitoring.iam.gserviceaccount.com` |
| Workload identity pool ID | `vercel` |
| Provider ID | `vercel` |
| Vercel project name | `fexguy-seo-monitor` |
| Vercel team slug | `<TEAM_SLUG>` (from the Vercel dashboard URL) |

## 1. Google Cloud (project `fexguy-seo-monitoring`)

1. APIs & Services > Library: enable **IAM API**, **Security Token Service
   API** and **IAM Service Account Credentials API** (the Analytics Data API
   and Search Console API are already enabled).
2. IAM & Admin > Workload Identity Federation > Create pool:
   name `Vercel`, ID `vercel`.
3. Add a provider: **OpenID Connect (OIDC)**, name `Vercel`, ID `vercel`.
   - Issuer URL: `https://oidc.vercel.com/<TEAM_SLUG>`
   - JWK file: leave empty
   - Audience: **Allowed audiences**, Audience 1: `https://vercel.com/<TEAM_SLUG>`
4. Provider attributes:
   - `google.subject` = `assertion.sub`
   - Attribute condition (only this project's production deployments):
     `assertion.owner == "<TEAM_SLUG>" && assertion.project == "fexguy-seo-monitor" && assertion.environment == "production"`
5. IAM & Admin > Service Accounts > `fexguy-seo-reader` > Principals with
   access > Grant access:
   - Principal:
     `principal://iam.googleapis.com/projects/370960302513/locations/global/workloadIdentityPools/vercel/subject/owner:<TEAM_SLUG>:project:fexguy-seo-monitor:environment:production`
   - Role: **Workload Identity User**
6. Do not grant the service account any project roles; its GA4 Viewer and
   Search Console Restricted access are all it needs. On its Keys tab there
   should be no keys.

Cloud Shell equivalent (replace `TEAM_SLUG`):

```sh
gcloud config set project fexguy-seo-monitoring
gcloud services enable iam.googleapis.com sts.googleapis.com iamcredentials.googleapis.com
gcloud iam workload-identity-pools create vercel --location=global --display-name=Vercel
gcloud iam workload-identity-pools providers create-oidc vercel \
  --location=global --workload-identity-pool=vercel --display-name=Vercel \
  --issuer-uri="https://oidc.vercel.com/TEAM_SLUG" \
  --allowed-audiences="https://vercel.com/TEAM_SLUG" \
  --attribute-mapping="google.subject=assertion.sub" \
  --attribute-condition='assertion.owner == "TEAM_SLUG" && assertion.project == "fexguy-seo-monitor" && assertion.environment == "production"'
gcloud iam service-accounts add-iam-policy-binding \
  fexguy-seo-reader@fexguy-seo-monitoring.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principal://iam.googleapis.com/projects/370960302513/locations/global/workloadIdentityPools/vercel/subject/owner:TEAM_SLUG:project:fexguy-seo-monitor:environment:production"
```

## 2. Vercel

1. Add New > Project > import `RandyFEX/fexguy` again as a second project:
   - Project name: `fexguy-seo-monitor`
   - Root Directory: `seo-monitor`
   - Framework Preset: **Other** (no build command or output directory)
2. Settings > Security > Secure backend access with OIDC federation:
   **Enabled**, issuer mode **Team**.
3. Settings > Environment Variables, **Production only**:
   - `GCP_PROJECT_NUMBER` = `370960302513`
   - `GCP_SERVICE_ACCOUNT_EMAIL` = `fexguy-seo-reader@fexguy-seo-monitoring.iam.gserviceaccount.com`
   - `GCP_WORKLOAD_IDENTITY_POOL_ID` = `vercel`
   - `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` = `vercel`
   - `SEO_MONITOR_TOKEN` = a long random value (mark it Sensitive), e.g.
     from `openssl rand -hex 32`
4. Redeploy production after setting the variables.

## 3. Test

```sh
curl -sS -H "Authorization: Bearer $SEO_MONITOR_TOKEN" \
  https://fexguy-seo-monitor.vercel.app/api/connectivity
```

Preview deployments are intentionally refused by Google (the trust is for
`environment:production` only).
