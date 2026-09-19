export const PLATFORM_HERO = {
  eyebrow: "Platform",
  title: "One connected platform for your entire institution.",
  lede: "LumenX brings administration, academics, communication, transport, admissions and careers together in one ecosystem.",
} as const;

export const PLATFORM_PRODUCTS = [
  {
    id: "admin" as const,
    name: "Admin",
    role: "Institute operations",
    body: "The office writes people, classes, fees, and day-to-day operations. Everything else reads what Admin allows.",
  },
  {
    id: "connect" as const,
    name: "Connect",
    role: "Families and staff",
    body: "Parents, teachers, and students use the same institute record — each role sees only what they need.",
  },
  {
    id: "transport" as const,
    name: "Transport",
    role: "Drivers and trips",
    body: "A dedicated app for boarding and trip status. Parents follow status in Connect when the module is on.",
  },
  {
    id: "admissions" as const,
    name: "Admissions",
    role: "Intake",
    body: "Applications and openings that become student records in Admin — not a second student database.",
  },
  {
    id: "careers" as const,
    name: "Careers",
    role: "Hiring",
    body: "Jobs and applications in the Careers app. Admin turns an approved hire into a teacher.",
  },
] as const;

export const PLATFORM_CONNECTIONS = [
  {
    title: "One institute record",
    body: "Admin holds the directory. Connect, Transport, Admissions, and Careers work from that shared campus — not five disconnected tools.",
  },
  {
    title: "Role-appropriate surfaces",
    body: "The office stays in Admin. Families and teachers open Connect. Drivers open Transport. Applicants and candidates use Admissions and Careers.",
  },
  {
    title: "Modules when you need them",
    body: "Most campuses start with Admin and Connect. Transport, Admissions, and Careers can be enabled later without buying a separate public product stack.",
  },
] as const;
