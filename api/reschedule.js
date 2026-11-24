// Vercel Function: the private Reschedule Follow-Up form, served at
// /reschedule/ (vercel.json rewrite). See server/reschedule/handler.js.
//
// Server-side environment variables:
//   RESCHEDULE_PASSWORD (8+ characters)        the page's password; without it the URL is a 404
//   AGENT_CRM_TOKEN, AGENT_CRM_LOCATION_ID     the existing Agent CRM (GoHighLevel) integration
//   CALLBACK_WORKFLOW_ID (optional)            the callback workflow, left before a reschedule
// Agent CRM is written only on the production deployment.

import { handleReschedule } from '../server/reschedule/handler.js';

export async function GET(request) {
  return handleReschedule(request, process.env);
}

export async function POST(request) {
  return handleReschedule(request, process.env);
}
