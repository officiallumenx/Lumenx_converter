// ─── Types ────────────────────────────────────────────────────────────────────

export type DocRequestStatus = "pending" | "processing" | "ready" | "delivered" | "rejected";
export type DocRequestKind =
  | "bonafide"
  | "transfer"
  | "conduct"
  | "marksheet"
  | "character"
  | "migration"
  | "experience"
  | "salary"
  | "custom";

export type DocPackageStatus = "active" | "draft" | "archived";
export type DocSignatureStatus = "active" | "inactive";
export type DocGeneratedStatus = "generated" | "downloaded" | "expired" | "revoked";
export type DocPublishedStatus = "published" | "draft" | "archived" | "scheduled";
export type DocCategoryKind = "academic" | "official" | "personal" | "employment" | "financial";

// ─── Document Requests ────────────────────────────────────────────────────────

export type DocRequest = {
  id: string;
  student: string;
  class: string;
  rollNo: string;
  kind: DocRequestKind;
  purpose: string;
  status: DocRequestStatus;
  requestedOn: string;
  requiredBy: string;
  assignedTo: string | null;
  remarks: string;
  urgency: "normal" | "urgent";
};

export const DOC_REQUESTS: DocRequest[] = [
  {
    id: "REQ-2025-001",
    student: "Aarav Sharma",
    class: "XII-A",
    rollNo: "2025001",
    kind: "bonafide",
    purpose: "Bank account opening",
    status: "ready",
    requestedOn: "2025-06-10",
    requiredBy: "2025-06-20",
    assignedTo: "Mrs. Priya Nair",
    remarks: "Signed by principal",
    urgency: "normal",
  },
  {
    id: "REQ-2025-002",
    student: "Ananya Patel",
    class: "X-B",
    rollNo: "2025002",
    kind: "transfer",
    purpose: "School transfer to Mumbai",
    status: "processing",
    requestedOn: "2025-06-12",
    requiredBy: "2025-06-25",
    assignedTo: "Mr. Vikram Tiwari",
    remarks: "Pending NOC from fees dept",
    urgency: "urgent",
  },
  {
    id: "REQ-2025-003",
    student: "Rohan Mehta",
    class: "XI-C",
    rollNo: "2025003",
    kind: "marksheet",
    purpose: "University admission",
    status: "pending",
    requestedOn: "2025-06-15",
    requiredBy: "2025-07-01",
    assignedTo: null,
    remarks: "",
    urgency: "normal",
  },
  {
    id: "REQ-2025-004",
    student: "Priya Singh",
    class: "IX-A",
    rollNo: "2025004",
    kind: "conduct",
    purpose: "Scout & Guides enrollment",
    status: "delivered",
    requestedOn: "2025-06-05",
    requiredBy: "2025-06-15",
    assignedTo: "Mrs. Priya Nair",
    remarks: "Collected by parent",
    urgency: "normal",
  },
  {
    id: "REQ-2025-005",
    student: "Kabir Verma",
    class: "VIII-B",
    rollNo: "2025005",
    kind: "character",
    purpose: "Sports competition",
    status: "pending",
    requestedOn: "2025-06-16",
    requiredBy: "2025-06-22",
    assignedTo: null,
    remarks: "",
    urgency: "urgent",
  },
  {
    id: "REQ-2025-006",
    student: "Diya Iyer",
    class: "XII-B",
    rollNo: "2025006",
    kind: "migration",
    purpose: "State board migration to CBSE",
    status: "rejected",
    requestedOn: "2025-06-08",
    requiredBy: "2025-06-18",
    assignedTo: "Mr. Vikram Tiwari",
    remarks: "Documents incomplete — resubmit with board details",
    urgency: "normal",
  },
  {
    id: "REQ-2025-007",
    student: "Arjun Nair",
    class: "VII-A",
    rollNo: "2025007",
    kind: "bonafide",
    purpose: "Railway concession",
    status: "processing",
    requestedOn: "2025-06-14",
    requiredBy: "2025-06-24",
    assignedTo: "Mrs. Priya Nair",
    remarks: "Second copy request",
    urgency: "normal",
  },
  {
    id: "REQ-2025-008",
    student: "Sneha Gupta",
    class: "XI-A",
    rollNo: "2025008",
    kind: "marksheet",
    purpose: "JEE coaching admission",
    status: "ready",
    requestedOn: "2025-06-11",
    requiredBy: "2025-06-21",
    assignedTo: "Mrs. Priya Nair",
    remarks: "Stamped copy ready",
    urgency: "normal",
  },
  {
    id: "REQ-2025-009",
    student: "Vivek Rajan",
    class: "X-A",
    rollNo: "2025009",
    kind: "custom",
    purpose: "Sports authority NOC",
    status: "pending",
    requestedOn: "2025-06-17",
    requiredBy: "2025-06-28",
    assignedTo: null,
    remarks: "Template not selected yet",
    urgency: "urgent",
  },
  {
    id: "REQ-2025-010",
    student: "Meera Krishnan",
    class: "VI-C",
    rollNo: "2025010",
    kind: "bonafide",
    purpose: "Scholarship application",
    status: "delivered",
    requestedOn: "2025-06-03",
    requiredBy: "2025-06-12",
    assignedTo: "Mr. Vikram Tiwari",
    remarks: "Courier dispatched",
    urgency: "normal",
  },
];

// ─── Document Packages ────────────────────────────────────────────────────────

export type DocPackage = {
  id: string;
  name: string;
  description: string;
  kind: "graduation" | "admission" | "exit" | "scholarship" | "competition" | "custom";
  documents: string[];
  targetGrade: string;
  status: DocPackageStatus;
  createdOn: string;
  usageCount: number;
  lastUsed: string | null;
};

export const DOC_PACKAGES: DocPackage[] = [
  {
    id: "PKG-001",
    name: "Class XII Graduation Bundle",
    description: "Complete exit documentation for outgoing Grade 12 students",
    kind: "graduation",
    documents: ["Transfer Certificate", "Marksheet (Final)", "Character Certificate", "Migration Certificate"],
    targetGrade: "Grade XII",
    status: "active",
    createdOn: "2025-02-01",
    usageCount: 142,
    lastUsed: "2025-06-15",
  },
  {
    id: "PKG-002",
    name: "New Admission Starter",
    description: "Documents required for newly admitted students",
    kind: "admission",
    documents: ["Bonafide Certificate", "Student ID Card", "Fee Receipt Letter"],
    targetGrade: "All Grades",
    status: "active",
    createdOn: "2025-01-10",
    usageCount: 287,
    lastUsed: "2025-06-18",
  },
  {
    id: "PKG-003",
    name: "Scholarship Application Kit",
    description: "Supporting documents for central & state scholarships",
    kind: "scholarship",
    documents: ["Bonafide Certificate", "Income Proof Letter", "Marksheet", "Conduct Certificate"],
    targetGrade: "Grades IX–XII",
    status: "active",
    createdOn: "2025-03-15",
    usageCount: 54,
    lastUsed: "2025-05-30",
  },
  {
    id: "PKG-004",
    name: "Sports Competition NOC Bundle",
    description: "Official documents for inter-school and national competitions",
    kind: "competition",
    documents: ["Character Certificate", "Bonafide Certificate", "Health Declaration Letter"],
    targetGrade: "All Grades",
    status: "active",
    createdOn: "2025-04-01",
    usageCount: 38,
    lastUsed: "2025-06-12",
  },
  {
    id: "PKG-005",
    name: "Mid-Year Exit Bundle",
    description: "For students leaving before year completion",
    kind: "exit",
    documents: ["Transfer Certificate", "Progress Report", "Character Certificate"],
    targetGrade: "All Grades",
    status: "draft",
    createdOn: "2025-05-20",
    usageCount: 0,
    lastUsed: null,
  },
  {
    id: "PKG-006",
    name: "Board Exam Registration Pack",
    description: "Documents for Class X & XII board examination registration",
    kind: "custom",
    documents: ["Enrollment Certificate", "Marksheet (Internal)", "Photo Identity Letter"],
    targetGrade: "Grades X & XII",
    status: "active",
    createdOn: "2025-01-25",
    usageCount: 204,
    lastUsed: "2025-04-10",
  },
];

// ─── Document Templates (lightweight, for the studio's own template tab) ──────

export type DocTemplate = {
  id: string;
  name: string;
  kind: DocRequestKind;
  categoryId: string;
  source: "system" | "custom";
  lastModified: string;
  usageCount: number;
  status: "active" | "draft" | "archived";
  size: "A4" | "letter" | "custom";
  language: string;
};

export const DOC_TEMPLATES: DocTemplate[] = [
  { id: "DT-001", name: "Bonafide Certificate – Standard", kind: "bonafide", categoryId: "cat-official", source: "system", lastModified: "2025-06-01", usageCount: 312, status: "active", size: "A4", language: "English" },
  { id: "DT-002", name: "Transfer Certificate – CBSE Format", kind: "transfer", categoryId: "cat-official", source: "system", lastModified: "2025-05-15", usageCount: 189, status: "active", size: "A4", language: "English" },
  { id: "DT-003", name: "Character Certificate – General", kind: "character", categoryId: "cat-academic", source: "system", lastModified: "2025-04-20", usageCount: 98, status: "active", size: "A4", language: "English" },
  { id: "DT-004", name: "Conduct Certificate – Competition", kind: "conduct", categoryId: "cat-official", source: "system", lastModified: "2025-05-10", usageCount: 74, status: "active", size: "A4", language: "English" },
  { id: "DT-005", name: "Migration Certificate – State Board", kind: "migration", categoryId: "cat-official", source: "system", lastModified: "2025-03-08", usageCount: 31, status: "active", size: "A4", language: "English" },
  { id: "DT-006", name: "Marksheet – End of Year", kind: "marksheet", categoryId: "cat-academic", source: "system", lastModified: "2025-06-10", usageCount: 421, status: "active", size: "A4", language: "English" },
  { id: "DT-007", name: "Bonafide – Hindi Medium", kind: "bonafide", categoryId: "cat-official", source: "custom", lastModified: "2025-06-05", usageCount: 67, status: "active", size: "A4", language: "Hindi" },
  { id: "DT-008", name: "Experience Letter – Teacher", kind: "experience", categoryId: "cat-employment", source: "custom", lastModified: "2025-05-28", usageCount: 22, status: "active", size: "A4", language: "English" },
  { id: "DT-009", name: "Salary Certificate – Staff", kind: "salary", categoryId: "cat-employment", source: "custom", lastModified: "2025-06-08", usageCount: 15, status: "draft", size: "A4", language: "English" },
  { id: "DT-010", name: "Custom – Sports NOC", kind: "custom", categoryId: "cat-official", source: "custom", lastModified: "2025-06-14", usageCount: 9, status: "active", size: "A4", language: "English" },
];

// ─── Generated Documents ──────────────────────────────────────────────────────

export type GeneratedDoc = {
  id: string;
  docNo: string;
  student: string;
  class: string;
  templateName: string;
  kind: DocRequestKind;
  generatedOn: string;
  generatedBy: string;
  status: DocGeneratedStatus;
  fileSize: string;
  requestId: string | null;
};

export const GENERATED_DOCS: GeneratedDoc[] = [
  { id: "GD-001", docNo: "BON/2025/001", student: "Aarav Sharma", class: "XII-A", templateName: "Bonafide Certificate – Standard", kind: "bonafide", generatedOn: "2025-06-11", generatedBy: "Mrs. Priya Nair", status: "downloaded", fileSize: "142 KB", requestId: "REQ-2025-001" },
  { id: "GD-002", docNo: "BON/2025/002", student: "Arjun Nair", class: "VII-A", templateName: "Bonafide Certificate – Standard", kind: "bonafide", generatedOn: "2025-06-14", generatedBy: "Mrs. Priya Nair", status: "generated", fileSize: "138 KB", requestId: "REQ-2025-007" },
  { id: "GD-003", docNo: "MRK/2025/001", student: "Sneha Gupta", class: "XI-A", templateName: "Marksheet – End of Year", kind: "marksheet", generatedOn: "2025-06-12", generatedBy: "Mrs. Priya Nair", status: "downloaded", fileSize: "220 KB", requestId: "REQ-2025-008" },
  { id: "GD-004", docNo: "CHR/2025/001", student: "Priya Singh", class: "IX-A", templateName: "Character Certificate – General", kind: "character", generatedOn: "2025-06-06", generatedBy: "Mr. Vikram Tiwari", status: "downloaded", fileSize: "128 KB", requestId: "REQ-2025-004" },
  { id: "GD-005", docNo: "TC/2025/001", student: "Ananya Patel", class: "X-B", templateName: "Transfer Certificate – CBSE Format", kind: "transfer", generatedOn: "2025-06-13", generatedBy: "Mr. Vikram Tiwari", status: "generated", fileSize: "188 KB", requestId: "REQ-2025-002" },
  { id: "GD-006", docNo: "MIG/2025/001", student: "Diya Iyer", class: "XII-B", templateName: "Migration Certificate – State Board", kind: "migration", generatedOn: "2025-05-20", generatedBy: "Mr. Vikram Tiwari", status: "revoked", fileSize: "155 KB", requestId: "REQ-2025-006" },
  { id: "GD-007", docNo: "BON/2025/003", student: "Meera Krishnan", class: "VI-C", templateName: "Bonafide – Hindi Medium", kind: "bonafide", generatedOn: "2025-06-04", generatedBy: "Mr. Vikram Tiwari", status: "downloaded", fileSize: "140 KB", requestId: "REQ-2025-010" },
  { id: "GD-008", docNo: "MRK/2025/002", student: "Rohan Mehta", class: "XI-C", templateName: "Marksheet – End of Year", kind: "marksheet", generatedOn: "2025-06-16", generatedBy: "Mrs. Priya Nair", status: "generated", fileSize: "215 KB", requestId: "REQ-2025-003" },
  { id: "GD-009", docNo: "CND/2025/001", student: "Kabir Verma", class: "VIII-B", templateName: "Conduct Certificate – Competition", kind: "conduct", generatedOn: "2025-04-10", generatedBy: "Mrs. Priya Nair", status: "expired", fileSize: "130 KB", requestId: null },
  { id: "GD-010", docNo: "EXP/2025/001", student: "N/A (Staff)", class: "—", templateName: "Experience Letter – Teacher", kind: "experience", generatedOn: "2025-06-01", generatedBy: "Principal", status: "downloaded", fileSize: "112 KB", requestId: null },
];

// ─── Published Documents ──────────────────────────────────────────────────────

export type PublishedDoc = {
  id: string;
  title: string;
  description: string;
  category: string;
  publishedOn: string | null;
  scheduledFor: string | null;
  status: DocPublishedStatus;
  audience: string[];
  downloadCount: number;
  version: string;
  lastUpdated: string;
  fileSize: string;
};

export const PUBLISHED_DOCS: PublishedDoc[] = [
  { id: "PUB-001", title: "Academic Handbook 2025–26", description: "Curriculum, exam schedules, rules, and policies for the academic year", category: "Academic", publishedOn: "2025-06-01", scheduledFor: null, status: "published", audience: ["Parents", "Students", "Teachers"], downloadCount: 1248, version: "1.2", lastUpdated: "2025-06-01", fileSize: "2.4 MB" },
  { id: "PUB-002", title: "Fee Structure 2025–26", description: "Term-wise and category-wise fee breakdowns for all grades", category: "Financial", publishedOn: "2025-04-15", scheduledFor: null, status: "published", audience: ["Parents", "Students"], downloadCount: 892, version: "1.0", lastUpdated: "2025-04-15", fileSize: "540 KB" },
  { id: "PUB-003", title: "Term 1 Exam Schedule", description: "Detailed timetable for Term 1 examinations by class and subject", category: "Academic", publishedOn: "2025-06-10", scheduledFor: null, status: "published", audience: ["Parents", "Students", "Teachers"], downloadCount: 2103, version: "1.0", lastUpdated: "2025-06-10", fileSize: "320 KB" },
  { id: "PUB-004", title: "Annual Day Circular 2025", description: "Program details, dress code, and parent guidelines for Annual Day", category: "Events", publishedOn: null, scheduledFor: "2025-07-05", status: "scheduled", audience: ["Parents", "Students"], downloadCount: 0, version: "1.0", lastUpdated: "2025-06-16", fileSize: "210 KB" },
  { id: "PUB-005", title: "Sports Day Participation Form", description: "Registration form and event details for inter-house Sports Day", category: "Events", publishedOn: "2025-06-05", scheduledFor: null, status: "published", audience: ["Students", "Teachers"], downloadCount: 674, version: "1.1", lastUpdated: "2025-06-07", fileSize: "185 KB" },
  { id: "PUB-006", title: "Anti-Ragging Policy", description: "Institute's anti-ragging policy and grievance redressal process", category: "Policy", publishedOn: "2024-07-01", scheduledFor: null, status: "archived", audience: ["All"], downloadCount: 312, version: "2.0", lastUpdated: "2024-07-01", fileSize: "420 KB" },
  { id: "PUB-007", title: "Health & Safety Guidelines", description: "COVID-era updated health and safety protocols for campus", category: "Policy", publishedOn: null, scheduledFor: null, status: "draft", audience: ["All"], downloadCount: 0, version: "0.1", lastUpdated: "2025-06-12", fileSize: "280 KB" },
  { id: "PUB-008", title: "Scholarship Application Form 2025", description: "Eligible students can apply for merit and need-based scholarships", category: "Financial", publishedOn: "2025-05-15", scheduledFor: null, status: "published", audience: ["Parents", "Students"], downloadCount: 487, version: "1.0", lastUpdated: "2025-05-15", fileSize: "165 KB" },
];

// ─── Signatures / Signatories ─────────────────────────────────────────────────

export type Signatory = {
  id: string;
  name: string;
  designation: string;
  department: string;
  signatureType: "digital" | "image" | "none";
  usedInTemplates: number;
  status: DocSignatureStatus;
  addedOn: string;
  lastUsed: string | null;
};

export const SIGNATORIES: Signatory[] = [
  { id: "SIG-001", name: "Dr. Ramesh Kumar", designation: "Principal", department: "Administration", signatureType: "digital", usedInTemplates: 14, status: "active", addedOn: "2024-07-01", lastUsed: "2025-06-14" },
  { id: "SIG-002", name: "Mrs. Priya Nair", designation: "Vice Principal", department: "Administration", signatureType: "digital", usedInTemplates: 8, status: "active", addedOn: "2024-07-01", lastUsed: "2025-06-15" },
  { id: "SIG-003", name: "Mr. Vikram Tiwari", designation: "Head of Academics", department: "Academics", signatureType: "image", usedInTemplates: 6, status: "active", addedOn: "2024-09-01", lastUsed: "2025-06-12" },
  { id: "SIG-004", name: "Ms. Anita Joshi", designation: "Accounts Head", department: "Finance", signatureType: "image", usedInTemplates: 3, status: "active", addedOn: "2024-10-15", lastUsed: "2025-05-30" },
  { id: "SIG-005", name: "Mr. Sanjay Dubey", designation: "Sports Director", department: "Sports", signatureType: "none", usedInTemplates: 2, status: "active", addedOn: "2025-01-10", lastUsed: "2025-05-22" },
  { id: "SIG-006", name: "Dr. Meena Pillai", designation: "School Counselor", department: "Counseling", signatureType: "digital", usedInTemplates: 1, status: "active", addedOn: "2025-03-01", lastUsed: "2025-04-18" },
  { id: "SIG-007", name: "Mr. Naresh Sharma", designation: "Previous Principal", department: "Administration", signatureType: "image", usedInTemplates: 0, status: "inactive", addedOn: "2023-07-01", lastUsed: "2024-06-30" },
];

// ─── Categories ───────────────────────────────────────────────────────────────

export type DocCategoryKindLegacy = DocCategoryKind; // preserve compat

export type DocCategoryItem = {
  id: string;
  name: string;
  description: string;
  templateCount: number;
  issuedCount: number;
  pendingRequests: number;
  lastIssuedOn: string | null;
  avgProcessingDays: number;
  targetAudience: "student" | "staff" | "both";
  recentIssuances: { student: string; class: string; issuedOn: string; docNo: string }[];
};

export type DocCategoryGroup = {
  id: string;
  name: string;
  description: string;
  color: string;
  accentColor: string;
  iconKey: string;
  isSystem: boolean;
  createdOn: string;
  items: DocCategoryItem[];
};

export const DOC_CATEGORY_GROUPS: DocCategoryGroup[] = [
  {
    id: "cat-academic-reports",
    name: "Academic Reports",
    description: "Periodic progress and performance reports issued to students and parents",
    color: "#3b82f6",
    accentColor: "bg-blue-500/10 text-blue-600",
    iconKey: "FileBarChart",
    isSystem: true,
    createdOn: "2024-07-01",
    items: [
      {
        id: "ci-progress-report",
        name: "Progress Report",
        description: "Quarterly academic performance summary with teacher remarks per subject",
        templateCount: 3,
        issuedCount: 1248,
        pendingRequests: 2,
        lastIssuedOn: "2025-06-14",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Aarav Sharma", class: "XII-A", issuedOn: "2025-06-14", docNo: "RPT/2025/001" },
          { student: "Priya Singh", class: "IX-A", issuedOn: "2025-06-13", docNo: "RPT/2025/002" },
          { student: "Rohan Mehta", class: "XI-C", issuedOn: "2025-06-12", docNo: "RPT/2025/003" },
        ],
      },
      {
        id: "ci-semester-report",
        name: "Semester Report",
        description: "End-of-semester consolidated marks and attendance summary",
        templateCount: 2,
        issuedCount: 624,
        pendingRequests: 0,
        lastIssuedOn: "2025-05-30",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Sneha Gupta", class: "XI-A", issuedOn: "2025-05-30", docNo: "SEM/2025/001" },
          { student: "Arjun Nair", class: "VII-A", issuedOn: "2025-05-29", docNo: "SEM/2025/002" },
        ],
      },
      {
        id: "ci-annual-report",
        name: "Annual Report",
        description: "Full-year academic record including all terms, ranks, and remarks",
        templateCount: 2,
        issuedCount: 412,
        pendingRequests: 5,
        lastIssuedOn: "2025-06-10",
        avgProcessingDays: 3,
        targetAudience: "student",
        recentIssuances: [
          { student: "Diya Iyer", class: "XII-B", issuedOn: "2025-06-10", docNo: "ANN/2025/001" },
          { student: "Kabir Verma", class: "VIII-B", issuedOn: "2025-06-09", docNo: "ANN/2025/002" },
        ],
      },
      {
        id: "ci-exam-report",
        name: "Exam Report",
        description: "Post-examination detailed marks sheet per subject with pass/fail and rank",
        templateCount: 4,
        issuedCount: 1876,
        pendingRequests: 8,
        lastIssuedOn: "2025-06-15",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Meera Krishnan", class: "VI-C", issuedOn: "2025-06-15", docNo: "EXM/2025/001" },
          { student: "Vivek Rajan", class: "X-A", issuedOn: "2025-06-14", docNo: "EXM/2025/002" },
          { student: "Ananya Patel", class: "X-B", issuedOn: "2025-06-13", docNo: "EXM/2025/003" },
        ],
      },
    ],
  },
  {
    id: "cat-student-docs",
    name: "Student Documents",
    description: "Official documents required by students for external and internal purposes",
    color: "#8b5cf6",
    accentColor: "bg-violet-500/10 text-violet-600",
    iconKey: "IdCard",
    isSystem: true,
    createdOn: "2024-07-01",
    items: [
      {
        id: "ci-study-cert",
        name: "Study Certificate",
        description: "Certifies the student is currently enrolled and pursuing studies",
        templateCount: 2,
        issuedCount: 342,
        pendingRequests: 4,
        lastIssuedOn: "2025-06-16",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Aarav Sharma", class: "XII-A", issuedOn: "2025-06-16", docNo: "STD/2025/001" },
          { student: "Sneha Gupta", class: "XI-A", issuedOn: "2025-06-15", docNo: "STD/2025/002" },
        ],
      },
      {
        id: "ci-bonafide",
        name: "Bonafide Certificate",
        description: "General-purpose certificate confirming student status, class, and roll number",
        templateCount: 3,
        issuedCount: 687,
        pendingRequests: 3,
        lastIssuedOn: "2025-06-14",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Arjun Nair", class: "VII-A", issuedOn: "2025-06-14", docNo: "BON/2025/007" },
          { student: "Meera Krishnan", class: "VI-C", issuedOn: "2025-06-04", docNo: "BON/2025/006" },
          { student: "Aarav Sharma", class: "XII-A", issuedOn: "2025-06-11", docNo: "BON/2025/005" },
        ],
      },
      {
        id: "ci-conduct-cert",
        name: "Conduct Certificate",
        description: "Attests to the student's good conduct and behaviour in school",
        templateCount: 2,
        issuedCount: 198,
        pendingRequests: 1,
        lastIssuedOn: "2025-06-12",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Priya Singh", class: "IX-A", issuedOn: "2025-06-06", docNo: "CND/2025/004" },
        ],
      },
      {
        id: "ci-transfer-cert",
        name: "Transfer Certificate",
        description: "Issued on school leaving — confirms academic record, attendance, conduct",
        templateCount: 2,
        issuedCount: 89,
        pendingRequests: 2,
        lastIssuedOn: "2025-06-13",
        avgProcessingDays: 5,
        targetAudience: "student",
        recentIssuances: [
          { student: "Ananya Patel", class: "X-B", issuedOn: "2025-06-13", docNo: "TC/2025/003" },
        ],
      },
      {
        id: "ci-migration-cert",
        name: "Migration Certificate",
        description: "Required for students moving between state boards or regions",
        templateCount: 1,
        issuedCount: 24,
        pendingRequests: 1,
        lastIssuedOn: "2025-05-20",
        avgProcessingDays: 7,
        targetAudience: "student",
        recentIssuances: [],
      },
    ],
  },
  {
    id: "cat-academic-certs",
    name: "Academic Certificates",
    description: "Merit and achievement certificates recognising academic performance",
    color: "#f59e0b",
    accentColor: "bg-amber-500/10 text-amber-600",
    iconKey: "Award",
    isSystem: true,
    createdOn: "2024-07-01",
    items: [
      {
        id: "ci-acad-excellence",
        name: "Academic Excellence",
        description: "Awarded to students scoring 90% or above in their class",
        templateCount: 3,
        issuedCount: 156,
        pendingRequests: 0,
        lastIssuedOn: "2025-04-10",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Sneha Gupta", class: "XI-A", issuedOn: "2025-04-10", docNo: "ACE/2025/001" },
          { student: "Aarav Sharma", class: "XII-A", issuedOn: "2025-04-10", docNo: "ACE/2025/002" },
          { student: "Diya Iyer", class: "XII-B", issuedOn: "2025-04-10", docNo: "ACE/2025/003" },
        ],
      },
      {
        id: "ci-attend-excellence",
        name: "Attendance Excellence",
        description: "Issued to students with 95%+ attendance across the academic year",
        templateCount: 1,
        issuedCount: 284,
        pendingRequests: 0,
        lastIssuedOn: "2025-04-12",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Priya Singh", class: "IX-A", issuedOn: "2025-04-12", docNo: "ATT/2025/001" },
          { student: "Meera Krishnan", class: "VI-C", issuedOn: "2025-04-12", docNo: "ATT/2025/002" },
        ],
      },
      {
        id: "ci-subject-topper",
        name: "Subject Topper",
        description: "Recognises the highest scorer in each subject per class",
        templateCount: 2,
        issuedCount: 96,
        pendingRequests: 0,
        lastIssuedOn: "2025-04-15",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Rohan Mehta", class: "XI-C", issuedOn: "2025-04-15", docNo: "TOP/2025/001" },
          { student: "Vivek Rajan", class: "X-A", issuedOn: "2025-04-15", docNo: "TOP/2025/002" },
        ],
      },
    ],
  },
  {
    id: "cat-sports-certs",
    name: "Sports Certificates",
    description: "Certificates for inter-school, state, and national level sports events",
    color: "#10b981",
    accentColor: "bg-emerald-500/10 text-emerald-600",
    iconKey: "Trophy",
    isSystem: true,
    createdOn: "2024-07-01",
    items: [
      {
        id: "ci-sports-participation",
        name: "Participation Certificate",
        description: "Issued to all students who participated in a sports event",
        templateCount: 2,
        issuedCount: 487,
        pendingRequests: 6,
        lastIssuedOn: "2025-06-05",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Kabir Verma", class: "VIII-B", issuedOn: "2025-06-05", docNo: "SPP/2025/001" },
          { student: "Arjun Nair", class: "VII-A", issuedOn: "2025-06-05", docNo: "SPP/2025/002" },
          { student: "Vivek Rajan", class: "X-A", issuedOn: "2025-06-05", docNo: "SPP/2025/003" },
        ],
      },
      {
        id: "ci-sports-winner",
        name: "Winner Certificate",
        description: "First place recognition for inter-school or intra-school sports competitions",
        templateCount: 3,
        issuedCount: 64,
        pendingRequests: 1,
        lastIssuedOn: "2025-06-06",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Kabir Verma", class: "VIII-B", issuedOn: "2025-06-06", docNo: "SPW/2025/001" },
        ],
      },
      {
        id: "ci-sports-runner",
        name: "Runner-Up Certificate",
        description: "Second place recognition in sports competitions",
        templateCount: 2,
        issuedCount: 48,
        pendingRequests: 1,
        lastIssuedOn: "2025-06-06",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Priya Singh", class: "IX-A", issuedOn: "2025-06-06", docNo: "SPR/2025/001" },
        ],
      },
      {
        id: "ci-sports-achievement",
        name: "Sports Achievement",
        description: "Special recognition for exceptional performance or sportsmanship",
        templateCount: 2,
        issuedCount: 32,
        pendingRequests: 0,
        lastIssuedOn: "2025-03-22",
        avgProcessingDays: 3,
        targetAudience: "student",
        recentIssuances: [
          { student: "Arjun Nair", class: "VII-A", issuedOn: "2025-03-22", docNo: "SPA/2025/001" },
        ],
      },
    ],
  },
  {
    id: "cat-extracurricular-certs",
    name: "Extra-Curricular Certificates",
    description: "Recognition for arts, culture, and co-curricular activities",
    color: "#ec4899",
    accentColor: "bg-pink-500/10 text-pink-600",
    iconKey: "Sparkles",
    isSystem: true,
    createdOn: "2024-07-01",
    items: [
      {
        id: "ci-dance",
        name: "Dance",
        description: "Certificate for participation or achievement in classical/folk/western dance",
        templateCount: 2,
        issuedCount: 74,
        pendingRequests: 2,
        lastIssuedOn: "2025-05-28",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Ananya Patel", class: "X-B", issuedOn: "2025-05-28", docNo: "ECX/2025/DAN/001" },
          { student: "Priya Singh", class: "IX-A", issuedOn: "2025-05-28", docNo: "ECX/2025/DAN/002" },
        ],
      },
      {
        id: "ci-music",
        name: "Music",
        description: "For vocal or instrumental music performance at school events",
        templateCount: 2,
        issuedCount: 58,
        pendingRequests: 1,
        lastIssuedOn: "2025-05-25",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Meera Krishnan", class: "VI-C", issuedOn: "2025-05-25", docNo: "ECX/2025/MUS/001" },
        ],
      },
      {
        id: "ci-drama",
        name: "Drama",
        description: "Certificate for performance in annual play, skit, or mono-act",
        templateCount: 1,
        issuedCount: 62,
        pendingRequests: 0,
        lastIssuedOn: "2025-05-10",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Rohan Mehta", class: "XI-C", issuedOn: "2025-05-10", docNo: "ECX/2025/DRM/001" },
        ],
      },
      {
        id: "ci-art",
        name: "Art",
        description: "Drawing, painting, craft, and visual arts competitions",
        templateCount: 2,
        issuedCount: 84,
        pendingRequests: 3,
        lastIssuedOn: "2025-06-01",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Diya Iyer", class: "XII-B", issuedOn: "2025-06-01", docNo: "ECX/2025/ART/001" },
          { student: "Sneha Gupta", class: "XI-A", issuedOn: "2025-05-31", docNo: "ECX/2025/ART/002" },
        ],
      },
      {
        id: "ci-quiz",
        name: "Quiz",
        description: "Inter-class and inter-school quiz competitions across all subjects",
        templateCount: 1,
        issuedCount: 46,
        pendingRequests: 0,
        lastIssuedOn: "2025-04-20",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Aarav Sharma", class: "XII-A", issuedOn: "2025-04-20", docNo: "ECX/2025/QUZ/001" },
        ],
      },
      {
        id: "ci-debate",
        name: "Debate",
        description: "Parliamentary debate, elocution, and speech competitions",
        templateCount: 1,
        issuedCount: 38,
        pendingRequests: 0,
        lastIssuedOn: "2025-04-18",
        avgProcessingDays: 1,
        targetAudience: "student",
        recentIssuances: [
          { student: "Vivek Rajan", class: "X-A", issuedOn: "2025-04-18", docNo: "ECX/2025/DBT/001" },
        ],
      },
      {
        id: "ci-science-fair",
        name: "Science Fair",
        description: "Certificate for participation or prizes in science exhibitions",
        templateCount: 2,
        issuedCount: 54,
        pendingRequests: 1,
        lastIssuedOn: "2025-03-15",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Rohan Mehta", class: "XI-C", issuedOn: "2025-03-15", docNo: "ECX/2025/SCI/001" },
          { student: "Sneha Gupta", class: "XI-A", issuedOn: "2025-03-15", docNo: "ECX/2025/SCI/002" },
        ],
      },
    ],
  },
  {
    id: "cat-identity-cards",
    name: "Identity Cards",
    description: "Photo identity cards for all members of the institute community",
    color: "#6366f1",
    accentColor: "bg-indigo-500/10 text-indigo-600",
    iconKey: "CreditCard",
    isSystem: true,
    createdOn: "2024-07-01",
    items: [
      {
        id: "ci-student-id",
        name: "Student ID",
        description: "Annual photo identity card with class, section, roll, and QR code",
        templateCount: 3,
        issuedCount: 1248,
        pendingRequests: 14,
        lastIssuedOn: "2025-06-16",
        avgProcessingDays: 2,
        targetAudience: "student",
        recentIssuances: [
          { student: "Kabir Verma", class: "VIII-B", issuedOn: "2025-06-16", docNo: "SID/2025/001" },
          { student: "Meera Krishnan", class: "VI-C", issuedOn: "2025-06-15", docNo: "SID/2025/002" },
          { student: "Arjun Nair", class: "VII-A", issuedOn: "2025-06-14", docNo: "SID/2025/003" },
        ],
      },
      {
        id: "ci-teacher-id",
        name: "Teacher ID",
        description: "Staff identity card for all teaching and non-teaching faculty",
        templateCount: 2,
        issuedCount: 68,
        pendingRequests: 2,
        lastIssuedOn: "2025-06-10",
        avgProcessingDays: 2,
        targetAudience: "staff",
        recentIssuances: [
          { student: "Mrs. Priya Nair", class: "Staff", issuedOn: "2025-06-10", docNo: "TID/2025/001" },
        ],
      },
      {
        id: "ci-staff-id",
        name: "Staff ID",
        description: "For administrative, support, and ancillary staff members",
        templateCount: 2,
        issuedCount: 42,
        pendingRequests: 0,
        lastIssuedOn: "2025-05-20",
        avgProcessingDays: 2,
        targetAudience: "staff",
        recentIssuances: [
          { student: "Mr. Sanjay Dubey", class: "Staff", issuedOn: "2025-05-20", docNo: "STF/2025/001" },
        ],
      },
      {
        id: "ci-visitor-pass",
        name: "Visitor Pass",
        description: "One-time or recurring pass issued to visitors and contractors",
        templateCount: 1,
        issuedCount: 312,
        pendingRequests: 0,
        lastIssuedOn: "2025-06-17",
        avgProcessingDays: 0,
        targetAudience: "both",
        recentIssuances: [],
      },
    ],
  },
];

// ── Legacy flat categories for DocTemplates (kept for backward compat) ─────────
export type DocCategory = {
  id: string;
  name: string;
  kind: DocCategoryKind;
  description: string;
  templateCount: number;
  color: string;
  isSystem: boolean;
  createdOn: string;
};

export const DOC_CATEGORIES: DocCategory[] = DOC_CATEGORY_GROUPS.map((g) => ({
  id: g.id,
  name: g.name,
  kind: "official" as DocCategoryKind,
  description: g.description,
  templateCount: g.items.reduce((a, i) => a + i.templateCount, 0),
  color: g.color,
  isSystem: g.isSystem,
  createdOn: g.createdOn,
}));

// ─── Dashboard Summary ─────────────────────────────────────────────────────────

import { STUDIO_REQUESTS } from "./doc-requests-data";

export function getDocDashboardStats() {
  return {
    totalRequests: STUDIO_REQUESTS.length,
    pendingRequests: STUDIO_REQUESTS.filter((r) => r.status === "pending").length,
    urgentRequests: STUDIO_REQUESTS.filter((r) => r.urgency === "urgent" && r.status !== "published" && r.status !== "rejected").length,
    generatedThisMonth: GENERATED_DOCS.filter((d) => d.generatedOn.startsWith("2025-06")).length,
    totalPublished: PUBLISHED_DOCS.filter((d) => d.status === "published").length,
    activeSignatories: SIGNATORIES.filter((s) => s.status === "active").length,
    activeTemplates: DOC_TEMPLATES.filter((t) => t.status === "active").length,
    activePackages: DOC_PACKAGES.filter((p) => p.status === "active").length,
  };
}

export function getRecentRequests(n = 5) {
  return [...STUDIO_REQUESTS]
    .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn))
    .slice(0, n);
}

export function getRecentGenerated(n = 5) {
  return [...GENERATED_DOCS]
    .sort((a, b) => b.generatedOn.localeCompare(a.generatedOn))
    .slice(0, n);
}
