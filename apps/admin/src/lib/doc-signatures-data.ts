// ─── Types ────────────────────────────────────────────────────────────────────

export type SignatoryRole =
  | "principal"
  | "vice_principal"
  | "coordinator"
  | "admissions_officer"
  | "custom";

export type SignatoryStatus = "active" | "inactive";

/** Which templates this signatory is assigned to */
export type SignatoryTemplateAssignment = {
  templateId: string;
  templateName: string;
  documentKind: "certificate" | "report" | "document" | "id_card";
  assignedOn: string;
  position: "left" | "right" | "center";
};

/**
 * Future digital signature readiness.
 * No implementation yet — only the schema is prepared.
 */
export type DigitalSignatureConfig = {
  enabled: false; // always false for now
  provider: "docusign" | "aadhaar" | "emudhra" | "dsc" | null;
  certificateSerial: string | null;
  certValidUntil: string | null;
  setupGuideUrl: string | null;
};

export type Signatory = {
  id: string;
  name: string;
  designation: string;
  role: SignatoryRole;
  department: string;
  email: string;
  phone: string;

  status: SignatoryStatus;
  isDefault: boolean;

  /** Base64 / data-URL of the uploaded signature image. null = not uploaded. */
  signatureImageUrl: string | null;
  signatureImageUploadedOn: string | null;
  signatureImageNote: string;

  /** Templates this signatory is assigned to */
  assignedTemplates: SignatoryTemplateAssignment[];

  /** Architecture hook for future digital signature */
  digitalSignature: DigitalSignatureConfig;

  addedOn: string;
  lastUsedOn: string | null;
  totalDocumentsSigned: number;
};

// ─── SVG signature samples (data URLs) ───────────────────────────────────────
// Unique hand-drawn style SVG paths as demo signatures.

const makeSig = (path: string, w = 240, h = 70) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="${path}" stroke="#0f172a" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>` +
    `</svg>`,
  )}`;

const SIG_RAMESH = makeSig(
  "M20,50 C30,20 50,15 70,35 C85,50 100,55 120,45 C140,35 155,20 170,30 C182,38 190,50 200,48 C210,46 218,42 225,38",
);

const SIG_PRIYA = makeSig(
  "M15,45 C25,25 40,18 55,28 C70,38 75,50 90,42 C105,34 108,22 120,30 C132,38 138,55 152,48 C166,41 175,30 185,32 C195,34 205,42 215,40",
);

const SIG_VIKRAM = makeSig(
  "M20,55 L35,20 L50,50 C60,65 65,55 75,40 C85,25 95,18 110,28 C120,35 118,52 130,45 C142,38 155,25 165,30 C175,35 180,48 192,44 L210,38",
);

const SIG_SUNITA = makeSig(
  "M18,40 C30,15 48,12 60,30 C72,48 78,52 92,44 C106,36 112,22 125,28 C138,34 142,50 155,46 C168,42 175,30 188,32 C198,34 208,44 220,42",
);

const SIG_AJAY = makeSig(
  "M15,50 C28,22 44,16 58,34 C72,52 80,58 96,48 C112,38 118,22 130,28 C142,34 148,52 162,46 C176,40 183,26 195,30 C205,34 212,46 222,44",
);

// ─── Demo data ────────────────────────────────────────────────────────────────

export const SIGNATORIES_V2: Signatory[] = [
  {
    id: "SIG-001",
    name: "Dr. Ramesh Kumar",
    designation: "Principal",
    role: "principal",
    department: "Administration",
    email: "principal@lumenxschool.edu",
    phone: "+91 98765 43210",
    status: "active",
    isDefault: true,
    signatureImageUrl: SIG_RAMESH,
    signatureImageUploadedOn: "2024-07-01",
    signatureImageNote: "Scanned from official letterhead",
    assignedTemplates: [
      { templateId: "tpl-sys-bonafide", templateName: "Bonafide Certificate — Ornate", documentKind: "certificate", assignedOn: "2024-07-01", position: "left" },
      { templateId: "tpl-sys-conduct", templateName: "Conduct Certificate", documentKind: "certificate", assignedOn: "2024-07-01", position: "left" },
      { templateId: "tpl-sys-achievement", templateName: "Certificate of Achievement — Elegant", documentKind: "certificate", assignedOn: "2024-07-01", position: "left" },
      { templateId: "tpl-sys-transfer", templateName: "Transfer Certificate — Board Format", documentKind: "document", assignedOn: "2024-07-01", position: "left" },
      { templateId: "tpl-sys-progress", templateName: "Progress Report — Term", documentKind: "report", assignedOn: "2024-07-01", position: "right" },
      { templateId: "tpl-sys-annual", templateName: "Annual Report Card", documentKind: "report", assignedOn: "2024-07-01", position: "right" },
      { templateId: "tpl-sys-semester-report", templateName: "Semester Report Card", documentKind: "report", assignedOn: "2025-01-01", position: "right" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2024-07-01",
    lastUsedOn: "2025-06-19",
    totalDocumentsSigned: 1842,
  },
  {
    id: "SIG-002",
    name: "Mrs. Priya Nair",
    designation: "Vice Principal",
    role: "vice_principal",
    department: "Administration",
    email: "vp@lumenxschool.edu",
    phone: "+91 87654 32109",
    status: "active",
    isDefault: false,
    signatureImageUrl: SIG_PRIYA,
    signatureImageUploadedOn: "2024-07-01",
    signatureImageNote: "Digital scan — high resolution",
    assignedTemplates: [
      { templateId: "tpl-sys-bonafide", templateName: "Bonafide Certificate — Ornate", documentKind: "certificate", assignedOn: "2024-07-01", position: "right" },
      { templateId: "tpl-sys-study", templateName: "Study Certificate", documentKind: "certificate", assignedOn: "2024-08-01", position: "left" },
      { templateId: "tpl-sys-conduct", templateName: "Conduct Certificate", documentKind: "certificate", assignedOn: "2024-08-01", position: "right" },
      { templateId: "tpl-sys-attendance-cert", templateName: "Attendance Excellence Certificate", documentKind: "certificate", assignedOn: "2025-01-01", position: "left" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2024-07-01",
    lastUsedOn: "2025-06-18",
    totalDocumentsSigned: 624,
  },
  {
    id: "SIG-003",
    name: "Mr. Vikram Tiwari",
    designation: "Head of Academics",
    role: "coordinator",
    department: "Academics",
    email: "academics@lumenxschool.edu",
    phone: "+91 76543 21098",
    status: "active",
    isDefault: false,
    signatureImageUrl: SIG_VIKRAM,
    signatureImageUploadedOn: "2024-09-01",
    signatureImageNote: "Scanned from letterhead Q3 2024",
    assignedTemplates: [
      { templateId: "tpl-sys-marksheet", templateName: "Mark Sheet — Semester", documentKind: "document", assignedOn: "2024-09-01", position: "left" },
      { templateId: "tpl-sys-toppers-cert", templateName: "Subject Topper Certificate", documentKind: "certificate", assignedOn: "2025-01-01", position: "left" },
      { templateId: "tpl-sys-semester-report", templateName: "Semester Report Card", documentKind: "report", assignedOn: "2025-01-01", position: "left" },
      { templateId: "tpl-sys-transfer", templateName: "Transfer Certificate — Board Format", documentKind: "document", assignedOn: "2024-09-01", position: "right" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2024-09-01",
    lastUsedOn: "2025-06-16",
    totalDocumentsSigned: 412,
  },
  {
    id: "SIG-004",
    name: "Ms. Sunita Rao",
    designation: "Admissions Officer",
    role: "admissions_officer",
    department: "Admissions",
    email: "admissions@lumenxschool.edu",
    phone: "+91 65432 10987",
    status: "active",
    isDefault: false,
    signatureImageUrl: SIG_SUNITA,
    signatureImageUploadedOn: "2024-10-15",
    signatureImageNote: "Uploaded Oct 2024",
    assignedTemplates: [
      { templateId: "tpl-sys-student-id", templateName: "Student ID — Standard", documentKind: "id_card", assignedOn: "2024-10-15", position: "center" },
      { templateId: "tpl-sys-staff-id", templateName: "Staff ID Card — Standard", documentKind: "id_card", assignedOn: "2024-10-15", position: "center" },
      { templateId: "tpl-sys-visitor-pass", templateName: "Visitor Pass", documentKind: "id_card", assignedOn: "2025-02-01", position: "center" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2024-10-15",
    lastUsedOn: "2025-06-15",
    totalDocumentsSigned: 298,
  },
  {
    id: "SIG-005",
    name: "Mr. Sanjay Dubey",
    designation: "Sports Director",
    role: "custom",
    department: "Sports",
    email: "sports@lumenxschool.edu",
    phone: "+91 54321 09876",
    status: "active",
    isDefault: false,
    signatureImageUrl: SIG_AJAY,
    signatureImageUploadedOn: "2025-01-10",
    signatureImageNote: "",
    assignedTemplates: [
      { templateId: "tpl-sys-sports-winner", templateName: "Sports Winner Certificate", documentKind: "certificate", assignedOn: "2025-01-10", position: "right" },
      { templateId: "tpl-sys-sports-participation", templateName: "Sports Participation Certificate", documentKind: "certificate", assignedOn: "2025-01-10", position: "right" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2025-01-10",
    lastUsedOn: "2025-05-22",
    totalDocumentsSigned: 187,
  },
  {
    id: "SIG-006",
    name: "Dr. Meena Pillai",
    designation: "School Counselor",
    role: "custom",
    department: "Counseling",
    email: "counselor@lumenxschool.edu",
    phone: "+91 43210 98765",
    status: "active",
    isDefault: false,
    signatureImageUrl: null,
    signatureImageUploadedOn: null,
    signatureImageNote: "",
    assignedTemplates: [
      { templateId: "tpl-sys-character", templateName: "Character Certificate", documentKind: "certificate", assignedOn: "2025-03-01", position: "right" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2025-03-01",
    lastUsedOn: "2025-04-18",
    totalDocumentsSigned: 42,
  },
  {
    id: "SIG-007",
    name: "Mr. Ajay Sharma",
    designation: "Class Teacher XI-A",
    role: "custom",
    department: "Science",
    email: "ajay.sharma@lumenxschool.edu",
    phone: "+91 32109 87654",
    status: "active",
    isDefault: false,
    signatureImageUrl: null,
    signatureImageUploadedOn: null,
    signatureImageNote: "",
    assignedTemplates: [
      { templateId: "tpl-sys-progress", templateName: "Progress Report — Term", documentKind: "report", assignedOn: "2025-04-01", position: "left" },
      { templateId: "tpl-sys-semester-report", templateName: "Semester Report Card", documentKind: "report", assignedOn: "2025-04-01", position: "left" },
    ],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2025-04-01",
    lastUsedOn: "2025-06-10",
    totalDocumentsSigned: 96,
  },
  {
    id: "SIG-008",
    name: "Mr. Naresh Sharma",
    designation: "Former Principal",
    role: "principal",
    department: "Administration",
    email: "naresh.sharma@lumenxschool.edu",
    phone: "+91 21098 76543",
    status: "inactive",
    isDefault: false,
    signatureImageUrl: null,
    signatureImageUploadedOn: null,
    signatureImageNote: "Retired June 2024",
    assignedTemplates: [],
    digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
    addedOn: "2023-07-01",
    lastUsedOn: "2024-06-30",
    totalDocumentsSigned: 3241,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const ROLE_LABEL: Record<SignatoryRole, string> = {
  principal: "Principal",
  vice_principal: "Vice Principal",
  coordinator: "Coordinator",
  admissions_officer: "Admissions Officer",
  custom: "Custom",
};

export const ROLE_COLOR: Record<SignatoryRole, string> = {
  principal: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  vice_principal: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  coordinator: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  admissions_officer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  custom: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export const ROLE_AVATAR_COLOR: Record<SignatoryRole, string> = {
  principal: "bg-amber-500/15 text-amber-700",
  vice_principal: "bg-blue-500/15 text-blue-700",
  coordinator: "bg-violet-500/15 text-violet-700",
  admissions_officer: "bg-emerald-500/15 text-emerald-700",
  custom: "bg-slate-500/15 text-slate-700",
};

export const KIND_LABEL: Record<string, string> = {
  certificate: "Certificate",
  report: "Report",
  document: "Document",
  id_card: "ID Card",
};

export const KIND_COLOR: Record<string, string> = {
  certificate: "bg-amber-500/10 text-amber-600",
  report: "bg-blue-500/10 text-blue-600",
  document: "bg-slate-500/10 text-slate-600",
  id_card: "bg-indigo-500/10 text-indigo-600",
};

export const POSITION_LABEL: Record<string, string> = {
  left: "Left slot",
  right: "Right slot",
  center: "Center slot",
};
