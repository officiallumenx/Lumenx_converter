/**
 * Platform entitlement catalogs for Nexus Modules UI.
 *
 * Surfaces:
 * - Admin — module-level on/off (institute ops)
 * - Connect — Teachers / Parents / Students portals (portal-level + module-level)
 * - Careers / Admissions / Transport — whole-app on/off; modules listed for visibility only
 */

export type ConnectPortalId = "teachers" | "parents" | "students";
export type PlatformAppId = "careers" | "admissions" | "transport";

export type EntitlementFeatureDef = {
  id: string;
  label: string;
  description: string;
  /** When false, Nexus UI does not offer a per-module toggle (always on with parent). */
  toggleable?: boolean;
};

export type ConnectPortalDef = {
  id: ConnectPortalId;
  label: string;
  description: string;
  features: EntitlementFeatureDef[];
};

export type PlatformAppDef = {
  id: PlatformAppId;
  label: string;
  description: string;
  /** Feature list for visibility — toggled only at app level. */
  features: EntitlementFeatureDef[];
  /** Mirrors Admin module id when the same capability is managed from Admin. */
  adminModuleId?: string;
};

/** Admin module ids that are controlled as whole apps (not listed under Admin toggles). */
export const ADMIN_MODULES_MOVED_TO_APPS = ["careers", "admissions", "transport"] as const;

export const CONNECT_PORTAL_CATALOG: ConnectPortalDef[] = [
  {
    id: "teachers",
    label: "Teachers",
    description: "Teacher portal in LumenX Connect",
    features: [
      { id: "dashboard", label: "Dashboard", description: "Home overview", toggleable: false },
      { id: "attendance", label: "Attendance", description: "Mark and review class attendance" },
      { id: "diary", label: "Diary Book", description: "Class diary entries" },
      { id: "homework", label: "Homework", description: "Assignments and submissions" },
      { id: "leave", label: "Leave", description: "Leave requests" },
      { id: "marks", label: "Marks", description: "Marks entry" },
      { id: "exams", label: "Exams", description: "Exam schedules and papers" },
      { id: "students", label: "Students", description: "Class student roster" },
      { id: "classes", label: "My Classes", description: "Assigned classes" },
      { id: "remarks", label: "Remarks", description: "Student remarks" },
      { id: "timetable", label: "Timetable", description: "Teaching schedule" },
      { id: "messages", label: "Messages", description: "Messaging" },
      { id: "notifications", label: "Notifications", description: "Alerts and notices" },
      { id: "events", label: "Events", description: "School events" },
      { id: "fees", label: "Fees", description: "Fee visibility" },
      { id: "transport", label: "Transport", description: "Transport for assigned routes" },
      { id: "complaints", label: "Complaints", description: "Complaint handling" },
      { id: "settings", label: "Settings", description: "Profile and preferences", toggleable: false },
    ],
  },
  {
    id: "parents",
    label: "Parents",
    description: "Parent portal in LumenX Connect",
    features: [
      { id: "dashboard", label: "Home", description: "Parent home", toggleable: false },
      { id: "alerts", label: "Alerts", description: "Urgent alerts" },
      { id: "attendance", label: "Attendance", description: "Child attendance" },
      { id: "transport", label: "Transport", description: "Bus tracking and routes" },
      { id: "leave", label: "Leave", description: "Leave on behalf of child" },
      { id: "homework", label: "Homework", description: "Assignments" },
      { id: "marks", label: "Marks", description: "Marks and report cards" },
      { id: "academic-history", label: "Academic History", description: "Past academics" },
      { id: "achievements", label: "Achievements", description: "Awards and milestones" },
      { id: "certificates", label: "Certificates", description: "Issued certificates" },
      { id: "exams", label: "Exams", description: "Exam schedule" },
      { id: "fees", label: "Fees", description: "Fee dues and payments" },
      { id: "messages", label: "Messages", description: "School messaging" },
      { id: "timetable", label: "Timetable", description: "Class timetable" },
      { id: "id-card", label: "ID Card", description: "Digital ID" },
      { id: "notifications", label: "Notifications", description: "Notices" },
      { id: "events", label: "Events", description: "School events" },
      { id: "teachers", label: "Teachers", description: "Teachers directory" },
      { id: "sports", label: "Sports", description: "Sports activity" },
      { id: "complaints", label: "Complaints", description: "Raise complaints" },
      { id: "growth", label: "Growth", description: "Student growth (delegated)" },
      { id: "settings", label: "Settings", description: "Profile and preferences", toggleable: false },
    ],
  },
  {
    id: "students",
    label: "Students",
    description: "Student portal in LumenX Connect",
    features: [
      { id: "dashboard", label: "Home", description: "Student home", toggleable: false },
      { id: "attendance", label: "Attendance", description: "Attendance record" },
      { id: "transport", label: "Transport", description: "Bus and routes" },
      { id: "homework", label: "Homework", description: "Assignments" },
      { id: "marks", label: "Marks", description: "Marks and results" },
      { id: "timetable", label: "Timetable", description: "Class timetable" },
      { id: "exams", label: "Exams", description: "Exam schedule" },
      { id: "alerts", label: "Alerts", description: "Urgent alerts" },
      { id: "notifications", label: "Notifications", description: "Notices" },
      { id: "messages", label: "Messages", description: "Messaging" },
      { id: "academic-history", label: "Academic History", description: "Past academics" },
      { id: "achievements", label: "Achievements", description: "Awards" },
      { id: "growth", label: "Growth", description: "Growth tracking" },
      { id: "events", label: "Events", description: "Events" },
      { id: "fees", label: "Fees", description: "Fee visibility" },
      { id: "sports", label: "Sports", description: "Sports" },
      { id: "teachers", label: "Teachers", description: "Teachers" },
      { id: "certificates", label: "Certificates", description: "Certificates" },
      { id: "id-card", label: "ID Card", description: "Digital ID" },
      { id: "complaints", label: "Complaints", description: "Complaints" },
      { id: "settings", label: "Settings", description: "Profile and preferences", toggleable: false },
    ],
  },
];

export const PLATFORM_APP_CATALOG: PlatformAppDef[] = [
  {
    id: "careers",
    label: "Careers",
    description: "Public careers portal — hiring for the institute",
    adminModuleId: "careers",
    features: [
      { id: "openings", label: "Job openings", description: "Published roles" },
      { id: "apply", label: "Apply", description: "Application flow" },
      { id: "applications", label: "My applications", description: "Applicant status" },
      { id: "profile", label: "Candidate profile", description: "CV and details" },
      { id: "interviews", label: "Interviews", description: "Interview scheduling" },
      { id: "offers", label: "Offers", description: "Offer letters" },
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    description: "Public admissions portal — applications into the institute",
    adminModuleId: "admissions",
    features: [
      { id: "browse", label: "Browse institutes", description: "Discover openings" },
      { id: "apply", label: "Apply", description: "Application wizard" },
      { id: "applications", label: "Applications", description: "Track applications" },
      { id: "documents", label: "Documents", description: "Upload requirements" },
      { id: "waitlist", label: "Waitlist", description: "Seat waitlist" },
      { id: "notifications", label: "Notifications", description: "Admission notices" },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    description: "Driver Transport app — fleet operations",
    adminModuleId: "transport",
    features: [
      { id: "trips", label: "Trips", description: "Today’s trips" },
      { id: "students", label: "Students on route", description: "Boarding roster" },
      { id: "route", label: "Route", description: "Stops and path" },
      { id: "attendance", label: "Boarding attendance", description: "Pick-up / drop" },
      { id: "alerts", label: "Alerts", description: "Route alerts" },
      { id: "profile", label: "Driver profile", description: "Account settings" },
    ],
  },
];

export function connectPortalDef(id: ConnectPortalId): ConnectPortalDef {
  return CONNECT_PORTAL_CATALOG.find((p) => p.id === id)!;
}

export function platformAppDef(id: PlatformAppId): PlatformAppDef {
  return PLATFORM_APP_CATALOG.find((a) => a.id === id)!;
}

export function defaultConnectPortalModules(portalId: ConnectPortalId): Record<string, boolean> {
  const portal = connectPortalDef(portalId);
  return Object.fromEntries(portal.features.map((f) => [f.id, true]));
}

export function defaultConnectEntitlements(): Record<
  ConnectPortalId,
  { enabled: boolean; modules: Record<string, boolean> }
> {
  return {
    teachers: { enabled: true, modules: defaultConnectPortalModules("teachers") },
    parents: { enabled: true, modules: defaultConnectPortalModules("parents") },
    students: { enabled: true, modules: defaultConnectPortalModules("students") },
  };
}

export function defaultAppEntitlements(): Record<PlatformAppId, { enabled: boolean }> {
  return {
    careers: { enabled: true },
    admissions: { enabled: true },
    transport: { enabled: true },
  };
}
