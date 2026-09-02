import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { ContactInquiry, ContactInquiryCategory, ContactInquiryResponse } from "./types";

const storage = createBrowserAuthStorage();

export const CONTACT_INQUIRY_CATEGORIES: { value: ContactInquiryCategory; label: string }[] = [
  { value: "applications", label: "Applications & status" },
  { value: "interviews", label: "Interviews & scheduling" },
  { value: "documents", label: "Documents & verification" },
  { value: "hiring_process", label: "Hiring process" },
  { value: "employment", label: "Employment policies" },
  { value: "benefits", label: "Benefits & compensation" },
  { value: "institute", label: "Institute questions" },
  { value: "portal", label: "Portal / technical" },
  { value: "general", label: "General" },
];

const DEMO_INQUIRIES: ContactInquiry[] = [
  {
    id: "CIQ-001",
    candidateId: "CAR-DEMO-001",
    name: "Priya Nair",
    email: "priya.candidate@example.com",
    category: "interviews",
    subject: "Reschedule demo class",
    message: "I need to reschedule my demo class to next week due to a prior commitment.",
    applicationId: "CAPP-2402",
    instituteId: "ins-delhi-riverside",
    instituteName: "Delhi Riverside School",
    jobTitle: "Sports Coach",
    createdAt: "2026-05-18T09:00:00Z",
    updatedAt: "2026-05-19T11:30:00Z",
    status: "answered",
    responses: [
      {
        id: "cr1",
        from: "Delhi Riverside HR",
        body: "Your demo class has been moved to Friday, 10:00 AM. You will receive a calendar invite shortly.",
        at: "2026-05-19T11:30:00Z",
      },
    ],
  },
];

function normalizeInquiry(
  raw: Partial<ContactInquiry> &
    Pick<ContactInquiry, "id" | "name" | "email" | "message" | "createdAt">,
): ContactInquiry {
  const createdAt = raw.createdAt;
  return {
    id: raw.id,
    candidateId: raw.candidateId,
    name: raw.name,
    email: raw.email,
    category: raw.category ?? "general",
    subject: raw.subject ?? raw.message.slice(0, 60),
    message: raw.message,
    applicationId: raw.applicationId,
    instituteId: raw.instituteId,
    instituteName: raw.instituteName,
    jobTitle: raw.jobTitle,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
    status: (raw.status as string) === "responded" ? "answered" : (raw.status ?? "open"),
    responses: raw.responses ?? [],
  };
}

function readAll(): ContactInquiry[] {
  try {
    const raw = storage.getItem(CAREERS_STORAGE_KEYS.contactInquiries);
    if (!raw) return DEMO_INQUIRIES;
    const parsed = JSON.parse(raw) as Array<
      Partial<ContactInquiry> &
        Pick<ContactInquiry, "id" | "name" | "email" | "message" | "createdAt">
    >;
    return parsed.map(normalizeInquiry);
  } catch {
    return DEMO_INQUIRIES;
  }
}

function writeAll(items: ContactInquiry[]) {
  storage.setItem(CAREERS_STORAGE_KEYS.contactInquiries, JSON.stringify(items));
}

export function getContactInquiriesForUser(candidateId: string): ContactInquiry[] {
  return readAll()
    .filter((i) => i.candidateId === candidateId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getContactInquiriesForEmail(email: string): ContactInquiry[] {
  const normalized = email.trim().toLowerCase();
  return readAll()
    .filter((i) => i.email.trim().toLowerCase() === normalized)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getAllContactInquiries(): ContactInquiry[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getContactInquiryById(id: string): ContactInquiry | undefined {
  return readAll().find((i) => i.id === id);
}

function routingLabel(input: {
  applicationId?: string;
  instituteId?: string;
  instituteName?: string;
  category: ContactInquiryCategory;
}): string {
  if (input.applicationId && input.instituteName) {
    return `${input.instituteName} hiring team`;
  }
  if (input.instituteId && input.instituteName) {
    return `${input.instituteName} careers desk`;
  }
  if (input.category === "portal") return "LumenX platform support";
  return "LumenX Careers desk";
}

function maybeDemoReply(inquiry: ContactInquiry): ContactInquiryResponse | null {
  if (inquiry.applicationId || inquiry.instituteId) return null;
  if (inquiry.category !== "portal" && inquiry.category !== "general") return null;
  return {
    id: `cr-${Date.now()}`,
    from: "LumenX Careers Desk",
    body: "Thank you for reaching out. A careers specialist will review your message and respond within 2 business days.",
    at: new Date().toISOString(),
  };
}

export function createContactInquiry(input: {
  name: string;
  email: string;
  category: ContactInquiryCategory;
  subject: string;
  message: string;
  candidateId?: string;
  applicationId?: string;
  instituteId?: string;
  instituteName?: string;
  jobTitle?: string;
}): ContactInquiry {
  const all = readAll();
  const at = new Date().toISOString();
  const inquiry: ContactInquiry = {
    id: `CIQ-${Date.now().toString().slice(-6)}`,
    candidateId: input.candidateId,
    name: input.name.trim(),
    email: input.email.trim(),
    category: input.category,
    subject: input.subject.trim(),
    message: input.message.trim(),
    applicationId: input.applicationId,
    instituteId: input.instituteId,
    instituteName: input.instituteName,
    jobTitle: input.jobTitle,
    createdAt: at,
    updatedAt: at,
    status: "open",
    responses: [],
  };

  const demoReply = maybeDemoReply(inquiry);
  if (demoReply) {
    inquiry.responses = [demoReply];
    inquiry.status = "answered";
    inquiry.updatedAt = demoReply.at;
  }

  writeAll([inquiry, ...all]);
  return inquiry;
}

export function getInquiryRoutingLabel(inquiry: ContactInquiry): string {
  return routingLabel(inquiry);
}

export function addContactInquiryResponse(
  inquiryId: string,
  body: string,
  from = "LumenX Careers Desk",
): ContactInquiry | null {
  const all = readAll();
  const idx = all.findIndex((i) => i.id === inquiryId);
  if (idx < 0) return null;

  const at = new Date().toISOString();
  const response: ContactInquiryResponse = { id: `cr-${Date.now()}`, from, body: body.trim(), at };
  const updated: ContactInquiry = {
    ...all[idx]!,
    responses: [...all[idx]!.responses, response],
    status: "answered",
    updatedAt: at,
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function closeContactInquiry(inquiryId: string): boolean {
  const all = readAll();
  const idx = all.findIndex((i) => i.id === inquiryId);
  if (idx < 0) return false;
  all[idx] = { ...all[idx]!, status: "closed", updatedAt: new Date().toISOString() };
  writeAll(all);
  return true;
}

/** @deprecated Use createContactInquiry from contact-inquiries-store */
export function submitContactInquiry(input: {
  name: string;
  email: string;
  message: string;
  candidateId?: string;
  category?: ContactInquiryCategory;
  subject?: string;
  applicationId?: string;
  instituteId?: string;
  instituteName?: string;
  jobTitle?: string;
}) {
  createContactInquiry({
    name: input.name,
    email: input.email,
    category: input.category ?? "general",
    subject: input.subject ?? input.message.slice(0, 80),
    message: input.message,
    candidateId: input.candidateId,
    applicationId: input.applicationId,
    instituteId: input.instituteId,
    instituteName: input.instituteName,
    jobTitle: input.jobTitle,
  });
  return true;
}
