import type {
  AdmissionApplication,
  AdmissionsNotification,
  AdmissionsUser,
  ApplicationDocument,
  ApplicationStatus,
  FaqItem,
  TimelineEvent,
} from "./types";
import { statusLabel } from "./status-utils";

export const INSTITUTE_NAME = "LumenX Academy";
export const ADMISSIONS_CONTACT = {
  phone: "+91 40 4455 8800",
  email: "admissions@lumenx.edu",
  officeHours: "Mon–Sat, 9:00 AM – 5:00 PM",
  address: "Green Park Campus, Hyderabad — 500032",
};

export const IMPORTANT_DATES = [
  { label: "Applications open", date: "1 Mar 2026" },
  { label: "Early decision deadline", date: "15 Apr 2026" },
  { label: "Regular deadline", date: "31 May 2026" },
  { label: "Entrance assessments", date: "5–12 Jun 2026" },
  { label: "Session begins", date: "15 Jun 2026" },
];

export const CAMPUS_HIGHLIGHTS = [
  { title: "STEM Labs", desc: "Robotics, coding & science labs for hands-on learning." },
  { title: "Sports Complex", desc: "Olympic-size pool, cricket ground, indoor courts." },
  { title: "Arts & Culture", desc: "Music rooms, theatre, annual cultural fest." },
  { title: "Safe Campus", desc: "CCTV, gated entry, trained counsellors on site." },
];

export const ACHIEVEMENTS = [
  "98.2% board pass rate (2025)",
  "12 national science olympiad medals",
  "NAAC A+ accredited institution",
  "100% university placement for Grade 12",
];

export const SUCCESS_STORIES = [
  {
    name: "Ananya Iyer",
    program: "Grade 11",
    quote: "The admission process was smooth on my phone — I tracked every step.",
  },
  {
    name: "Vihaan Mehta",
    program: "Grade 9",
    quote: "Document upload was easy. Got interview details instantly in notifications.",
  },
];

export const ADMISSION_PROCESS_STEPS = [
  {
    step: 1,
    title: "Create account",
    desc: "Sign up with mobile or email — no existing school account needed.",
  },
  { step: 2, title: "Choose program", desc: "Browse programs and select grade for 2026–27." },
  { step: 3, title: "Submit application", desc: "Complete the 8-step form and upload documents." },
  {
    step: 4,
    title: "Track status",
    desc: "Follow verification, interview, and decision updates live.",
  },
];

const defaultDocs = (): ApplicationDocument[] => [
  {
    id: "doc-bc",
    type: "birth_certificate",
    label: "Birth Certificate",
    status: "verified",
    fileName: "birth_cert.pdf",
    uploadedAt: "2026-05-20",
    verificationTimeline: [
      { id: "vt1", status: "uploaded", at: "2026-05-20T09:00:00Z" },
      { id: "vt2", status: "under_review", at: "2026-05-21T10:00:00Z" },
      { id: "vt3", status: "verified", at: "2026-05-22T11:00:00Z", by: "Admissions Office" },
    ],
  },
  {
    id: "doc-tc",
    type: "transfer_certificate",
    label: "Transfer Certificate",
    status: "under_review",
    fileName: "tc.pdf",
    uploadedAt: "2026-05-21",
    verificationTimeline: [
      { id: "vt4", status: "uploaded", at: "2026-05-21T14:00:00Z" },
      { id: "vt5", status: "under_review", at: "2026-05-22T09:00:00Z" },
    ],
  },
  {
    id: "doc-mm",
    type: "marks_memo",
    label: "Previous Marks Memo",
    status: "verified",
    fileName: "marks.pdf",
    uploadedAt: "2026-05-20",
  },
  {
    id: "doc-photo",
    type: "student_photo",
    label: "Student Photo",
    status: "verified",
    fileName: "photo.jpg",
    uploadedAt: "2026-05-19",
  },
  {
    id: "doc-pid",
    type: "parent_id",
    label: "Parent ID",
    status: "resubmission_required",
    fileName: "aadhar.pdf",
    uploadedAt: "2026-05-21",
    note: "Image unclear — please re-upload.",
    adminNotes: ["Scan resolution too low", "Ensure all four corners visible"],
    verificationTimeline: [
      { id: "vt6", status: "uploaded", at: "2026-05-21T15:00:00Z" },
      { id: "vt7", status: "rejected", at: "2026-05-28T09:00:00Z", note: "Image unclear" },
      { id: "vt8", status: "resubmission_required", at: "2026-05-28T09:05:00Z" },
    ],
  },
];

export const DEMO_APPLICANT: AdmissionsUser = {
  id: "ADM-DEMO-001",
  name: "Priya Sharma",
  email: "priya.sharma@example.com",
  phone: "+91 98765 43210",
  passwordHash: "demo123",
  profileComplete: 85,
  createdAt: "2026-04-10T10:00:00Z",
  accountType: "parent",
};

export const DEMO_INSTITUTE_ADMIN: AdmissionsUser = {
  id: "ADM-INST-001",
  name: "Dr. Alistair Vance",
  email: "admin@lumenx.edu",
  phone: "+91 40 4455 8801",
  passwordHash: "demo123",
  profileComplete: 100,
  createdAt: "2026-03-01T10:00:00Z",
  accountType: "institute_admin",
  instituteId: "ins-lumenx-academy",
  instituteName: "LumenX Academy",
};

export const DEMO_APPLICATIONS: AdmissionApplication[] = [
  {
    id: "APP-2401",
    applicantId: "ADM-DEMO-001",
    instituteId: "ins-lumenx-academy",
    status: "document_verification",
    programId: "prog-lumenx-academy-high-school",
    programName: "High School",
    grade: "Grade 9",
    academicYear: "2026–27",
    submittedAt: "2026-05-22T14:30:00Z",
    updatedAt: "2026-05-28T09:00:00Z",
    student: {
      name: "Arjun Sharma",
      gender: "Male",
      dateOfBirth: "2011-08-15",
      nationality: "Indian",
      bloodGroup: "B+",
    },
    parent: {
      fatherName: "Rajesh Sharma",
      motherName: "Priya Sharma",
      guardianName: "Rajesh Sharma",
      mobile: "+91 98765 43210",
      email: "priya.sharma@example.com",
      occupation: "Software Engineer",
    },
    address: {
      address: "12 Green Park Road, Sector 4",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500032",
    },
    academic: {
      currentSchool: "Delhi Public School",
      currentGrade: "Grade 8",
      previousResults: "Grade 7 — 88%",
      performance: "Consistent A grade in Mathematics and Science",
    },
    documents: defaultDocs(),
    timeline: [
      { id: "t1", status: "submitted", label: "Application submitted", at: "2026-05-22T14:30:00Z" },
      {
        id: "t2",
        status: "documents_pending",
        label: "Documents pending upload",
        at: "2026-05-23T10:00:00Z",
      },
      {
        id: "t3",
        status: "documents_uploaded",
        label: "Documents uploaded",
        at: "2026-05-25T11:00:00Z",
      },
      {
        id: "t4",
        status: "document_verification",
        label: "Documents under verification",
        at: "2026-05-28T09:00:00Z",
      },
    ],
    adminNotes: ["Strong academic record. Awaiting parent ID resubmission."],
    requiredActions: ["Re-upload Parent ID document"],
  },
  {
    id: "APP-2398",
    applicantId: "ADM-DEMO-001",
    instituteId: "ins-lumenx-academy",
    status: "interview_scheduled",
    programId: "prog-lumenx-academy-intermediate",
    programName: "Intermediate",
    grade: "Grade 11",
    academicYear: "2026–27",
    submittedAt: "2026-05-15T11:00:00Z",
    updatedAt: "2026-05-27T16:00:00Z",
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
      mobile: "+91 98765 43210",
      email: "priya.sharma@example.com",
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
      currentSchool: "Narayana Junior College",
      currentGrade: "Grade 10",
      previousResults: "Grade 10 — 92%",
      performance: "Distinction in all subjects",
    },
    documents: defaultDocs().map((d) => ({ ...d, status: "verified" as const })),
    timeline: [
      { id: "t1", status: "submitted", label: "Application submitted", at: "2026-05-15T11:00:00Z" },
      {
        id: "t2",
        status: "documents_uploaded",
        label: "All documents uploaded",
        at: "2026-05-18T09:00:00Z",
      },
      {
        id: "t3",
        status: "document_verification",
        label: "Documents verified",
        at: "2026-05-22T14:00:00Z",
      },
      {
        id: "t4",
        status: "interview_scheduled",
        label: "Interview scheduled",
        at: "2026-05-27T16:00:00Z",
      },
    ],
    interview: {
      date: "5 Jun 2026",
      time: "10:30 AM",
      mode: "in_person",
      location: "Admissions Block, Room 102",
      instructions: "Bring original TC and ID. Student must attend with one parent.",
      requiredDocuments: ["Transfer Certificate", "Parent ID", "Student photo"],
      status: "scheduled",
    },
  },
  {
    id: "APP-2390",
    applicantId: "ADM-DEMO-001",
    instituteId: "ins-lumenx-academy",
    status: "approved",
    programId: "prog-lumenx-academy-primary",
    programName: "Primary School",
    grade: "Grade 3",
    academicYear: "2026–27",
    submittedAt: "2026-04-28T09:00:00Z",
    updatedAt: "2026-05-20T12:00:00Z",
    student: {
      name: "Riya Kapoor",
      gender: "Female",
      dateOfBirth: "2016-11-05",
      nationality: "Indian",
      bloodGroup: "A+",
    },
    parent: {
      fatherName: "Amit Kapoor",
      motherName: "Priya Sharma",
      guardianName: "Amit Kapoor",
      mobile: "+91 98765 43210",
      email: "priya.sharma@example.com",
      occupation: "Business Owner",
    },
    address: {
      address: "8 Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500033",
    },
    academic: {
      currentSchool: "Podar International",
      currentGrade: "Grade 2",
      previousResults: "Grade 1 — 95%",
      performance: "Excellent",
    },
    documents: defaultDocs().map((d) => ({ ...d, status: "verified" as const })),
    timeline: [
      { id: "t1", status: "submitted", label: "Application submitted", at: "2026-04-28T09:00:00Z" },
      {
        id: "t2",
        status: "approved",
        label: "Admission approved",
        at: "2026-05-20T12:00:00Z",
        note: "Welcome to LumenX Academy!",
      },
    ],
    adminNotes: ["Provisional admission confirmed. Fee payment link sent via email."],
  },
  {
    id: "APP-2385",
    applicantId: "ADM-DEMO-001",
    instituteId: "ins-lumenx-academy",
    status: "draft",
    programId: "prog-lumenx-academy-middle",
    programName: "Middle School",
    grade: "Grade 6",
    academicYear: "2026–27",
    updatedAt: "2026-05-29T08:00:00Z",
    student: {
      name: "Vihaan Mehta",
      gender: "Male",
      dateOfBirth: "2014-01-10",
      nationality: "Indian",
      bloodGroup: "O+",
    },
    parent: {
      fatherName: "Suresh Mehta",
      motherName: "Priya Sharma",
      guardianName: "Suresh Mehta",
      mobile: "+91 98765 43210",
      email: "priya.sharma@example.com",
      occupation: "Doctor",
    },
    address: { address: "", city: "", state: "", country: "India", postalCode: "" },
    academic: { currentSchool: "", currentGrade: "Grade 5", previousResults: "", performance: "" },
    documents: [],
    timeline: [{ id: "t0", status: "draft", label: "Draft saved", at: "2026-05-29T08:00:00Z" }],
  },
];

export const DEMO_NOTIFICATIONS: AdmissionsNotification[] = [
  {
    id: "n1",
    applicantId: "ADM-DEMO-001",
    applicationId: "APP-2401",
    title: "Document resubmission required",
    body: "Parent ID was unclear. Please upload a clearer scan.",
    type: "document",
    read: false,
    createdAt: "2026-05-28T10:00:00Z",
  },
  {
    id: "n2",
    applicantId: "ADM-DEMO-001",
    applicationId: "APP-2398",
    title: "Interview scheduled",
    body: "Ananya's interview is on 5 Jun 2026 at 10:30 AM.",
    type: "interview",
    read: false,
    createdAt: "2026-05-27T16:00:00Z",
  },
  {
    id: "n3",
    applicantId: "ADM-DEMO-001",
    applicationId: "APP-2390",
    title: "Admission approved!",
    body: "Riya Kapoor has been approved for Grade 3.",
    type: "approval",
    read: true,
    createdAt: "2026-05-20T12:00:00Z",
  },
  {
    id: "n4",
    applicantId: "ADM-DEMO-001",
    title: "Applications open for 2026–27",
    body: "Early decision deadline is 15 Apr 2026.",
    type: "general",
    read: true,
    createdAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "n5",
    applicantId: "ADM-DEMO-001",
    applicationId: "APP-2401",
    title: "Application received",
    body: "APP-2401 for Arjun Sharma is under review.",
    type: "application",
    read: true,
    createdAt: "2026-05-22T14:35:00Z",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "f1",
    category: "admissions",
    question: "Do I need an existing LumenX account?",
    answer:
      "No. The Admissions Portal is public. Create a new applicant account with your mobile or email.",
  },
  {
    id: "f2",
    category: "admissions",
    question: "What is the application fee?",
    answer: "₹500 for most programs. Payment link is sent after document verification.",
  },
  {
    id: "f3",
    category: "programs",
    question: "Can I apply to multiple programs?",
    answer: "Yes. Submit separate applications for each child or program.",
  },
  {
    id: "f4",
    category: "programs",
    question: "Which grades are open for 2026–27?",
    answer:
      "All programs from Pre Primary through Degree have limited seats. Check the Programs page for availability.",
  },
  {
    id: "f5",
    category: "fees",
    question: "When are fees due after approval?",
    answer: "Within 7 days of approval letter. Installment plans available on request.",
  },
  {
    id: "f6",
    category: "fees",
    question: "Is the application fee refundable?",
    answer: "Non-refundable except if the institute cancels the program intake.",
  },
  {
    id: "f7",
    category: "documents",
    question: "What format for uploads?",
    answer: "PDF or JPG, max 5 MB per file. Ensure text is readable.",
  },
  {
    id: "f8",
    category: "documents",
    question: "Can I upload documents later?",
    answer: "Yes for drafts. Submitted applications may require resubmission via Document Center.",
  },
  {
    id: "f9",
    category: "interviews",
    question: "Is interview mandatory?",
    answer: "For Grades 9+ and Intermediate streams, yes. Primary admissions may waive interview.",
  },
  {
    id: "f10",
    category: "interviews",
    question: "Can interview be online?",
    answer:
      "Hyderabad-based families attend on campus. Outstation applicants may request video interview.",
  },
  {
    id: "f11",
    category: "process",
    question: "How long until a decision?",
    answer: "Typically 10–15 working days after complete document verification.",
  },
  {
    id: "f12",
    category: "process",
    question: "How do I track my application?",
    answer: "Sign in and open My Applications or Notifications for live updates.",
  },
];

export const WHY_CHOOSE_US = [
  "25+ years of academic excellence",
  "1:18 teacher-student ratio",
  "Integrated Connect portal for enrolled families",
  "Merit scholarships up to 50%",
];

export function nextApplicationId(existing: AdmissionApplication[]): string {
  const nums = existing.map((a) => parseInt(a.id.replace("APP-", ""), 10)).filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 2402;
  return `APP-${next}`;
}

export function buildTimeline(status: ApplicationStatus): TimelineEvent[] {
  return [
    { id: `t-${Date.now()}`, status, label: statusLabel(status), at: new Date().toISOString() },
  ];
}

export { statusLabel };
