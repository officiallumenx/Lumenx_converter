/**
 * Shared lead/enquiry email delivery (Resend → Web3Forms).
 * Used by Cloudflare Pages Functions and unit tests.
 * Never fabricates success when delivery did not happen.
 */

export const DELIVERY_INBOX = "lumenxtech.official@gmail.com";

function subjectFor(data) {
  if (data.subjectOverride) return data.subjectOverride;
  const labels = {
    question: "Ask a Question",
    demo: "Book a Demo",
    custom_application: "Custom Application",
  };
  const institute = data.instituteName ? ` · ${data.instituteName}` : "";
  return `[LumenX] ${labels[data.type] || "Enquiry"}${institute}`;
}

function messageText(data) {
  if (data.messageOverride) return data.messageOverride;
  return [
    `Type: ${data.type}`,
    data.legacyIntent ? `Legacy intent: ${data.legacyIntent}` : null,
    `Submitted: ${data.submittedAt}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.mobile ? `Mobile: ${data.mobile}` : null,
    data.phone ? `Phone: ${data.phone}` : null,
    data.instituteName ? `Institute: ${data.instituteName}` : null,
    data.role ? `Role: ${data.role}` : null,
    data.studentCount ? `Student count: ${data.studentCount}` : null,
    data.instituteType
      ? `Institute type: ${data.instituteType}${
          data.instituteTypeOther ? ` (${data.instituteTypeOther})` : ""
        }`
      : null,
    "",
    "Description:",
    data.description,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function hasDeliveryProvider(env = {}) {
  return Boolean(
    (typeof env.RESEND_API_KEY === "string" && env.RESEND_API_KEY.trim()) ||
      (typeof env.WEB3FORMS_ACCESS_KEY === "string" && env.WEB3FORMS_ACCESS_KEY.trim()),
  );
}

async function deliverResend(env, data, fetchImpl) {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.LEAD_EMAIL_FROM?.trim();
  const to = env.LEAD_EMAIL_TO?.trim() || DELIVERY_INBOX;
  if (!key || !from) return null;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: data.email,
      subject: subjectFor(data),
      text: messageText(data),
    }),
  });
  if (!response.ok) return { ok: false };
  return { ok: true, provider: "resend" };
}

async function deliverWeb3(env, data, fetchImpl) {
  const accessKey = env.WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) return null;
  const response = await fetchImpl("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject: subjectFor(data),
      from_name: "LumenX Website",
      replyto: data.email,
      name: data.name,
      email: data.email,
      phone: data.phone || data.mobile || "",
      institute: data.instituteName || "",
      intent: data.legacyIntent || data.type,
      message: messageText(data),
    }),
  });
  const body = await response.json().catch(() => null);
  if (response.ok && body?.success) return { ok: true, provider: "web3forms" };
  return { ok: false };
}

/**
 * @param {object} env
 * @param {object} data validated delivery payload
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{ ok: true, provider: string } | { ok: false, code?: string, error: string }>}
 */
export async function deliverLeadMessage(env, data, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!hasDeliveryProvider(env)) {
    return {
      ok: false,
      code: "not_configured",
      error: `Enquiry delivery is not configured on this host. Please email ${DELIVERY_INBOX}.`,
    };
  }

  const resend = await deliverResend(env, data, fetchImpl);
  if (resend?.ok) return resend;

  const web3 = await deliverWeb3(env, data, fetchImpl);
  if (web3?.ok) return web3;

  return {
    ok: false,
    code: "delivery_failed",
    error: `We could not deliver your message. Please email ${DELIVERY_INBOX}.`,
  };
}

export { subjectFor as buildLeadSubject, messageText as buildLeadMessageText };
