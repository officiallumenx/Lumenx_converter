/**
 * Cloudflare Pages Function — POST /api/enquiry
 *
 * Env (Pages → Settings → Environment variables / secrets):
 * - LEAD_EMAIL_TO (optional; defaults to lumenxtech.official@gmail.com)
 * - WEB3FORMS_ACCESS_KEY and/or RESEND_API_KEY
 * - LEAD_EMAIL_FROM (required when using Resend)
 */

import { validateEnquiry, ENQUIRY_INBOX } from "../../src/utils/enquiry.js";
import { deliverLeadMessage } from "../../src/utils/lead-delivery.js";
import { withinRateLimit } from "../../src/utils/rate-limit.js";

const MAX_BODY = 12_000;
const rateHits = new Map();

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!withinRateLimit(rateHits, request)) {
    return json(
      { ok: false, error: `Too many messages. Please email ${ENQUIRY_INBOX} or try again later.` },
      429,
    );
  }

  let raw;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ ok: false, error: "Message is too long." }, 413);
    raw = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const parsed = validateEnquiry(raw);
  if (!parsed.ok) {
    return json(
      { ok: false, error: "Please fix the highlighted fields.", errors: parsed.errors },
      400,
    );
  }

  if (parsed.data.honeypot) {
    return json({ ok: true, submittedAt: parsed.data.submittedAt }, 200);
  }

  const result = await deliverLeadMessage(env, parsed.data);
  if (result.ok) {
    return json(
      { ok: true, provider: result.provider, submittedAt: parsed.data.submittedAt },
      200,
    );
  }

  if (result.code === "not_configured") {
    return json(
      {
        ok: false,
        error: result.error,
        inbox: ENQUIRY_INBOX,
        code: "not_configured",
      },
      503,
    );
  }

  return json(
    {
      ok: false,
      error: result.error,
      inbox: ENQUIRY_INBOX,
    },
    502,
  );
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed" }, 405);
}
