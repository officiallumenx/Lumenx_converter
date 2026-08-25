/** Admin read/write for Connect careers contact inquiries (shared localStorage). */

import type { ContactInquiryStatus } from "@lumenx/types";

const CONTACT_INQUIRIES_KEY = "ues_careers_contact_inquiries";

export type AdminContactInquiryStatus = ContactInquiryStatus;

export interface AdminContactInquiry {
  id: string;
  candidateId?: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  applicationId?: string;
  instituteId?: string;
  instituteName?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
  status: AdminContactInquiryStatus;
  responses: { id: string; from: string; body: string; at: string }[];
}

function readAll(): AdminContactInquiry[] {
  try {
    const raw = localStorage.getItem(CONTACT_INQUIRIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdminContactInquiry[];
  } catch {
    return [];
  }
}

function writeAll(items: AdminContactInquiry[]) {
  localStorage.setItem(CONTACT_INQUIRIES_KEY, JSON.stringify(items));
}

export function readAdminContactInquiries(): AdminContactInquiry[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function respondToContactInquiry(
  inquiryId: string,
  body: string,
  from = "LumenX Careers Desk",
): boolean {
  const all = readAll();
  const idx = all.findIndex((i) => i.id === inquiryId);
  if (idx < 0) return false;

  const at = new Date().toISOString();
  const inquiry = all[idx]!;
  inquiry.responses = [
    ...inquiry.responses,
    { id: `cr-${Date.now()}`, from, body: body.trim(), at },
  ];
  inquiry.status = "answered";
  inquiry.updatedAt = at;
  all[idx] = inquiry;
  writeAll(all);
  return true;
}

export function closeAdminContactInquiry(inquiryId: string): boolean {
  const all = readAll();
  const idx = all.findIndex((i) => i.id === inquiryId);
  if (idx < 0) return false;
  all[idx] = { ...all[idx]!, status: "closed", updatedAt: new Date().toISOString() };
  writeAll(all);
  return true;
}
