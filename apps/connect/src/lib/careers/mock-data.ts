import type {
  CareersNotification,
  CareersUser,
  FaqItem,
  JobApplication,
  ApplicationDocument,
  TimelineEvent,
} from "./types";

export const CAREERS_CONTACT = {
  phone: "+91 40 4455 8899",
  email: "careers@lumenx.edu",
  officeHours: "Mon–Fri, 9:00 AM – 6:00 PM",
  address: "HR Office, Green Park Campus, Hyderabad — 500032",
};

export const CAREERS_HERO = {
  title: "Find your next role",
  subtitle:
    "Search jobs across companies and industries — apply in one click with your profile and track every application.",
  cta: "Browse jobs",
};

export const WHY_WORK = [
  {
    title: "One profile, many applications",
    desc: "Apply faster with a saved profile — skip repetitive forms on every job.",
  },
  {
    title: "Roles across industries",
    desc: "IT, HR, sales, finance, healthcare, education, and more on one board.",
  },
  {
    title: "Smart matching",
    desc: "Get recommended roles based on skills, location, and experience.",
  },
  {
    title: "Transparent process",
    desc: "Track applications, interviews, and recruiter updates in real time.",
  },
];

export const CULTURE_VALUES = [
  "Verified employers",
  "Quick apply",
  "Application tracking",
  "Privacy-first profiles",
];

export const BENEFITS = [
  "Health insurance for employee + dependents",
  "Paid leave and festival holidays",
  "Retirement benefits (PF / gratuity where applicable)",
  "On-campus childcare assistance (select campuses)",
  "Skill upgrade sponsorship",
  "Performance bonuses",
];

export const TESTIMONIALS = [
  {
    name: "Rajesh Kumar",
    role: "Math Teacher, LumenX Academy",
    quote: "The hiring process was clear — I knew exactly where I stood at every step.",
  },
  {
    name: "Meera Patel",
    role: "Lab Instructor, Fergusson College",
    quote: "Applied from my phone during lunch break. Got interview details the same week.",
  },
  {
    name: "Arjun Singh",
    role: "Sports Coach, Delhi Riverside",
    quote: "Loved being able to compare roles across institutes before choosing.",
  },
];

export const HIRING_PROCESS = [
  { step: 1, title: "Browse & save jobs", desc: "Filter by institute, city, and role category." },
  {
    step: 2,
    title: "Create candidate profile",
    desc: "Sign up with mobile or email — no institute account needed.",
  },
  { step: 3, title: "Apply online", desc: "Complete the 6-step application and upload documents." },
  { step: 4, title: "Track & interview", desc: "Follow status updates and schedule interviews." },
];

export const DEMO_CANDIDATE: CareersUser = {
  id: "CAR-DEMO-001",
  name: "Priya Nair",
  email: "priya.candidate@example.com",
  phone: "+91 98765 43211",
  passwordHash: "demo123",
  accountType: "job_seeker",
  profileComplete: 90,
  emailVerified: true,
  phoneVerified: true,
  createdAt: "2026-03-15T10:00:00Z",
};

export const DEMO_RECRUITER: CareersUser = {
  id: "CAR-DEMO-REC-001",
  name: "Kavitha Reddy",
  email: "hr@lumenx.edu",
  phone: "+91 98765 40001",
  passwordHash: "demo123",
  accountType: "recruiter",
  organizationId: "ins-lumenx-academy",
  organizationName: "LumenX Academy",
  organizationType: "education",
  profileComplete: 100,
  emailVerified: true,
  phoneVerified: true,
  createdAt: "2026-02-01T09:00:00Z",
};

const defaultDocs = (): ApplicationDocument[] => [
  {
    id: "cd-resume",
    type: "resume",
    label: "Resume / CV",
    status: "verified",
    fileName: "priya_nair_cv.pdf",
    uploadedAt: "2026-04-10",
  },
  {
    id: "cd-cert",
    type: "certificates",
    label: "Certificates",
    status: "verified",
    fileName: "degrees.pdf",
    uploadedAt: "2026-04-10",
  },
  {
    id: "cd-exp",
    type: "experience_letters",
    label: "Experience Letters",
    status: "under_review",
    fileName: "experience.pdf",
    uploadedAt: "2026-04-11",
  },
  {
    id: "cd-id",
    type: "identity_proof",
    label: "Identity Proof",
    status: "verified",
    fileName: "aadhar.pdf",
    uploadedAt: "2026-04-10",
  },
  {
    id: "cd-photo",
    type: "profile_photo",
    label: "Profile Photo",
    status: "verified",
    fileName: "photo.jpg",
    uploadedAt: "2026-04-10",
  },
];

function timeline(events: Omit<TimelineEvent, "id">[]): TimelineEvent[] {
  return events.map((e, i) => ({ ...e, id: `tl-${i}` }));
}

export const DEMO_APPLICATIONS: JobApplication[] = [
  {
    id: "CAPP-2401",
    candidateId: DEMO_CANDIDATE.id,
    jobId: "job-english-faculty",
    jobTitle: "English Faculty",
    instituteId: "ins-st-xavier-jc",
    instituteName: "St. Xavier Junior College",
    status: "submitted",
    submittedAt: "2026-04-12T14:00:00Z",
    updatedAt: "2026-04-12T14:00:00Z",
    personal: {
      name: "Priya Nair",
      gender: "Female",
      dateOfBirth: "1990-08-15",
      mobile: "+91 98765 43211",
      email: "priya.candidate@example.com",
    },
    address: {
      address: "12 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400001",
    },
    professional: {
      highestQualification: "M.A English",
      experienceYears: "6",
      currentEmployer: "City High School",
      currentRole: "Senior English Teacher",
      expectedSalary: "₹8–10 LPA",
      noticePeriod: "60 days",
    },
    skills: {
      teachingSubjects: "English Literature, Language",
      sportsSpecialization: "",
      labSpecialization: "",
      technicalSkills: "Google Classroom, LMS",
      languagesKnown: "English, Hindi, Malayalam",
    },
    documents: defaultDocs().map((d) => ({
      ...d,
      status: d.type === "experience_letters" ? "under_review" : d.status,
    })),
    timeline: timeline([
      { status: "draft", label: "Draft saved", at: "2026-04-11T10:00:00Z" },
      {
        status: "submitted",
        label: "Application submitted",
        at: "2026-04-12T14:00:00Z",
        note: "Awaiting HR review.",
      },
    ]),
    hrNotes: ["Application received. Academic credentials look strong."],
  },
  {
    id: "CAPP-2402",
    candidateId: DEMO_CANDIDATE.id,
    jobId: "job-math-teacher",
    instituteId: "ins-lumenx-academy",
    jobTitle: "Senior Mathematics Teacher",
    instituteName: "LumenX Academy",
    status: "demo_class",
    submittedAt: "2026-04-05T11:00:00Z",
    updatedAt: "2026-04-18T09:00:00Z",
    personal: {
      name: "Priya Nair",
      gender: "Female",
      dateOfBirth: "1990-08-15",
      mobile: "+91 98765 43211",
      email: "priya.candidate@example.com",
    },
    address: {
      address: "12 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400001",
    },
    professional: {
      highestQualification: "M.Sc Mathematics",
      experienceYears: "7",
      currentEmployer: "City High School",
      currentRole: "Math Teacher",
      expectedSalary: "₹9–11 LPA",
      noticePeriod: "45 days",
    },
    skills: {
      teachingSubjects: "Mathematics, Statistics",
      sportsSpecialization: "",
      labSpecialization: "",
      technicalSkills: "GeoGebra, Excel",
      languagesKnown: "English, Hindi",
    },
    documents: defaultDocs(),
    timeline: timeline([
      { status: "submitted", label: "Application submitted", at: "2026-04-05T11:00:00Z" },
      { status: "under_review", label: "Under HR review", at: "2026-04-08T10:00:00Z" },
      { status: "shortlisted", label: "Shortlisted", at: "2026-04-14T15:00:00Z" },
      { status: "assessment", label: "Assessment completed", at: "2026-04-16T11:00:00Z" },
      {
        status: "demo_class",
        label: "Demo class scheduled",
        at: "2026-04-18T09:00:00Z",
        note: "Upload demo video or attend live session.",
      },
    ]),
    demoClass: {
      scheduledAt: "2026-05-20T10:00:00Z",
      videoFileName: "quadratic_equations_demo.mp4",
      evaluationStatus: "under_review",
      feedback: "Demo lesson on quadratic equations received.",
      evaluatorNote: "Clear explanation; awaiting HOD review.",
    },
    interview: {
      date: "2026-05-28",
      time: "10:30 AM",
      mode: "video",
      location: "Google Meet — link sent via email",
      instructions: "Prepare a 10-minute demo lesson on quadratic equations. Keep resume handy.",
      status: "scheduled",
    },
    hrNotes: ["Strong math background.", "Demo lesson scheduled with HOD."],
  },
  {
    id: "CAPP-2403",
    candidateId: DEMO_CANDIDATE.id,
    jobId: "job-sports-coach",
    instituteId: "ins-delhi-riverside",
    jobTitle: "Sports Coach — Cricket & Athletics",
    instituteName: "Delhi Riverside School",
    status: "offer_accepted",
    submittedAt: "2026-03-20T09:00:00Z",
    updatedAt: "2026-04-22T16:00:00Z",
    personal: {
      name: "Priya Nair",
      gender: "Female",
      dateOfBirth: "1990-08-15",
      mobile: "+91 98765 43211",
      email: "priya.candidate@example.com",
    },
    address: {
      address: "12 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400001",
    },
    professional: {
      highestQualification: "B.P.Ed",
      experienceYears: "5",
      currentEmployer: "Sports Academy Pune",
      currentRole: "Assistant Coach",
      expectedSalary: "₹6–7 LPA",
      noticePeriod: "30 days",
    },
    skills: {
      teachingSubjects: "",
      sportsSpecialization: "Cricket, Athletics",
      labSpecialization: "",
      technicalSkills: "Fitness tracking apps",
      languagesKnown: "English, Hindi",
    },
    documents: defaultDocs().map((d) => ({ ...d, status: "verified" as const })),
    timeline: timeline([
      { status: "submitted", label: "Application submitted", at: "2026-03-20T09:00:00Z" },
      { status: "under_review", label: "Under review", at: "2026-03-25T10:00:00Z" },
      { status: "shortlisted", label: "Shortlisted", at: "2026-04-01T11:00:00Z" },
      { status: "interview_scheduled", label: "Interview completed", at: "2026-04-10T14:00:00Z" },
      { status: "offer_sent", label: "Offer extended", at: "2026-04-20T14:00:00Z" },
      {
        status: "offer_accepted",
        label: "Offer accepted",
        at: "2026-04-22T16:00:00Z",
        note: "Joining date: 1 Jun 2026",
      },
    ]),
    interview: {
      date: "2026-04-10",
      time: "2:00 PM",
      mode: "in_person",
      location: "Riverside Campus Sports Complex, New Delhi",
      instructions: "Bring coaching certifications and ID proof.",
      status: "completed",
    },
    hrNotes: [
      "Excellent track record with youth teams.",
      "Offer letter sent — awaiting acceptance.",
    ],
  },
];

export const DEMO_NOTIFICATIONS: CareersNotification[] = [
  {
    id: "cn-1",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2402",
    title: "Shortlisted",
    body: "You have been shortlisted for Senior Mathematics Teacher at LumenX Academy.",
    type: "application",
    read: true,
    createdAt: "2026-04-14T15:00:00Z",
  },
  {
    id: "cn-2",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2402",
    title: "Interview scheduled",
    body: "Video interview on 28 May 2026 at 10:30 AM. Check application details.",
    type: "interview",
    read: false,
    createdAt: "2026-04-18T09:00:00Z",
  },
  {
    id: "cn-2b",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2402",
    title: "Shortlisted",
    body: "You have been shortlisted for Senior Mathematics Teacher.",
    type: "shortlisted",
    read: true,
    createdAt: "2026-04-14T15:00:00Z",
  },
  {
    id: "cn-3",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2403",
    title: "Offer accepted",
    body: "You accepted the offer for Sports Coach at Delhi Riverside School.",
    type: "offer",
    read: false,
    createdAt: "2026-04-22T16:00:00Z",
  },
  {
    id: "cn-4",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2401",
    title: "Application received",
    body: "Your application for English Literature Faculty has been submitted.",
    type: "application",
    read: true,
    createdAt: "2026-04-12T14:00:00Z",
  },
  {
    id: "cn-5",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2401",
    title: "Document under review",
    body: "Experience letters are being verified.",
    type: "document",
    read: false,
    createdAt: "2026-04-13T10:00:00Z",
  },
  {
    id: "cn-6",
    candidateId: DEMO_CANDIDATE.id,
    title: "New jobs posted",
    body: "3 new faculty roles in Hyderabad this week.",
    type: "general",
    read: true,
    createdAt: "2026-04-20T08:00:00Z",
  },
  {
    id: "cn-7",
    candidateId: DEMO_CANDIDATE.id,
    applicationId: "CAPP-2402",
    title: "Interview reminder",
    body: "Your interview is in 3 days. Review demo lesson guidelines.",
    type: "interview",
    read: false,
    createdAt: "2026-05-25T09:00:00Z",
  },
  {
    id: "cn-8",
    candidateId: DEMO_CANDIDATE.id,
    title: "Profile tip",
    body: "Complete your profile to improve application visibility.",
    type: "general",
    read: true,
    createdAt: "2026-04-01T12:00:00Z",
  },
];

export const CAREERS_FAQS: FaqItem[] = [
  {
    id: "f1",
    category: "jobs",
    question: "How do I search for jobs?",
    answer:
      "Use Open Positions to filter by institute, city, state, category, and employment type.",
  },
  {
    id: "f2",
    category: "jobs",
    question: "Can I apply to multiple institutes?",
    answer: "Yes. Each application is independent — apply to as many roles as you qualify for.",
  },
  {
    id: "f3",
    category: "jobs",
    question: "What is the application deadline?",
    answer: "Each job listing shows its deadline. Apply before that date to be considered.",
  },
  {
    id: "f4",
    category: "applications",
    question: "Can I edit after submitting?",
    answer:
      "Submitted applications cannot be edited. Contact Careers support from Settings with your application ID for urgent corrections.",
  },
  {
    id: "f5",
    category: "applications",
    question: "How long does review take?",
    answer:
      "Typically 5–10 business days. Status updates appear in My Applications and Notifications.",
  },
  {
    id: "f6",
    category: "applications",
    question: "What does 'on hold' mean?",
    answer:
      "The role may be paused or your application is deferred. HR will notify you when there is an update.",
  },
  {
    id: "f7",
    category: "interviews",
    question: "What interview modes are supported?",
    answer:
      "In-person, phone, and video interviews. Details appear on your application and Interviews page.",
  },
  {
    id: "f8",
    category: "interviews",
    question: "Can I reschedule an interview?",
    answer: "Reply to the interview email or contact Careers support with your application ID.",
  },
  {
    id: "f9",
    category: "interviews",
    question: "What should I bring to in-person interviews?",
    answer:
      "Original ID, certificates, resume copies, and any role-specific materials mentioned in instructions.",
  },
  {
    id: "f10",
    category: "documents",
    question: "Which documents are required?",
    answer:
      "Resume, certificates, experience letters, identity proof, and profile photo. Additional docs may be requested.",
  },
  {
    id: "f11",
    category: "documents",
    question: "What file formats are accepted?",
    answer: "PDF for documents, JPG/PNG for photos. Max 5 MB per file in this demo.",
  },
  {
    id: "f12",
    category: "documents",
    question: "Why was my document rejected?",
    answer: "Check the note on the document card. Re-upload a clearer copy from Document Center.",
  },
  {
    id: "f13",
    category: "process",
    question: "Do I need an institute login?",
    answer: "No. Careers Portal uses a separate candidate account — sign up with mobile or email.",
  },
  {
    id: "f14",
    category: "process",
    question: "Is there an application fee?",
    answer: "No fee for applying through LumenX Careers in this demo environment.",
  },
  {
    id: "f15",
    category: "process",
    question: "How do I withdraw an application?",
    answer:
      "Contact Careers support from Settings with your application ID. Withdrawal is processed within 2 business days.",
  },
  {
    id: "f16",
    category: "benefits",
    question: "When are benefits discussed?",
    answer: "During the offer stage after selection. Varies by institute and role level.",
  },
  {
    id: "f17",
    category: "benefits",
    question: "Is relocation assistance available?",
    answer: "Some institutes offer relocation for out-of-city hires. Ask HR during interview.",
  },
  {
    id: "f18",
    category: "employment",
    question: "What is the notice period policy?",
    answer: "Notice period is negotiated per role. Typically 30–60 days for faculty positions.",
  },
  {
    id: "f19",
    category: "employment",
    question: "Are background checks required?",
    answer: "Yes. Identity and employment verification are standard before offer release.",
  },
  {
    id: "f20",
    category: "employment",
    question: "What is a demo class?",
    answer:
      "Academic roles may require a recorded or live demo lesson. Upload video or attend a scheduled session.",
  },
];

export function nextApplicationId(): string {
  return `CAPP-${Date.now().toString(36).toUpperCase()}`;
}

export function buildApplicationTimeline(
  status: JobApplication["status"],
  submittedAt: string,
): TimelineEvent[] {
  return [{ id: "tl-0", status, label: status.replace(/_/g, " "), at: submittedAt }];
}
