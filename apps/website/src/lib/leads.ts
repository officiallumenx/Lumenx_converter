const LEADS_KEY = "lumenx.website.leads.v1";

export type WebsiteLeadIntent = "trial" | "quote" | "partner" | "question";

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

export function saveWebsiteLead(lead: Omit<WebsiteLead, "submittedAt">): WebsiteLead {
  const row: WebsiteLead = { ...lead, submittedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    const list: WebsiteLead[] = raw ? (JSON.parse(raw) as WebsiteLead[]) : [];
    list.unshift(row);
    localStorage.setItem(LEADS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Storage may be blocked; the in-page acknowledgement still stands.
  }
  return row;
}
