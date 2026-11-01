import {
  ENQUIRY_INBOX,
  enquiryMessageText,
  enquirySubject,
  validateEnquiry,
} from "../utils/enquiry.js";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  submitViaWeb3Forms,
} from "./web3forms-client.js";

const VALID_TYPES = new Set(["question", "demo", "custom_application"]);

function readPublicWeb3Key() {
  const el = document.querySelector("[data-enquiry-web3-key]");
  return el?.getAttribute("data-enquiry-web3-key")?.trim() || "";
}

function collectFormData(form, type) {
  const fd = new FormData(form);
  return {
    type,
    name: fd.get("name"),
    email: fd.get("email"),
    description: fd.get("description"),
    mobile: fd.get("mobile"),
    phone: fd.get("phone"),
    instituteName: fd.get("instituteName"),
    instituteType: fd.get("instituteType"),
    instituteTypeOther: fd.get("instituteTypeOther"),
    companyWebsite: fd.get("companyWebsite"),
  };
}

function clearFieldErrors(form) {
  form.querySelectorAll("[data-field-error]").forEach((el) => {
    el.textContent = "";
    el.classList.add("hidden");
  });
  form.querySelectorAll("[aria-invalid]").forEach((el) => {
    el.removeAttribute("aria-invalid");
  });
}

function showFieldErrors(form, errors) {
  Object.entries(errors || {}).forEach(([key, message]) => {
    const err = form.querySelector(`[data-field-error="${key}"]`);
    const input = form.querySelector(`[name="${key}"]`);
    if (err) {
      err.textContent = message;
      err.classList.remove("hidden");
    }
    if (input) input.setAttribute("aria-invalid", "true");
  });
}

function clearSubmitUi(form) {
  const status = form.querySelector("[data-enquiry-form-status]");
  const submitBtn = form.querySelector("[data-enquiry-submit]");
  if (status) {
    status.textContent = "";
    status.classList.add("hidden");
    status.classList.remove("text-red-600", "text-emerald-700", "text-body-color");
  }
  if (submitBtn) {
    submitBtn.classList.remove("is-sending", "is-success", "is-error");
  }
}

function setFormFeedback(form, { tone, message, buttonLabel, keepDisabled = false }) {
  const status = form.querySelector("[data-enquiry-form-status]");
  const submitBtn = form.querySelector("[data-enquiry-submit]");

  if (status) {
    status.textContent = message;
    status.classList.remove("hidden", "text-red-600", "text-emerald-700", "text-body-color");
    if (tone === "error") status.classList.add("text-red-600");
    else if (tone === "success") status.classList.add("text-emerald-700");
    else status.classList.add("text-body-color");
  }

  if (submitBtn) {
    submitBtn.classList.remove("is-sending", "is-success", "is-error");
    if (tone === "info") submitBtn.classList.add("is-sending");
    if (tone === "success") submitBtn.classList.add("is-success");
    if (tone === "error") submitBtn.classList.add("is-error");
    if (buttonLabel) submitBtn.textContent = buttonLabel;
    submitBtn.disabled = Boolean(keepDisabled || tone === "info" || tone === "success");
  }
}

async function submitViaApi(data) {
  try {
    const response = await fetchWithTimeout("/api/enquiry", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
      body: JSON.stringify({
        ...data,
        company_website: data.companyWebsite || "",
      }),
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (response.status === 404 || response.status === 405) return null;
    if (body?.code === "not_configured") return { kind: "not_configured", body };
    if (response.ok && body?.ok) return { kind: "ok", body };
    if (response.status === 400 && body?.errors) return { kind: "validation", body };
    return {
      kind: "error",
      body: body || { error: `We could not deliver your message. Please email ${ENQUIRY_INBOX}.` },
    };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      kind: "error",
      body: {
        error: timedOut
          ? `The message service timed out. Please email ${ENQUIRY_INBOX}.`
          : `We could not reach the message service. Please email ${ENQUIRY_INBOX}.`,
      },
    };
  }
}

/**
 * Delivery order (hostname-agnostic — preview hosts are allowed):
 * 1) Browser Web3Forms when PUBLIC_WEB3FORMS_ACCESS_KEY is baked into the page
 * 2) Pages Function POST /api/enquiry (WEB3FORMS_ACCESS_KEY and/or Resend secrets)
 * No FormSubmit fallback — success only when a provider confirms delivery.
 */
async function deliver(data) {
  const web3Key = readPublicWeb3Key();
  if (web3Key) {
    const web3 = await submitViaWeb3Forms({
      accessKey: web3Key,
      subject: enquirySubject(data),
      name: data.name,
      email: data.email,
      phone: data.phone || data.mobile || "",
      institute: data.instituteName || "",
      intent: data.type,
      message: enquiryMessageText(data),
    });
    if (web3.ok) return { ok: true, provider: "web3forms" };
    // Fall through to the Function so Resend / server Web3Forms can still deliver.
  }

  const api = await submitViaApi(data);
  if (api?.kind === "ok") return { ok: true, provider: api.body.provider || "api" };
  if (api?.kind === "validation") return { ok: false, validation: api.body.errors };
  if (api?.kind === "not_configured") {
    return {
      ok: false,
      message: `Online delivery is not configured on this host. Please email ${ENQUIRY_INBOX}.`,
    };
  }
  if (api?.kind === "error") {
    return { ok: false, message: api.body.error || `Please email ${ENQUIRY_INBOX}.` };
  }

  return {
    ok: false,
    message: `Online delivery is not configured on this host. Please email ${ENQUIRY_INBOX}.`,
  };
}

function syncOtherField(panel) {
  const select = panel.querySelector('[name="instituteType"]');
  const wrap = panel.querySelector("[data-institute-other]");
  const input = panel.querySelector('[name="instituteTypeOther"]');
  if (!select || !wrap) return;
  const show = select.value === "Other";
  wrap.classList.toggle("hidden", !show);
  if (input) {
    input.required = show;
    if (!show) input.value = "";
  }
}

function switchType(root, type) {
  if (!VALID_TYPES.has(type)) return;
  root.querySelectorAll("[data-enquiry-type-btn]").forEach((btn) => {
    const active = btn.getAttribute("data-enquiry-type-btn") === type;
    btn.setAttribute("aria-selected", active ? "true" : "false");
    btn.classList.toggle("is-active", active);
  });
  root.querySelectorAll("[data-enquiry-panel]").forEach((panel) => {
    const match = panel.getAttribute("data-enquiry-panel") === type;
    panel.classList.toggle("hidden", !match);
    panel.toggleAttribute("hidden", !match);
  });
  root.setAttribute("data-active-type", type);
  root.querySelectorAll("form[data-enquiry-form]").forEach((form) => clearSubmitUi(form));
}

function intentFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const intent = (params.get("intent") || "").trim().toLowerCase();
  if (VALID_TYPES.has(intent)) return intent;
  if (intent === "custom") return "custom_application";
  const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  if (hash === "demo" || hash === "enquiry-demo") return "demo";
  if (hash === "question" || hash === "enquiry-question") return "question";
  if (hash === "custom" || hash === "custom_application") return "custom_application";
  return null;
}

function applyIntentFromUrl(root) {
  const type = intentFromLocation();
  if (type) switchType(root, type);
  const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  if (type || hash === "enquiry") {
    // Wait a tick so layout/sticky header settle before scrolling.
    requestAnimationFrame(() => {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function initEnquiryForms() {
  const root = document.querySelector("[data-enquiry-root]");
  if (!root || root.dataset.ready === "1") return;
  root.dataset.ready = "1";

  root.querySelectorAll("[data-enquiry-type-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchType(root, btn.getAttribute("data-enquiry-type-btn"));
    });
  });

  root.querySelectorAll('[name="instituteType"]').forEach((select) => {
    select.addEventListener("change", () => {
      const panel = select.closest("[data-enquiry-panel]");
      if (panel) syncOtherField(panel);
    });
  });

  root.querySelectorAll("[data-enquiry-panel]").forEach((panel) => syncOtherField(panel));
  applyIntentFromUrl(root);

  root.querySelectorAll("form[data-enquiry-form]").forEach((form) => {
    let submitting = false;
    const defaultLabel =
      form.querySelector("[data-enquiry-submit]")?.textContent?.trim() || "Submit";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting) return;

      const type = form.getAttribute("data-enquiry-form");
      clearFieldErrors(form);
      clearSubmitUi(form);
      const raw = collectFormData(form, type);
      const parsed = validateEnquiry(raw);
      if (!parsed.ok) {
        showFieldErrors(form, parsed.errors);
        setFormFeedback(form, {
          tone: "error",
          message: "Please fix the highlighted fields.",
          buttonLabel: defaultLabel,
          keepDisabled: false,
        });
        const submitBtn = form.querySelector("[data-enquiry-submit]");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Honeypot: accept silently for bots; do not call Web3Forms.
      if (parsed.data.honeypot) {
        setFormFeedback(form, {
          tone: "success",
          message: "Submitted successfully.",
          buttonLabel: "Submitted ✓",
          keepDisabled: true,
        });
        form.reset();
        return;
      }

      submitting = true;
      setFormFeedback(form, {
        tone: "info",
        message: "Sending…",
        buttonLabel: "Sending…",
        keepDisabled: true,
      });

      try {
        const result = await deliver(parsed.data);
        if (result.validation) {
          showFieldErrors(form, result.validation);
          setFormFeedback(form, {
            tone: "error",
            message: "Please fix the highlighted fields.",
            buttonLabel: defaultLabel,
            keepDisabled: false,
          });
          const submitBtn = form.querySelector("[data-enquiry-submit]");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        if (!result.ok) {
          setFormFeedback(form, {
            tone: "error",
            message: result.message || `Please email ${ENQUIRY_INBOX}.`,
            buttonLabel: "Try again",
            keepDisabled: false,
          });
          const submitBtn = form.querySelector("[data-enquiry-submit]");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        // Reset only after confirmed delivery success.
        form.reset();
        syncOtherField(form.closest("[data-enquiry-panel]") || form);
        setFormFeedback(form, {
          tone: "success",
          message: "Submitted successfully. We will reply by email.",
          buttonLabel: "Submitted ✓",
          keepDisabled: true,
        });
      } catch {
        setFormFeedback(form, {
          tone: "error",
          message: `We could not send your enquiry. Please email ${ENQUIRY_INBOX}.`,
          buttonLabel: "Try again",
          keepDisabled: false,
        });
        const submitBtn = form.querySelector("[data-enquiry-submit]");
        if (submitBtn) submitBtn.disabled = false;
      } finally {
        submitting = false;
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEnquiryForms);
} else {
  initEnquiryForms();
}
