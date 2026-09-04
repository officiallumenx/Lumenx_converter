/** Full admission application details for Admin — mirrors Connect apply wizard fields. */

import type { AdminPortalDocStatus } from "@lumenx/types";

export type AdminDocStatus = AdminPortalDocStatus;

export type AdminAdmissionDocument = {
  id: string;
  type: string;
  label: string;
  fileName: string;
  kind: "pdf" | "image";
  status: AdminDocStatus;
  uploadedAt: string;
  note?: string;
  /** Student name printed on the document preview. */
  applicantName: string;
  /** Application number on the document. */
  applicationId: string;
  /** Extra lines shown on the certificate sheet. */
  previewLines?: string[];
  /** Image preview only (student photo). */
  previewImageUrl?: string;
};

export type AdminAdmissionDetail = {
  id: string;
  programName: string;
  academicYear: string;
  /** Grade applying for (required on program step). */
  grade: string;
  student: {
    name: string;
    gender: string;
    dateOfBirth: string;
    nationality: string;
    bloodGroup: string;
  };
  parent: {
    fatherName: string;
    motherName: string;
    guardianName: string;
    mobile: string;
    email: string;
    occupation: string;
  };
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  academic: {
    currentSchool: string;
    currentGrade: string;
    previousResults: string;
    performance: string;
  };
  documents: AdminAdmissionDocument[];
  timeline: { label: string; at: string }[];
  adminNotes?: string[];
};

function mockPhotoDataUrl(name: string, initials: string): string {
  const safeName = name.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400">
    <rect width="320" height="400" fill="#e8eef7"/>
    <circle cx="160" cy="140" r="64" fill="#64748b"/>
    <rect x="80" y="220" width="160" height="120" rx="80" fill="#64748b"/>
    <text x="160" y="360" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#0f172a">${safeName}</text>
    <text x="160" y="382" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748b">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function fullDocs(
  appId: string,
  studentName: string,
  initials: string,
  extra?: { dob?: string; father?: string; school?: string },
): AdminAdmissionDocument[] {
  const common = { applicantName: studentName, applicationId: appId };
  return [
    {
      id: `${appId}-bc`,
      type: "birth_certificate",
      label: "Birth Certificate",
      fileName: `${studentName.replace(/\s+/g, "_")}_birth_certificate.pdf`,
      kind: "pdf",
      status: "verified",
      uploadedAt: "2026-05-20",
      ...common,
      previewLines: [
        `This is to certify that ${studentName}`,
        extra?.dob ? `was born on ${extra.dob}.` : "date of birth as per records.",
        "Issued for school admission purposes.",
      ],
    },
    {
      id: `${appId}-tc`,
      type: "transfer_certificate",
      label: "Transfer Certificate",
      fileName: `${studentName.replace(/\s+/g, "_")}_TC.pdf`,
      kind: "pdf",
      status: "under_review",
      uploadedAt: "2026-05-21",
      ...common,
      previewLines: [
        `Student: ${studentName}`,
        extra?.school ? `Leaving school: ${extra.school}` : "Leaving school on record.",
        "Conduct: Good. Eligible for admission elsewhere.",
      ],
    },
    {
      id: `${appId}-mm`,
      type: "marks_memo",
      label: "Previous Marks Memo",
      fileName: `${studentName.replace(/\s+/g, "_")}_marks.pdf`,
      kind: "pdf",
      status: "verified",
      uploadedAt: "2026-05-20",
      ...common,
      previewLines: [
        `Candidate: ${studentName}`,
        "Subject-wise marks as submitted with the application.",
        "Document uploaded as PDF in Connect admissions.",
      ],
    },
    {
      id: `${appId}-photo`,
      type: "student_photo",
      label: "Student Photo",
      fileName: `${studentName.replace(/\s+/g, "_")}_photo.jpg`,
      kind: "image",
      status: "verified",
      uploadedAt: "2026-05-19",
      ...common,
      previewImageUrl: mockPhotoDataUrl(studentName, initials),
    },
    {
      id: `${appId}-pid`,
      type: "parent_id",
      label: "Parent ID",
      fileName: `${studentName.replace(/\s+/g, "_")}_parent_id.pdf`,
      kind: "pdf",
      status: "resubmission_required",
      uploadedAt: "2026-05-21",
      note: "Scan unclear — please re-upload a clearer PDF.",
      ...common,
      previewLines: [
        `Linked student: ${studentName}`,
        extra?.father ? `Parent / guardian: ${extra.father}` : "Parent ID proof",
        "Government ID uploaded as PDF (demo).",
      ],
    },
    {
      id: `${appId}-add`,
      type: "additional",
      label: "Additional Documents",
      fileName: `${studentName.replace(/\s+/g, "_")}_address_proof.pdf`,
      kind: "pdf",
      status: "uploaded",
      uploadedAt: "2026-05-22",
      ...common,
      previewLines: [
        `Applicant: ${studentName}`,
        `Application: ${appId}`,
        "Address / supporting proof PDF.",
      ],
    },
  ];
}

function detail(
  partial: Omit<AdminAdmissionDetail, "documents" | "timeline" | "grade"> & {
    grade?: string;
    documents?: AdminAdmissionDocument[];
    timeline?: AdminAdmissionDetail["timeline"];
    initials: string;
  },
): AdminAdmissionDetail {
  const grade = partial.grade ?? partial.academic.currentGrade;
  return {
    ...partial,
    grade,
    documents:
      partial.documents ??
      fullDocs(partial.id, partial.student.name, partial.initials, {
        dob: partial.student.dateOfBirth,
        father: partial.parent.fatherName,
        school: partial.academic.currentSchool,
      }),
    timeline: partial.timeline ?? [
      { label: "Application submitted", at: "2026-05-22T14:30:00Z" },
      { label: "Documents uploaded (PDF)", at: "2026-05-25T11:00:00Z" },
      { label: "Under admissions review", at: "2026-05-28T09:00:00Z" },
    ],
  };
}

/** Mock full dossiers keyed by admission application number. */
export const ADMIN_ADMISSION_DETAILS: Record<string, AdminAdmissionDetail> = {
  "APP-2401": detail({
    id: "APP-2401",
    initials: "VM",
    programName: "High School",
    academicYear: "2026–27",
    grade: "Grade 9",
    student: {
      name: "Vihaan Mehta",
      gender: "Male",
      dateOfBirth: "2011-08-15",
      nationality: "Indian",
      bloodGroup: "B+",
    },
    parent: {
      fatherName: "Sanjay Mehta",
      motherName: "Neha Mehta",
      guardianName: "Sanjay Mehta",
      mobile: "+91 98765 41001",
      email: "neha.mehta@example.com",
      occupation: "Business",
    },
    address: {
      address: "22 Palm Grove, Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500033",
    },
    academic: {
      currentSchool: "Test1School",
      currentGrade: "Grade 8",
      previousResults: "Grade 7 — 91%",
      performance: "Strong in Science and English",
    },
    adminNotes: ["All mandatory fields complete. Parent ID needs clearer PDF."],
  }),
  "APP-2400": detail({
    id: "APP-2400",
    initials: "RK",
    programName: "High School",
    academicYear: "2026–27",
    grade: "Grade 10",
    student: {
      name: "Riya Kapoor",
      gender: "Female",
      dateOfBirth: "2010-11-02",
      nationality: "Indian",
      bloodGroup: "A+",
    },
    parent: {
      fatherName: "Vikram Kapoor",
      motherName: "Anjali Kapoor",
      guardianName: "Anjali Kapoor",
      mobile: "+91 98765 41002",
      email: "anjali.kapoor@example.com",
      occupation: "Doctor",
    },
    address: {
      address: "8 Lake Road, Banjara Hills",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500034",
    },
    academic: {
      currentSchool: "Chirec International",
      currentGrade: "Grade 9",
      previousResults: "Grade 8 — 94%",
      performance: "Consistent top performer",
    },
  }),
  "APP-2398": detail({
    id: "APP-2398",
    initials: "AI",
    programName: "Intermediate",
    academicYear: "2026–27",
    grade: "Grade 11",
    student: {
      name: "Ananya Iyer",
      gender: "Female",
      dateOfBirth: "2009-03-22",
      nationality: "Indian",
      bloodGroup: "O+",
    },
    parent: {
      fatherName: "Karthik Iyer",
      motherName: "Meera Iyer",
      guardianName: "Karthik Iyer",
      mobile: "+91 98765 41003",
      email: "meera.iyer@example.com",
      occupation: "Chartered Accountant",
    },
    address: {
      address: "45 Lake View Apartments",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500034",
    },
    academic: {
      currentSchool: "Meridian School",
      currentGrade: "Grade 10",
      previousResults: "Board — 96%",
      performance: "Excellent academics; awaiting parent confirmation",
    },
    timeline: [
      { label: "Application submitted", at: "2026-05-15T11:00:00Z" },
      { label: "Documents verified", at: "2026-05-20T10:00:00Z" },
      { label: "Awaiting parent confirmation", at: "2026-05-27T16:00:00Z" },
    ],
  }),
  "APP-2396": detail({
    id: "APP-2396",
    initials: "AS",
    programName: "High School",
    academicYear: "2026–27",
    grade: "Grade 9",
    student: {
      name: "Aaditya Soni",
      gender: "Male",
      dateOfBirth: "2011-01-09",
      nationality: "Indian",
      bloodGroup: "AB+",
    },
    parent: {
      fatherName: "Rahul Soni",
      motherName: "Pooja Soni",
      guardianName: "Rahul Soni",
      mobile: "+91 98765 41004",
      email: "pooja.soni@example.com",
      occupation: "Architect",
    },
    address: {
      address: "3 Lotus Colony",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500016",
    },
    academic: {
      currentSchool: "Johnson Grammar",
      currentGrade: "Grade 8",
      previousResults: "Grade 7 — 85%",
      performance: "Good overall; needs support in languages",
    },
  }),
  "APP-2395": detail({
    id: "APP-2395",
    initials: "RD",
    programName: "High School",
    academicYear: "2026–27",
    grade: "Grade 10",
    student: {
      name: "Rohan Das",
      gender: "Male",
      dateOfBirth: "2010-06-18",
      nationality: "Indian",
      bloodGroup: "B-",
    },
    parent: {
      fatherName: "Amit Das",
      motherName: "Shreya Das",
      guardianName: "Amit Das",
      mobile: "+91 98765 41005",
      email: "shreya.das@example.com",
      occupation: "Bank Manager",
    },
    address: {
      address: "19 MG Road",
      city: "Secunderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500003",
    },
    academic: {
      currentSchool: "St. Ann's",
      currentGrade: "Grade 9",
      previousResults: "Grade 8 — 82%",
      performance: "Documents under verification",
    },
  }),
  "APP-2390": detail({
    id: "APP-2390",
    initials: "MS",
    programName: "High School",
    academicYear: "2026–27",
    grade: "Grade 9",
    student: {
      name: "Meera Singh",
      gender: "Female",
      dateOfBirth: "2011-12-01",
      nationality: "Indian",
      bloodGroup: "O-",
    },
    parent: {
      fatherName: "Harpreet Singh",
      motherName: "Gurpreet Singh",
      guardianName: "Harpreet Singh",
      mobile: "+91 98765 41006",
      email: "gurpreet.singh@example.com",
      occupation: "Entrepreneur",
    },
    address: {
      address: "7 Rosewood Residency",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500081",
    },
    academic: {
      currentSchool: "Nasr School",
      currentGrade: "Grade 8",
      previousResults: "Grade 7 — 90%",
      performance: "Approved — ready to convert",
    },
    adminNotes: ["All mandatory fields and PDFs complete."],
  }),
  "APP-2389": detail({
    id: "APP-2389",
    initials: "AN",
    programName: "Intermediate",
    academicYear: "2026–27",
    grade: "Grade 11",
    student: {
      name: "Arjun Nair",
      gender: "Male",
      dateOfBirth: "2009-09-30",
      nationality: "Indian",
      bloodGroup: "A-",
    },
    parent: {
      fatherName: "Suresh Nair",
      motherName: "Lakshmi Nair",
      guardianName: "Suresh Nair",
      mobile: "+91 98765 41007",
      email: "lakshmi.nair@example.com",
      occupation: "Professor",
    },
    address: {
      address: "101 University Road",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500007",
    },
    academic: {
      currentSchool: "Kendriya Vidyalaya",
      currentGrade: "Grade 10",
      previousResults: "Board — 93%",
      performance: "Approved",
    },
  }),
  "APP-2388": detail({
    id: "APP-2388",
    initials: "KS",
    programName: "Intermediate",
    academicYear: "2026–27",
    grade: "Grade 12",
    student: {
      name: "Kabir Shah",
      gender: "Male",
      dateOfBirth: "2008-04-14",
      nationality: "Indian",
      bloodGroup: "B+",
    },
    parent: {
      fatherName: "Imran Shah",
      motherName: "Fatima Shah",
      guardianName: "Imran Shah",
      mobile: "+91 98765 41008",
      email: "fatima.shah@example.com",
      occupation: "Consultant",
    },
    address: {
      address: "56 Pearl Heights",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500082",
    },
    academic: {
      currentSchool: "Gitanjali School",
      currentGrade: "Grade 11",
      previousResults: "Grade 10 — 87%",
      performance: "On waiting list for seat",
    },
    adminNotes: ["Waitlisted — seat may open after first-round confirmations."],
  }),
};

export function getAdminAdmissionDetail(appId: string): AdminAdmissionDetail | null {
  return ADMIN_ADMISSION_DETAILS[appId] ?? null;
}

export function docStatusTone(
  status: AdminDocStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "verified") return "success";
  if (status === "under_review" || status === "uploaded") return "info";
  if (status === "resubmission_required" || status === "rejected") return "danger";
  return "neutral";
}

export function docStatusLabel(status: AdminDocStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "under_review":
      return "Under review";
    case "uploaded":
      return "Uploaded";
    case "resubmission_required":
      return "Resubmit";
    case "rejected":
      return "Rejected";
    default:
      return "Not uploaded";
  }
}
