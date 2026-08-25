import type { ProductId } from "@/theme/products";

/** Short related actions shown when hovering / focusing an orbit product. */
export const ORBIT_ACTIONS: Record<
  ProductId,
  { headline: string; actions: readonly string[] }
> = {
  admin: {
    headline: "What the office does in Admin",
    actions: [
      "Manage students, teachers, and parents",
      "Run attendance, timetable, and exams",
      "Publish fees and follow dues",
      "Send announcements and handle complaints",
    ],
  },
  connect: {
    headline: "What families and staff do in Connect",
    actions: [
      "Parents check attendance, fees, and messages",
      "Teachers mark class and assign homework",
      "Students see timetable, marks, and ID",
      "Everyone stays on their own role — never mixed",
    ],
  },
  transport: {
    headline: "What Transport runs on the road",
    actions: [
      "Drivers board students stop by stop",
      "Track today’s trip and delays",
      "Raise an emergency when needed",
      "Parents see trip status in Connect",
    ],
  },
  admissions: {
    headline: "What Admissions handles for intake",
    actions: [
      "Browse institutes and programs",
      "Submit and track applications",
      "Upload documents for review",
      "Convert accepted intake to a student in Admin",
    ],
  },
  careers: {
    headline: "What Careers handles for hiring",
    actions: [
      "Post and browse open roles",
      "Apply and track applications",
      "Schedule interviews with candidates",
      "Convert a hire to a teacher in Admin",
    ],
  },
  nexus: {
    headline: "What Nexus does for service quality",
    actions: [
      "License institutes and start trials",
      "Turn modules on per campus",
      "Handle support and institute feedback",
      "Watch renewals and platform health",
    ],
  },
};
