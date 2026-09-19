const LEADS_KEY = "lumenx.website.leads.v1";

export type WebsiteLeadIntent = "trial" | "quote" | "partner" | "question" | "demo";

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
      mode: "unavailable" | "remote-error";
      lead: WebsiteLead;
      message: string;
    };

function readLeadEndpoint(): string | null {
  const value = import.meta.env.VITE_LEAD_ENDPOINT?.trim();
  return value ? value : null;
}

function buildLead(lead: Omit<WebsiteLead, "submittedAt">): WebsiteLead {
  return { ...lead, submittedAt: new Date().toISOString() };
}

/** Local draft only — never presented as a successful delivery to LumenX. */
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

/**
 * Submit a website lead.
 * - If `VITE_LEAD_ENDPOINT` is set, POST JSON and only treat HTTP 2xx as success.
 * - Otherwise return an honest failure — local draft is optional backup, not delivery.
 */
export async function submitWebsiteLead(
  leadInput: Omit<WebsiteLead, "submittedAt">,
): Promise<LeadSubmitResult> {
  const lead = buildLead(leadInput);
  const endpoint = readLeadEndpoint();

  if (!endpoint) {
    saveLocalDraft(lead);
    return {
      ok: false,
      mode: "unavailable",
      lead,
      message:
        "Online message delivery is not configured on this site yet. Your details were saved only in this browser as a draft — LumenX has not received them. Email official.lumenx@gmail.com or try again later.",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(lead),
    });
    if (!response.ok) {
      saveLocalDraft(lead);
      return {
        ok: false,
        mode: "remote-error",
        lead,
        message:
          "We could not deliver your message just now. A draft was kept in this browser only. Please email official.lumenx@gmail.com or try again shortly.",
      };
    }
    return { ok: true, mode: "remote", lead };
  } catch {
    saveLocalDraft(lead);
    return {
      ok: false,
      mode: "remote-error",
      lead,
      message:
        "We could not reach the message service. A draft was kept in this browser only — LumenX has not confirmed receipt. Please email official.lumenx@gmail.com.",
    };
  }
}

/** @deprecated Use submitWebsiteLead — local-only save is not a successful delivery. */
export function saveWebsiteLead(lead: Omit<WebsiteLead, "submittedAt">): WebsiteLead {
  const row = buildLead(lead);
  saveLocalDraft(row);
  return row;
}
