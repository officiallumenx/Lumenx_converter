/**
 * Browser-side Web3Forms helper (official FormData submit pattern).
 * Access keys are public by design — supply via Astro `PUBLIC_WEB3FORMS_ACCESS_KEY`
 * (never commit the value; never log it).
 */

export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
/** Default request timeout (AbortController). */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * @param {string | null | undefined} selectorAttr value from data-*-web3-key
 */
export function normalizeAccessKey(selectorAttr) {
  return String(selectorAttr ?? "").trim();
}

/**
 * @param {RequestInfo | URL} url
 * @param {RequestInit & { timeoutMs?: number }} [init]
 */
export async function fetchWithTimeout(url, init = {}) {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal: outerSignal, ...rest } = init;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (outerSignal) outerSignal.removeEventListener("abort", onAbort);
  }
}

/**
 * Build the multipart FormData Web3Forms expects.
 * Required fields: access_key, name, email, message.
 *
 * @param {object} opts
 * @param {string} opts.accessKey
 * @param {string} opts.name
 * @param {string} opts.email
 * @param {string} opts.message
 * @param {string} [opts.subject]
 * @param {string} [opts.phone]
 * @param {string} [opts.institute]
 * @param {string} [opts.intent]
 * @returns {FormData | null} null when access key is missing
 */
export function buildWeb3FormsData({
  accessKey,
  name,
  email,
  message,
  subject = "",
  phone = "",
  institute = "",
  intent = "",
}) {
  const key = normalizeAccessKey(accessKey);
  if (!key) return null;

  const formData = new FormData();
  formData.append("access_key", key);
  formData.append("name", String(name ?? "").trim());
  formData.append("email", String(email ?? "").trim());
  formData.append("message", String(message ?? "").trim());
  if (subject) formData.append("subject", String(subject));
  formData.append("from_name", "LumenX Website");
  if (email) formData.append("replyto", String(email).trim());
  if (phone) formData.append("phone", String(phone));
  if (institute) formData.append("institute", String(institute));
  if (intent) formData.append("intent", String(intent));
  return formData;
}

/**
 * POST https://api.web3forms.com/submit with FormData; parse JSON response.
 *
 * @param {object} opts
 * @param {string} opts.accessKey
 * @param {string} [opts.subject]
 * @param {string} opts.name
 * @param {string} opts.email
 * @param {string} [opts.phone]
 * @param {string} [opts.institute]
 * @param {string} [opts.intent]
 * @param {string} opts.message
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{ ok: true } | { ok: false, error: string, timedOut?: boolean }>}
 */
export async function submitViaWeb3Forms({
  accessKey,
  subject = "",
  name,
  email,
  phone = "",
  institute = "",
  intent = "",
  message,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
}) {
  const formData = buildWeb3FormsData({
    accessKey,
    subject,
    name,
    email,
    phone,
    institute,
    intent,
    message,
  });
  if (!formData) {
    return { ok: false, error: "Web3Forms is not configured on this host." };
  }

  try {
    // Do not set Content-Type — the runtime must add the multipart boundary.
    const response = await fetchWithTimeout(WEB3FORMS_ENDPOINT, {
      method: "POST",
      body: formData,
      headers: { accept: "application/json" },
      timeoutMs,
    });

    const raw = await response.text();
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      const challenged = /just a moment|cf-browser-verification|cloudflare/i.test(raw);
      return {
        ok: false,
        error: challenged
          ? "The message service blocked this request. Please try again from your browser or email lumenxtech.official@gmail.com."
          : "The message service returned an invalid response. Please try again or email lumenxtech.official@gmail.com.",
      };
    }

    if (response.ok && body?.success === true) {
      return { ok: true };
    }

    const detail =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : `Web3Forms failed (${response.status}).`;
    return { ok: false, error: detail };
  } catch (error) {
    const timedOut =
      error?.name === "AbortError" ||
      /abort/i.test(String(error?.message ?? ""));
    return {
      ok: false,
      timedOut,
      error: timedOut
        ? "The message service timed out. Please try again or email lumenxtech.official@gmail.com."
        : "We could not reach the message service. Please try again or email lumenxtech.official@gmail.com.",
    };
  }
}
