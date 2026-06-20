import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { AdmissionInquiry, InquiryCategory } from "./types";

const storage = createBrowserAuthStorage();

function readAll(): AdmissionInquiry[] {
  try {
    const raw = storage.getItem(ADMISSIONS_STORAGE_KEYS.inquiries);
    if (!raw) return DEMO_INQUIRIES;
    return JSON.parse(raw) as AdmissionInquiry[];
  } catch {
    return DEMO_INQUIRIES;
  }
}

function writeAll(items: AdmissionInquiry[]) {
  storage.setItem(ADMISSIONS_STORAGE_KEYS.inquiries, JSON.stringify(items));
}

const DEMO_INQUIRIES: AdmissionInquiry[] = [
  {
    id: "INQ-001",
    applicantId: "ADM-DEMO-001",
    instituteId: "ins-lumenx-academy",
    category: "fees",
    subject: "Installment plan for Grade 9",
    message: "Can we pay the admission fee in two installments?",
    status: "answered",
    createdAt: "2026-05-20T10:00:00Z",
    updatedAt: "2026-05-21T14:00:00Z",
    responses: [
      {
        id: "r1",
        from: "Admissions Office",
        body: "Yes — two installments are available within 30 days of approval. Our counsellor will share the link.",
        at: "2026-05-21T14:00:00Z",
      },
    ],
  },
];

export function getInquiriesForUser(applicantId: string) {
  return readAll()
    .filter((i) => i.applicantId === applicantId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createInquiry(input: {
  applicantId: string;
  instituteId?: string;
  category: InquiryCategory;
  subject: string;
  message: string;
}): AdmissionInquiry {
  const all = readAll();
  const inquiry: AdmissionInquiry = {
    id: `INQ-${Date.now().toString().slice(-6)}`,
    applicantId: input.applicantId,
    instituteId: input.instituteId,
    category: input.category,
    subject: input.subject,
    message: input.message,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responses: [],
  };
  writeAll([inquiry, ...all]);
  return inquiry;
}
