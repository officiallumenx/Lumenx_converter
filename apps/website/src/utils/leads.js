/**
 * Legacy website lead payload parsing (compatible with old POST /api/leads).
 */

export const LEAD_INBOX = "lumenxtech.official@gmail.com";

export const LEAD_INTENTS = ["trial", "quote", "partner", "question", "demo"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clip(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function isLeadIntent(value) {
  return typeof value === "string" && LEAD_INTENTS.includes(value);
}

/**
 * @returns {{ ok: true, data: object, honeypot?: boolean } | { ok: false, error: string }}
 */
export function parseLegacyLead(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid submission." };
  }
  const body = raw;
  const honey = clip(body.company_website ?? body.companyWebsite, 200);
  if (honey) {
    return {
      ok: true,
      honeypot: true,
      data: { honeypot: true, submittedAt: new Date().toISOString() },
    };
  }

  const email = clip(body.email, 254);
  const name = clip(body.name, 120);
  const message = String(body.message ?? "").trim().slice(0, 4000);
  if (!name || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Name, email, and a valid intent are required." };
  }
  if (!isLeadIntent(body.intent)) {
    return { ok: false, error: "Name, email, and a valid intent are required." };
  }

  return {
    ok: true,
    data: {
      name,
      institute: clip(body.institute, 160),
      role: clip(body.role, 80),
      email,
      phone: clip(body.phone, 40),
      studentCount: clip(body.studentCount, 12),
      message,
      intent: body.intent,
      submittedAt:
        typeof body.submittedAt === "string" && body.submittedAt.trim()
          ? body.submittedAt.trim().slice(0, 40)
          : new Date().toISOString(),
    },
  };
}

export function leadSubject(lead) {
  const labels = {
    demo: "Book a demo",
    trial: "Start trial",
    quote: "Request quote",
    partner: "Partnership",
    question: "Leave a message",
  };
  const institute = lead.institute ? ` · ${lead.institute}` : "";
  return `[LumenX] ${labels[lead.intent] || "Lead"}${institute}`;
}

export function leadMessageText(lead) {
  return [
    `Intent: ${lead.intent}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "—"}`,
    `Institute: ${lead.institute || "—"}`,
    `Role: ${lead.role || "—"}`,
    `Student count: ${lead.studentCount || "—"}`,
    `Submitted: ${lead.submittedAt}`,
    "",
    "Message:",
    lead.message || "(none)",
  ].join("\n");
}

/** Map a legacy lead into the enquiry-shaped delivery envelope used by shared mail helpers. */
export function leadToDeliveryPayload(lead) {
  return {
    type: lead.intent === "demo" ? "demo" : "question",
    legacyIntent: lead.intent,
    name: lead.name,
    email: lead.email,
    description: lead.message || `(${lead.intent})`,
    mobile: "",
    phone: lead.phone || "",
    instituteName: lead.institute || "",
    instituteType: "",
    instituteTypeOther: "",
    role: lead.role || "",
    studentCount: lead.studentCount || "",
    submittedAt: lead.submittedAt,
    subjectOverride: leadSubject(lead),
    messageOverride: leadMessageText(lead),
  };
}
