/**
 * Cloudflare Pages Function — POST /api/leads
 * Compatibility adapter for the legacy monorepo marketing Worker endpoint.
 *
 * Same delivery secrets as /api/enquiry:
 * - LEAD_EMAIL_TO (optional)
 * - WEB3FORMS_ACCESS_KEY and/or RESEND_API_KEY
 * - LEAD_EMAIL_FROM (required for Resend)
 */

import { parseLegacyLead, leadToDeliveryPayload, LEAD_INBOX } from "../../src/utils/leads.js";
import { deliverLeadMessage } from "../../src/utils/lead-delivery.js";
import { withinRateLimit } from "../../src/utils/rate-limit.js";

const MAX_BODY = 12_000;
const rateHits = new Map();

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    vary: "Origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
    "access-control-max-age": "86400",
  };
}

function allowedOrigin(request) {
  const origin = request.headers.get("origin")?.trim() ?? "";
  if (!origin) return null;
  let selfOrigin = "";
  try {
    selfOrigin = new URL(request.url).origin;
  } catch {
    return null;
  }
  const allowed = new Set([
    "https://lumenxtech.in",
    "https://www.lumenxtech.in",
    selfOrigin,
  ]);
  // Staging Pages previews (*.pages.dev) are same-origin when forms post to self.
  if (origin === selfOrigin) return origin;
  if (origin.endsWith(".pages.dev") && selfOrigin.endsWith(".pages.dev")) return origin;
  return allowed.has(origin) ? origin : null;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = allowedOrigin(request);

  if (request.method === "OPTIONS") {
    if (!origin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  // Same-origin browser posts always send Origin; allow missing Origin for server-side tools on staging.
  const effectiveOrigin = origin || (() => {
    try {
      return new URL(request.url).origin;
    } catch {
      return null;
    }
  })();

  if (request.headers.get("origin") && !origin) {
    return json(
      { error: "This form only accepts messages from the LumenX website." },
      403,
      null,
    );
  }

  if (!withinRateLimit(rateHits, request)) {
    return json(
      { error: `Too many messages. Please email ${LEAD_INBOX} or try again later.` },
      429,
      effectiveOrigin,
    );
  }

  let raw;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) {
      return json({ error: "Message is too long." }, 413, effectiveOrigin);
    }
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON body" }, 400, effectiveOrigin);
  }

  const parsed = parseLegacyLead(raw);
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400, effectiveOrigin);
  }

  if (parsed.honeypot) {
    return json({ ok: true }, 200, effectiveOrigin);
  }

  const deliveryPayload = leadToDeliveryPayload(parsed.data);
  const result = await deliverLeadMessage(env, deliveryPayload);

  if (result.ok) {
    return json({ ok: true }, 200, effectiveOrigin);
  }

  if (result.code === "not_configured") {
    return json(
      {
        ok: false,
        error: result.error,
        inbox: LEAD_INBOX,
        code: "not_configured",
      },
      503,
      effectiveOrigin,
    );
  }

  return json(
    { error: result.error || `We could not deliver your message. Please email ${LEAD_INBOX}.` },
    502,
    effectiveOrigin,
  );
}
