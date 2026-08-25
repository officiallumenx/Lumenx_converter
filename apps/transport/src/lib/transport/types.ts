import type { ThemeMode } from "@/theme";

/**
 * Driver Transport domain types.
 * Shared across features; repositories will swap mock → API without UI changes.
 */

export type { ThemeMode };

export type DriverProfile = {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
  licenseNumber: string;
  busNumber: string;
  photoUrl?: string;
};

export type BusAssignment = {
  /** Admin vehicle id (e.g. VH-01) — used for enrollment sync */
  vehicleId: string;
  /** Display bus number (e.g. BUS-01) — no number plate */
  busNumber: string;
  /** Legacy field; same as busNumber in demo (do not show as plate) */
  vehicleNumber: string;
  label: string;
  capacity: number;
};

export type RouteStop = {
  id: string;
  name: string;
  sequence: number;
};

export type RouteAssignment = {
  code: string;
  name: string;
  /** Admin route id for sync (e.g. RT-01) */
  adminRouteId: string;
  stops: RouteStop[];
};

export type TripAssignment = {
  driver: DriverProfile;
  bus: BusAssignment;
  route: RouteAssignment;
  /** Assigned student count for the shift (may exceed in-app roster sample). */
  totalStudents: number;
};

export type RosterStudent = {
  id: string;
  name: string;
  grade: string;
  stopName: string;
  /** Enrollment stop id when assigned */
  stopId?: string;
  rollNo: string;
};

export type BoardingStatus = "pending" | "boarded" | "not_boarded";
export type DroppingStatus = "pending" | "dropped" | "not_dropped";

export type AttendanceStudentState = RosterStudent & {
  boarding: BoardingStatus;
  dropping: DroppingStatus;
  boardedAt: string | null;
  droppedAt: string | null;
};

export type TransportNotificationKind = "route" | "school" | "reminder" | "urgent";

export type TransportNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  kind: TransportNotificationKind;
  unread: boolean;
  /** Deep link into the Transport app (e.g. /attendance, /emergency). */
  href?: string;
};

export type NotificationPrefs = {
  location: boolean;
  push: boolean;
  routeUpdates: boolean;
  attendanceAlerts: boolean;
};

export type TransportManager = {
  name: string;
  phone: string;
  role: string;
};

export type SupportFaq = {
  id: string;
  question: string;
  answer: string;
};

export type SupportContent = {
  manager: TransportManager;
  helpCenter: {
    title: string;
    summary: string;
    topics: string[];
  };
  faqs: SupportFaq[];
  privacyPolicy: string;
  terms: string;
};
