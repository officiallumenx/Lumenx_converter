import { ENQUIRY_INBOX, isValidEmail } from "../utils/enquiry.js";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  submitViaWeb3Forms,
} from "./web3forms-client.js";

function readPublicWeb3Key(root) {
  return root?.getAttribute("data-contact-web3-key")?.trim() || "";
}

function setStatus(root, { tone, message }) {
  const status = root.querySelector("[data-contact-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
  status.classList.remove("hidden", "text-red-500", "text-emerald-600", "text-body-color");
  if (tone === "error") status.classList.add("text-red-500");
  else if (tone === "success") status.classList.add("text-emerald-600");
  else status.classList.add("text-body-color");
  status.classList.remove("hidden");
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

function showFieldError(form, name, message) {
  const err = form.querySelector(`[data-field-error="${name}"]`);
  const input = form.querySelector(`[name="${name}"]`);
  if (err) {
    err.textContent = message;
    err.classList.remove("hidden");
  }
  if (input) input.setAttribute("aria-invalid", "true");
}

function validateContact(raw) {
  const errors = {};
  const name = String(raw.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const email = String(raw.email ?? "").replace(/\s+/g, " ").trim().slice(0, 254);
  const institute = String(raw.institute ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  const message = String(raw.message ?? "").trim().slice(0, 4000);
  const honey = String(raw.companyWebsite ?? "").replace(/\s+/g, " ").trim();

  if (honey) {
    return { ok: true, honeypot: true };
  }
  if (!name) errors.name = "Name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (!message) errors.message = "Message is required.";
  else if (message.length < 8) errors.message = "Please add a little more detail.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      email,
      institute,
      message,
      submittedAt: new Date().toISOString(),
    },
  };
}

function contactSubject(data) {
  const institute = data.institute ? ` · ${data.institute}` : "";
  return `[LumenX] Website contact${institute}`;
}

function contactMessageText(data) {
  return [
    "Type: contact",
    `Submitted: ${data.submittedAt}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Institute: ${data.institute || "—"}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}

async function submitViaLeadsApi(data) {
  try {
    const response = await fetchWithTimeout("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
      body: JSON.stringify({
        intent: "question",
        name: data.name,
        email: data.email,
        institute: data.institute,
        message: data.message,
        phone: "",
        role: "",
        studentCount: "",
        company_website: "",
      }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.ok) return { ok: true, provider: "api" };
    if (body?.code === "not_configured") {
      return {
        ok: false,
        message: `Online delivery is not configured on this host. Please email ${ENQUIRY_INBOX}.`,
      };
    }
    return {
      ok: false,
      message: body?.error || `We could not deliver your message. Please email ${ENQUIRY_INBOX}.`,
    };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      ok: false,
      message: timedOut
        ? `The message service timed out. Please email ${ENQUIRY_INBOX}.`
        : `We could not reach the message service. Please email ${ENQUIRY_INBOX}.`,
    };
  }
}

async function deliver(root, data) {
  const web3Key = readPublicWeb3Key(root);
  if (web3Key) {
    const web3 = await submitViaWeb3Forms({
      accessKey: web3Key,
      subject: contactSubject(data),
      name: data.name,
      email: data.email,
      institute: data.institute,
      intent: "question",
      message: contactMessageText(data),
    });
    if (web3.ok) return { ok: true, provider: "web3forms" };
    // Fall through to /api/leads when browser Web3Forms fails.
  }
  return submitViaLeadsApi(data);
}

function initContactForm() {
  const root = document.querySelector("[data-contact-root]");
  const form = root?.querySelector("form[data-contact-form]");
  if (!root || !form || root.dataset.ready === "1") return;
  root.dataset.ready = "1";

  let submitting = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    clearFieldErrors(form);
    const fd = new FormData(form);
    const parsed = validateContact({
      name: fd.get("name"),
      email: fd.get("email"),
      institute: fd.get("institute"),
      message: fd.get("message"),
      companyWebsite: fd.get("companyWebsite"),
    });

    if (!parsed.ok) {
      Object.entries(parsed.errors).forEach(([key, msg]) => showFieldError(form, key, msg));
      setStatus(root, {
        tone: "error",
        message: "Please fix the highlighted fields and try again.",
      });
      return;
    }

    // Honeypot: accept silently for bots; do not call Web3Forms.
    if (parsed.honeypot) {
      setStatus(root, {
        tone: "success",
        message: "Thank you — your message was received.",
      });
      form.reset();
      return;
    }

    submitting = true;
    const submitBtn = form.querySelector('[type="submit"]');
    const previous = submitBtn?.textContent || "Send";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    setStatus(root, { tone: "info", message: "Sending your message…" });

    try {
      const result = await deliver(root, parsed.data);
      if (!result.ok) {
        setStatus(root, {
          tone: "error",
          message: result.message || `Please email ${ENQUIRY_INBOX}.`,
        });
        return;
      }
      // Reset only after confirmed delivery success.
      form.reset();
      setStatus(root, {
        tone: "success",
        message: "Thank you. Your message was sent successfully. Our team will reply by email.",
      });
    } catch {
      setStatus(root, {
        tone: "error",
        message: `We could not send your message. Please email ${ENQUIRY_INBOX}.`,
      });
    } finally {
      submitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = previous;
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initContactForm);
} else {
  initContactForm();
}
