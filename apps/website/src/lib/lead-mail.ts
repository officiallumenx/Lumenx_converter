/** Inbox for Book a Demo / contact / get-started leads. */
export const LEAD_INBOX_EMAIL = "lumenxtech.official@gmail.com";

export type WebsiteLeadIntent = "trial" | "quote" | "partner" | "question" | "demo";

export type WebsiteLeadPayload = {
  name: string;
  institute: string;
  role: string;
  email: string;
  phone: string;
  studentCount: string;
  message: string;
  intent: WebsiteLeadIntent;
  submittedAt?: string;
};

const INTENTS = new Set<WebsiteLeadIntent>([
  "trial",
  "quote",
  "partner",
  "question",
  "demo",
]);

export function isWebsiteLeadIntent(value: unknown): value is WebsiteLeadIntent {
  return typeof value === "string" && INTENTS.has(value as WebsiteLeadIntent);
}

export function parseWebsiteLeadPayload(raw: unknown): WebsiteLeadPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!email.includes("@") || !name) return null;
  if (!isWebsiteLeadIntent(body.intent)) return null;

  return {
    name,
    institute: String(body.institute ?? "").trim(),
    role: String(body.role ?? "").trim(),
    email,
    phone: String(body.phone ?? "").trim(),
    studentCount: String(body.studentCount ?? "").trim(),
    message: String(body.message ?? "").trim(),
    intent: body.intent,
    submittedAt:
      typeof body.submittedAt === "string" && body.submittedAt.trim()
        ? body.submittedAt.trim()
        : undefined,
  };
}

export function leadSubject(lead: WebsiteLeadPayload): string {
  const labels: Record<WebsiteLeadIntent, string> = {
    demo: "Book a demo",
    trial: "Start trial",
    quote: "Request quote",
    partner: "Partnership",
    question: "Leave a message",
  };
  const institute = lead.institute ? ` · ${lead.institute}` : "";
  return `[LumenX] ${labels[lead.intent]}${institute}`;
}

export function leadEmailText(lead: WebsiteLeadPayload): string {
  const lines = [
    `Intent: ${lead.intent}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "—"}`,
    `Institute: ${lead.institute || "—"}`,
    `Role: ${lead.role || "—"}`,
    `Student count: ${lead.studentCount || "—"}`,
    `Submitted: ${lead.submittedAt ?? new Date().toISOString()}`,
    "",
    "Message:",
    lead.message || "(none)",
  ];
  return lines.join("\n");
}

export type LeadMailEnv = {
  RESEND_API_KEY?: string;
  LEAD_EMAIL_FROM?: string;
  LEAD_EMAIL_TO?: string;
  WEB3FORMS_ACCESS_KEY?: string;
  /** When "0"/"false", skip FormSubmit fallback. */
  LEAD_FORMSUBMIT?: string;
};

export type LeadDeliveryOptions = {
  /** Public page URL FormSubmit binds activation to (e.g. https://site/contact). */
  pageUrl?: string;
  origin?: string;
};

function truthy(value: string | undefined, fallback = true): boolean {
  if (value == null || value.trim() === "") return fallback;
  const v = value.trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}

export type LeadDeliveryResult =
  | { ok: true; provider: "resend" | "web3forms" | "formsubmit" }
  | {
      ok: false;
      error: string;
      /** FormSubmit sent (or re-sent) an activation email — check inbox/spam. */
      needsActivation?: boolean;
    };

function isFormSubmitSuccess(json: { success?: unknown; message?: unknown } | null): boolean {
  if (!json) return false;
  return json.success === true || json.success === "true";
}

function isFormSubmitActivation(message: string): boolean {
  return /activat/i.test(message);
}

async function sendViaResend(
  env: LeadMailEnv,
  lead: WebsiteLeadPayload,
): Promise<LeadDeliveryResult | null> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.LEAD_EMAIL_FROM?.trim();
  if (!key || !from) return null;

  const to = env.LEAD_EMAIL_TO?.trim() || LEAD_INBOX_EMAIL;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: lead.email,
      subject: leadSubject(lead),
      text: leadEmailText(lead),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      error: `Resend failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    };
  }
  return { ok: true, provider: "resend" };
}

async function sendViaWeb3Forms(
  env: LeadMailEnv,
  lead: WebsiteLeadPayload,
): Promise<LeadDeliveryResult | null> {
  const accessKey = env.WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) return null;

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      subject: leadSubject(lead),
      from_name: "LumenX Website",
      replyto: lead.email,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      institute: lead.institute,
      role: lead.role,
      student_count: lead.studentCount,
      intent: lead.intent,
      message: leadEmailText(lead),
    }),
  });

  let json: { success?: boolean; message?: string } | null = null;
  try {
    json = (await response.json()) as { success?: boolean; message?: string };
  } catch {
    json = null;
  }

  if (!response.ok || !json?.success) {
    return {
      ok: false,
      error: json?.message || `Web3Forms failed (${response.status})`,
    };
  }
  return { ok: true, provider: "web3forms" };
}

async function sendViaFormSubmit(
  env: LeadMailEnv,
  lead: WebsiteLeadPayload,
  options: LeadDeliveryOptions = {},
): Promise<LeadDeliveryResult> {
  if (!truthy(env.LEAD_FORMSUBMIT, true)) {
    return { ok: false, error: "Lead email delivery is not configured." };
  }

  const inbox = env.LEAD_EMAIL_TO?.trim() || LEAD_INBOX_EMAIL;
  const to = encodeURIComponent(inbox);
  const pageUrl = options.pageUrl?.trim() || options.origin?.trim() || "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (options.origin) {
    headers.Origin = options.origin;
    headers.Referer = pageUrl || options.origin;
  }

  const response = await fetch(`https://formsubmit.co/ajax/${to}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      institute: lead.institute,
      role: lead.role,
      studentCount: lead.studentCount,
      intent: lead.intent,
      message: leadEmailText(lead),
      _subject: leadSubject(lead),
      _template: "table",
      _replyto: lead.email,
      _captcha: "false",
      _honey: "",
      ...(pageUrl ? { _url: pageUrl } : {}),
    }),
  });

  let json: { success?: unknown; message?: unknown; error?: unknown } | null = null;
  try {
    json = (await response.json()) as {
      success?: unknown;
      message?: unknown;
      error?: unknown;
    };
  } catch {
    json = null;
  }

  const message = String(json?.message ?? json?.error ?? "").trim();

  if (isFormSubmitSuccess(json)) {
    return { ok: true, provider: "formsubmit" };
  }

  if (isFormSubmitActivation(message)) {
    return {
      ok: false,
      needsActivation: true,
      error: `Check ${inbox} (and Spam) for a FormSubmit “Activate Form” email, click the link once, then submit again. ${message}`,
    };
  }

  if (!response.ok) {
    const detail = message || (await response.text().catch(() => ""));
    return {
      ok: false,
      error: `FormSubmit failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    };
  }

  return {
    ok: false,
    error: message || "FormSubmit did not accept the submission.",
  };
}

/**
 * Deliver a lead to the LumenX inbox.
 * Order: Resend → Web3Forms → FormSubmit.
 */
export async function deliverWebsiteLead(
  env: LeadMailEnv,
  lead: WebsiteLeadPayload,
  options: LeadDeliveryOptions = {},
): Promise<LeadDeliveryResult> {
  const resend = await sendViaResend(env, lead);
  if (resend?.ok) return resend;

  const web3 = await sendViaWeb3Forms(env, lead);
  if (web3?.ok) return web3;
  // If Web3Forms is configured, do not fall through to FormSubmit (activation noise).
  if (web3 && !web3.ok && env.WEB3FORMS_ACCESS_KEY?.trim()) {
    return web3;
  }

  const formSubmit = await sendViaFormSubmit(env, lead, options);
  if (formSubmit.ok) return formSubmit;

  // Surface the most actionable error.
  if (formSubmit.needsActivation) return formSubmit;
  if (web3 && !web3.ok) return web3;
  if (resend && !resend.ok) return resend;
  return formSubmit;
}
