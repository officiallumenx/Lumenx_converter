export const ABOUT_HERO = {
  eyebrow: "About LumenX",
  title: "One connected platform for managing your entire institution.",
  lede: "LumenX exists because institutes should not run the campus day across disconnected spreadsheets, chat groups, and side apps.",
} as const;

export const ABOUT_WHY = {
  title: "Why LumenX exists",
  body: "Schools and colleges already do the hard work of teaching and caring for students. The software around that work is often fragmented — one tool for attendance, another for fees, another for the bus, and inboxes for admissions and hiring. LumenX is built so the institute record is shared, and each role gets the right surface.",
} as const;

export const ABOUT_PROBLEM = {
  title: "The problem with fragmented institute management",
  points: [
    "The office retypes the same people data into multiple places.",
    "Families call for attendance, fees, and bus updates that should be visible in one account.",
    "Drivers run trips from paper manifests or chat threads.",
    "Applications and hiring sit in email until someone creates a student or teacher record by hand.",
  ],
} as const;

export const ABOUT_APPROACH = {
  title: "Our approach",
  body: "Admin writes the source of truth. Connect is how parents, teachers, and students use that record. Transport, Admissions, and Careers turn on when the campus needs them — still part of the same platform, not a pile of unrelated products.",
} as const;

export const ABOUT_BUILDING = [
  { id: "admin", name: "Admin", body: "Institute operations console for people, classes, fees, and the campus day." },
  { id: "connect", name: "Connect", body: "Parent, teacher, and student portal with strict role isolation." },
  { id: "transport", name: "Transport", body: "Driver app for routes, boarding, and trip status." },
  { id: "admissions", name: "Admissions", body: "Applications and intake that become student records in Admin." },
  { id: "careers", name: "Careers", body: "Hiring that can become a teacher record in Admin." },
] as const;

export const ABOUT_PRINCIPLES = [
  { title: "Simple", body: "Clear language and role-appropriate screens — not another ERP maze." },
  { title: "Connected", body: "One institute record across Admin, Connect, and the modules you enable." },
  { title: "Transparent", body: "Honest pricing, honest demos, and no invented store links or metrics." },
  { title: "Scalable", body: "From a single campus to a group — modules on when you need them." },
  { title: "Secure", body: "Role-based access and institute-controlled credentials — not passwords published on this website." },
] as const;
