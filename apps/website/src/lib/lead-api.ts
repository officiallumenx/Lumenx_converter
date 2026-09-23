import {
  deliverWebsiteLead,
  LEAD_INBOX_EMAIL,
  parseWebsiteLeadPayload,
  type LeadMailEnv,
} from "./lead-mail";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": "86400",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
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

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const lead = parseWebsiteLeadPayload(raw);
  if (!lead) {
    return json(
      { error: "Name, email, and a valid intent are required." },
      400,
    );
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
        {
          error: result.error,
          needsActivation: Boolean(result.needsActivation),
          inbox: LEAD_INBOX_EMAIL,
        },
        result.needsActivation ? 409 : 502,
      );
    }
    return json({ ok: true, provider: result.provider }, 200);
  } catch (error) {
    console.error("[leads]", error);
    return json(
      {
        error: `We could not reach the message service. Please email ${LEAD_INBOX_EMAIL}.`,
        inbox: LEAD_INBOX_EMAIL,
      },
      502,
    );
  }
}
