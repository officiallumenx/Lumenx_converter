import {
  LEAD_INBOX_EMAIL,
  leadEmailText,
  leadSubject,
  type WebsiteLeadIntent,
} from "./lead-mail";

export type { WebsiteLeadIntent };

export type WebsiteLead = {
  name: string;
  institute: string;
  role: string;
  email: string;
  phone: string;
  studentCount: string;
  message: string;
  intent: WebsiteLeadIntent;
  submittedAt: string;
  /** Filled only by bots. Real submissions leave this empty. */
  companyWebsite?: string;
};

export type LeadSubmitResult =
  | { ok: true; mode: "remote"; lead: WebsiteLead }
  | {
      ok: false;
      mode: "unavailable" | "remote-error" | "needs-activation";
      lead: WebsiteLead;
      message: string;
      inbox?: string;
    };

function readLeadEndpoint(): string {
  const value = import.meta.env.VITE_LEAD_ENDPOINT?.trim();
  return value || "/api/leads";
}

function readWeb3FormsKey(): string | null {
  const value = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();
  return value || null;
}

function buildLead(lead: Omit<WebsiteLead, "submittedAt">): WebsiteLead {
  return { ...lead, submittedAt: new Date().toISOString() };
}

function failureMessage(kind: "http" | "network"): string {
  const inbox = LEAD_INBOX_EMAIL;
  if (kind === "network") {
    return `We could not reach the message service. Please email ${inbox}.`;
  }
  return `We could not deliver your message just now. Please email ${inbox} or try again shortly.`;
}

async function submitViaWeb3Forms(lead: WebsiteLead, accessKey: string): Promise<LeadSubmitResult | null> {
  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
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
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;
    if (response.ok && body?.success) {
      return { ok: true, mode: "remote", lead };
    }
    return {
      ok: false,
      mode: "remote-error",
      lead,
      message: failureMessage("http"),
      inbox: LEAD_INBOX_EMAIL,
    };
  } catch {
    return null;
  }
}

async function submitViaLeadApi(lead: WebsiteLead): Promise<LeadSubmitResult> {
  const endpoint = readLeadEndpoint();
  try {
    const body = JSON.stringify({
      ...lead,
      company_website: lead.companyWebsite ?? "",
    });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body,
    });
    if (!response.ok) {
      let message = failureMessage("http");
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error?.trim()) message = payload.error.trim();
      } catch {
        // keep default
      }
      return {
        ok: false,
        mode: "remote-error",
        lead,
        message,
        inbox: LEAD_INBOX_EMAIL,
      };
    }
    return { ok: true, mode: "remote", lead };
  } catch {
    return {
      ok: false,
      mode: "remote-error",
      lead,
      message: failureMessage("network"),
      inbox: LEAD_INBOX_EMAIL,
    };
  }
}

/**
 * Submit a website lead (demo, trial, quote, partner, question).
 * Prefers Web3Forms in the browser (access key is public by design), then `/api/leads`.
 */
export async function submitWebsiteLead(
  leadInput: Omit<WebsiteLead, "submittedAt">,
): Promise<LeadSubmitResult> {
  const lead = buildLead(leadInput);
  if (lead.companyWebsite?.trim()) {
    return { ok: true, mode: "remote", lead };
  }
  const web3Key = readWeb3FormsKey();

  if (web3Key) {
    const web3 = await submitViaWeb3Forms(lead, web3Key);
    if (web3) return web3;
  }

  return submitViaLeadApi(lead);
}

/** @deprecated Use submitWebsiteLead — local-only save is not a successful delivery. */
export function saveWebsiteLead(lead: Omit<WebsiteLead, "submittedAt">): WebsiteLead {
  return buildLead(lead);
}
