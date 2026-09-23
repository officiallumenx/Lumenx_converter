import {
  LEAD_INBOX_EMAIL,
  leadEmailText,
  leadSubject,
  type WebsiteLeadIntent,
} from "./lead-mail";

const LEADS_KEY = "lumenx.website.leads.v1";

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

function saveLocalDraft(lead: WebsiteLead): void {
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    const list: WebsiteLead[] = raw ? (JSON.parse(raw) as WebsiteLead[]) : [];
    list.unshift(lead);
    localStorage.setItem(LEADS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Storage may be blocked.
  }
}

function failureMessage(kind: "http" | "network"): string {
  const inbox = LEAD_INBOX_EMAIL;
  if (kind === "network") {
    return `We could not reach the message service. A draft was kept in this browser only — LumenX has not confirmed receipt. Please email ${inbox}.`;
  }
  return `We could not deliver your message just now. A draft was kept in this browser only. Please email ${inbox} or try again shortly.`;
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
    saveLocalDraft(lead);
    return {
      ok: false,
      mode: "remote-error",
      lead,
      message: body?.message?.trim() || failureMessage("http"),
      inbox: LEAD_INBOX_EMAIL,
    };
  } catch {
    return null;
  }
}

async function submitViaLeadApi(lead: WebsiteLead): Promise<LeadSubmitResult> {
  const endpoint = readLeadEndpoint();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(lead),
    });
    if (!response.ok) {
      saveLocalDraft(lead);
      let message = failureMessage("http");
      let needsActivation = false;
      try {
        const body = (await response.json()) as {
          error?: string;
          needsActivation?: boolean;
        };
        if (body.error?.trim()) message = body.error.trim();
        needsActivation = Boolean(body.needsActivation);
      } catch {
        // keep default
      }
      return {
        ok: false,
        mode: needsActivation ? "needs-activation" : "remote-error",
        lead,
        message,
        inbox: LEAD_INBOX_EMAIL,
      };
    }
    return { ok: true, mode: "remote", lead };
  } catch {
    saveLocalDraft(lead);
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
  const web3Key = readWeb3FormsKey();

  if (web3Key) {
    const web3 = await submitViaWeb3Forms(lead, web3Key);
    if (web3) return web3;
  }

  return submitViaLeadApi(lead);
}

/** @deprecated Use submitWebsiteLead — local-only save is not a successful delivery. */
export function saveWebsiteLead(lead: Omit<WebsiteLead, "submittedAt">): WebsiteLead {
  const row = buildLead(lead);
  saveLocalDraft(row);
  return row;
}
