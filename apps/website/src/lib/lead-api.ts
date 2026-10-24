import {
  deliverWebsiteLead,
  LEAD_INBOX_EMAIL,
  parseWebsiteLeadPayload,
  type LeadMailEnv,
} from "./lead-mail";

const MAX_BODY_CHARS = 12_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;

const rateHits = new Map<string, { count: number; reset: number }>();

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    vary: "Origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
    "access-control-max-age": "86400",
  };
}

function allowedOrigin(request: Request): string | null {
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
  return allowed.has(origin) ? origin : null;
}

function withinRateLimit(request: Request): boolean {
  const ip = request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  const now = Date.now();
  if (rateHits.size > 500) {
    for (const [key, row] of rateHits) {
      if (row.reset < now) rateHits.delete(key);
    }
  }
  const row = rateHits.get(ip);
  if (!row || row.reset < now) {
    rateHits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  row.count += 1;
  return row.count <= RATE_MAX;
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

function envFrom(env: unknown): LeadMailEnv {
  const record =
    env && typeof env === "object" ? (env as Record<string, unknown>) : {};
  const read = (key: string): string | undefined => {
    const fromBinding = record[key];
    if (typeof fromBinding === "string" && fromBinding.trim()) {
      return fromBinding.trim();
    }
    try {
      const fromMeta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
        .env?.[key];
      if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
    } catch {
      // ignore
    }
    if (typeof process !== "undefined" && process.env?.[key]?.trim()) {
      return process.env[key]!.trim();
    }
    return undefined;
  };
  return {
    RESEND_API_KEY: read("RESEND_API_KEY"),
    LEAD_EMAIL_FROM: read("LEAD_EMAIL_FROM"),
    LEAD_EMAIL_TO: read("LEAD_EMAIL_TO"),
    WEB3FORMS_ACCESS_KEY:
      read("WEB3FORMS_ACCESS_KEY") ??
      read("VITE_WEB3FORMS_ACCESS_KEY"),
    LEAD_FORMSUBMIT: read("LEAD_FORMSUBMIT"),
  };
}

function pageContext(request: Request): { origin?: string; pageUrl?: string } {
  const originHeader = request.headers.get("origin")?.trim();
  const referer = request.headers.get("referer")?.trim();
  const requestOrigin = new URL(request.url).origin;
  const origin = originHeader || (referer ? new URL(referer).origin : requestOrigin);
  const pageUrl = referer || `${origin}/contact`;
  return { origin, pageUrl };
}

/**
 * Handle `POST /api/leads` (and CORS preflight).
 * Returns null when the request is not for this path.
 */
export async function handleLeadApiRequest(
  request: Request,
  env: unknown,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/leads") return null;

  const origin = allowedOrigin(request);

  if (request.method === "OPTIONS") {
    if (!origin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  if (!origin) {
    return json({ error: "This form only accepts messages from the LumenX website." }, 403, null);
  }

  if (!withinRateLimit(request)) {
    return json(
      { error: `Too many messages. Please email ${LEAD_INBOX_EMAIL} or try again later.` },
      429,
      origin,
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_CHARS) {
    return json({ error: "Message is too long." }, 413, origin);
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return json({ error: "Message is too long." }, 413, origin);
    }
    raw = JSON.parse(text) as unknown;
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const honey = String((raw as Record<string, unknown>).company_website ?? "").trim();
    if (honey) return json({ ok: true }, 200, origin);
  }

  const lead = parseWebsiteLeadPayload(raw);
  if (!lead) {
    return json({ error: "Name, email, and a valid intent are required." }, 400, origin);
  }

  const payload = {
    ...lead,
    submittedAt: lead.submittedAt ?? new Date().toISOString(),
  };

  try {
    const result = await deliverWebsiteLead(envFrom(env), payload, pageContext(request));
    if (!result.ok) {
      console.error("[leads]", result.error);
      return json(
        { error: `We could not deliver your message. Please email ${LEAD_INBOX_EMAIL}.` },
        502,
        origin,
      );
    }
    return json({ ok: true }, 200, origin);
  } catch (error) {
    console.error("[leads]", error);
    return json(
      { error: `We could not reach the message service. Please email ${LEAD_INBOX_EMAIL}.` },
      502,
      origin,
    );
  }
}
