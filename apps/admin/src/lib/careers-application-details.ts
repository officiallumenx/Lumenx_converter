/** Full career application details for Admin — mirrors Connect careers apply fields. */

import type { AdminPortalDocStatus } from "@lumenx/types";

export type CareerDocStatus = AdminPortalDocStatus;

export type AdminCareerDocument = {
  id: string;
  type: string;
  label: string;
  fileName: string;
  kind: "pdf" | "image";
  status: CareerDocStatus;
  uploadedAt: string;
  note?: string;
  applicantName: string;
  applicationId: string;
  previewLines?: string[];
  previewImageUrl?: string;
};

export type AdminCareerDetail = {
  id: string;
  jobTitle: string;
  instituteName: string;
  personal: {
    name: string;
    gender: string;
    dateOfBirth: string;
    mobile: string;
    email: string;
  };
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  professional: {
    highestQualification: string;
    experienceYears: string;
    currentEmployer: string;
    currentRole: string;
    expectedSalary: string;
    noticePeriod: string;
  };
  skills: {
    teachingSubjects: string;
    technicalSkills: string;
    languagesKnown: string;
  };
  documents: AdminCareerDocument[];
  timeline: { label: string; at: string }[];
  adminNotes?: string[];
};

export function docStatusLabel(status: CareerDocStatus): string {
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
    case "not_uploaded":
      return "Missing";
    default:
      return status;
  }
}

export function docStatusTone(
  status: CareerDocStatus,
): "success" | "warning" | "info" | "danger" | "neutral" {
  if (status === "verified") return "success";
  if (status === "rejected" || status === "resubmission_required") return "danger";
  if (status === "under_review") return "warning";
  if (status === "not_uploaded") return "neutral";
  return "info";
}

function mockPhotoDataUrl(name: string, initials: string): string {
  const safeName = name.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400">
    <rect width="320" height="400" fill="#eef2f7"/>
    <circle cx="160" cy="140" r="64" fill="#64748b"/>
    <rect x="80" y="220" width="160" height="120" rx="80" fill="#64748b"/>
    <text x="160" y="360" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#0f172a">${safeName}</text>
    <text x="160" y="382" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748b">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function fullDocs(
  appId: string,
  applicantName: string,
  initials: string,
): AdminCareerDocument[] {
  const common = { applicantName, applicationId: appId };
  return [
    {
      id: `${appId}-resume`,
      type: "resume",
      label: "Resume / CV",
      fileName: `${applicantName.replace(/\s+/g, "_")}_resume.pdf`,
      kind: "pdf",
      status: "verified",
      uploadedAt: "2026-05-20",
      ...common,
      previewLines: [
        `Applicant: ${applicantName}`,
        `Application: ${appId}`,
        "Curriculum vitae uploaded via Connect Careers.",
      ],
    },
    {
      id: `${appId}-cert`,
      type: "certificates",
      label: "Certificates",
      fileName: `${applicantName.replace(/\s+/g, "_")}_certificates.pdf`,
      kind: "pdf",
      status: "verified",
      uploadedAt: "2026-05-20",
      ...common,
      previewLines: [`Qualification certificates for ${applicantName}`],
    },
    {
      id: `${appId}-exp`,
      type: "experience_letters",
      label: "Experience letters",
      fileName: `${applicantName.replace(/\s+/g, "_")}_experience.pdf`,
      kind: "pdf",
      status: "under_review",
      uploadedAt: "2026-05-21",
      ...common,
      previewLines: ["Prior employment verification letters."],
    },
    {
      id: `${appId}-id`,
      type: "identity_proof",
      label: "Identity proof",
      fileName: `${applicantName.replace(/\s+/g, "_")}_id.pdf`,
      kind: "pdf",
      status: "uploaded",
      uploadedAt: "2026-05-21",
      ...common,
      previewLines: ["Government ID proof (demo PDF)."],
    },
    {
      id: `${appId}-photo`,
      type: "profile_photo",
      label: "Profile photo",
      fileName: `${applicantName.replace(/\s+/g, "_")}_photo.jpg`,
      kind: "image",
      status: "verified",
      uploadedAt: "2026-05-19",
      ...common,
      previewImageUrl: mockPhotoDataUrl(applicantName, initials),
    },
  ];
}

function detail(
  partial: Omit<AdminCareerDetail, "documents" | "timeline"> & {
    documents?: AdminCareerDocument[];
    timeline?: AdminCareerDetail["timeline"];
    initials: string;
  },
): AdminCareerDetail {
  const { initials, ...rest } = partial;
  return {
    ...rest,
    documents:
      partial.documents ?? fullDocs(partial.id, partial.personal.name, initials),
    timeline: partial.timeline ?? [
      { label: "Application submitted", at: "2026-05-22T14:30:00Z" },
      { label: "Documents uploaded", at: "2026-05-25T11:00:00Z" },
      { label: "Under HR review", at: "2026-05-28T09:00:00Z" },
    ],
  };
}

export const ADMIN_CAREER_DETAILS: Record<string, AdminCareerDetail> = {
  "CAN-881": detail({
    id: "CAN-881",
    initials: "MR",
    jobTitle: "Physics Teacher",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Dr. Maya Robinson",
      gender: "Female",
      dateOfBirth: "1988-04-12",
      mobile: "+91 98765 88001",
      email: "maya.robinson@example.com",
    },
    address: {
      address: "14 Science Colony",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500033",
    },
    professional: {
      highestQualification: "Ph.D Physics",
      experienceYears: "8",
      currentEmployer: "Oakridge International",
      currentRole: "Senior Physics Faculty",
      expectedSalary: "₹85,000 / month",
      noticePeriod: "60 days",
    },
    skills: {
      teachingSubjects: "Physics, Applied Mathematics",
      technicalSkills: "Lab setup, CBSE / IB curriculum",
      languagesKnown: "English, Hindi, Telugu",
    },
    adminNotes: ["Strong demo class feedback. ID proof pending clearer scan."],
  }),
  "CAN-879": detail({
    id: "CAN-879",
    initials: "LO",
    jobTitle: "Lab Assistant",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Liang Ortega",
      gender: "Male",
      dateOfBirth: "1995-09-03",
      mobile: "+91 98765 88002",
      email: "liang.ortega@example.com",
    },
    address: {
      address: "9 Lab Road",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500034",
    },
    professional: {
      highestQualification: "B.Sc Chemistry",
      experienceYears: "3",
      currentEmployer: "City College Labs",
      currentRole: "Lab Technician",
      expectedSalary: "₹32,000 / month",
      noticePeriod: "30 days",
    },
    skills: {
      teachingSubjects: "Chemistry lab support",
      technicalSkills: "Safety protocols, inventory",
      languagesKnown: "English, Hindi",
    },
  }),
  "CAN-878": detail({
    id: "CAN-878",
    initials: "RV",
    jobTitle: "Physics Teacher",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Rahul Verma",
      gender: "Male",
      dateOfBirth: "1990-01-22",
      mobile: "+91 98765 88003",
      email: "rahul.verma@example.com",
    },
    address: {
      address: "55 Lake View",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500081",
    },
    professional: {
      highestQualification: "M.Sc Physics · B.Ed",
      experienceYears: "6",
      currentEmployer: "Meridian School",
      currentRole: "Physics Teacher",
      expectedSalary: "₹70,000 / month",
      noticePeriod: "45 days",
    },
    skills: {
      teachingSubjects: "Physics",
      technicalSkills: "Board exam coaching",
      languagesKnown: "English, Hindi",
    },
  }),
  "CAN-876": detail({
    id: "CAN-876",
    initials: "SG",
    jobTitle: "Sports Coach",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Sneha Gupta",
      gender: "Female",
      dateOfBirth: "1992-07-18",
      mobile: "+91 98765 88004",
      email: "sneha.gupta@example.com",
    },
    address: {
      address: "2 Stadium Road",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500004",
    },
    professional: {
      highestQualification: "B.P.Ed",
      experienceYears: "5",
      currentEmployer: "City Sports Academy",
      currentRole: "Athletics Coach",
      expectedSalary: "₹45,000 / month",
      noticePeriod: "30 days",
    },
    skills: {
      teachingSubjects: "Physical Education",
      technicalSkills: "Athletics, team sports",
      languagesKnown: "English, Hindi",
    },
  }),
  "CAN-875": detail({
    id: "CAN-875",
    initials: "PN",
    jobTitle: "English Faculty",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Priya Nair",
      gender: "Female",
      dateOfBirth: "1989-11-05",
      mobile: "+91 98765 88005",
      email: "priya.nair@example.com",
    },
    address: {
      address: "88 Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500033",
    },
    professional: {
      highestQualification: "M.A English · B.Ed",
      experienceYears: "7",
      currentEmployer: "St. Xavier Junior College",
      currentRole: "English Faculty",
      expectedSalary: "₹65,000 / month",
      noticePeriod: "60 days",
    },
    skills: {
      teachingSubjects: "English, Literature",
      technicalSkills: "IELTS coaching, content writing",
      languagesKnown: "English, Malayalam, Hindi",
    },
  }),
  "CAN-874": detail({
    id: "CAN-874",
    initials: "AM",
    jobTitle: "Mathematics Teacher",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Arjun Mehta",
      gender: "Male",
      dateOfBirth: "1987-03-14",
      mobile: "+91 98765 88006",
      email: "arjun.mehta@example.com",
    },
    address: {
      address: "12 Green Park",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500034",
    },
    professional: {
      highestQualification: "M.Sc Mathematics · B.Ed",
      experienceYears: "9",
      currentEmployer: "Delhi Public School",
      currentRole: "Senior Math Teacher",
      expectedSalary: "₹75,000 / month",
      noticePeriod: "90 days",
    },
    skills: {
      teachingSubjects: "Mathematics, Algebra",
      technicalSkills: "Olympiad coaching",
      languagesKnown: "English, Hindi, Gujarati",
    },
  }),
  "CAN-873": detail({
    id: "CAN-873",
    initials: "FK",
    jobTitle: "Front Office Executive",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Fatima Khan",
      gender: "Female",
      dateOfBirth: "1994-06-30",
      mobile: "+91 98765 88007",
      email: "fatima.khan@example.com",
    },
    address: {
      address: "3 Admin Block Lane",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500001",
    },
    professional: {
      highestQualification: "B.Com",
      experienceYears: "4",
      currentEmployer: "City Hospital Front Desk",
      currentRole: "Receptionist",
      expectedSalary: "₹28,000 / month",
      noticePeriod: "15 days",
    },
    skills: {
      teachingSubjects: "—",
      technicalSkills: "MS Office, CRM",
      languagesKnown: "English, Hindi, Urdu",
    },
  }),
  "CAN-872": detail({
    id: "CAN-872",
    initials: "VS",
    jobTitle: "Chemistry Teacher",
    instituteName: "LumenX Demo Institute",
    personal: {
      name: "Vikram Shah",
      gender: "Male",
      dateOfBirth: "1991-12-08",
      mobile: "+91 98765 88008",
      email: "vikram.shah@example.com",
    },
    address: {
      address: "41 Crescent Lane",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500082",
    },
    professional: {
      highestQualification: "M.Sc Chemistry · B.Ed",
      experienceYears: "5",
      currentEmployer: "Chirec International",
      currentRole: "Chemistry Teacher",
      expectedSalary: "₹60,000 / month",
      noticePeriod: "45 days",
    },
    skills: {
      teachingSubjects: "Chemistry",
      technicalSkills: "Lab safety, NEET foundation",
      languagesKnown: "English, Hindi",
    },
  }),
};

export function getAdminCareerDetail(appId: string): AdminCareerDetail | null {
  return ADMIN_CAREER_DETAILS[appId] ?? null;
}
