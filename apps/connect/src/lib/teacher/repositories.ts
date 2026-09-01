import { isApiAuthMode } from "@/auth/auth-mode";
import {
  getAllTeacherStudentsFromCache,
  getTeacherClassesFromCache,
  getTeacherStudentsForSection,
} from "@/lib/teacher-classes";
import { notifyDirectMessage } from "@lumenx/module-notifications";
import {
  notifyHomeworkAssigned,
  notifyHomeworkDuePassed,
  notifyHomeworkNotSubmitted,
  notifyHomeworkReminder,
  notifyHomeworkSubmitted,
  notifyAdminResultsReady,
  notifyTeacherMarksPublishPending,
  listPhase7Inbox,
  listPhase8Inbox,
} from "@lumenx/module-notifications";
import { parentNotificationStore } from "@/lib/parent/notification-store";
import { studentNotificationStore } from "@/lib/student/notification-store";
import {
  teacherAssignments,
  teacherAssignmentSubmissions,
  teacherClasses,
  teacherComplaints,
  teacherEvents,
  teacherExams,
  teacherMessages,
  teacherColleagues,
  teacherNotifications,
  teacherProfile,
  teacherSelfAttendanceSeed,
  instituteStudents,
  teacherStudents,
  getInstituteClassNames,
  getInstituteSections,
  getDashboardSnapshot,
  getHomeworkAttendance,
  getHomeworkClassSummaries,
  getMarkEntries,
  getStudentDetail,
  getStudentsByClass,
  teacherTimetableSlots,
  getClassTimetable,
  getClassTimetableForDay,
  getTodayDayName,
  dashboardAnnouncements,
  teacherClassFees,
} from "./mock-data";
import { filterSubjectPortalNotifications } from "./portal-scope";
import { assertTeacherCanGrade, assertTeacherCanWrite } from "./portal-access-guard";
import {
  PRINCIPAL_ATTENDANCE_ALERTS_KEY,
  PRINCIPAL_MARK_ALERTS_KEY,
  pendingCountForTeacherInAlert,
  pendingCountForTeacherInAttendanceAlert,
  principalAttendanceAlertsForTeacher,
  principalMarkAlertsForTeacher,
  pushHomeworkActivityLog,
  removeTeacherFromPrincipalAttendanceAlerts,
} from "@lumenx/utils";
import {
  attachmentFromSimpleUpload,
  upsertAssignmentDetailExtra,
  upsertStudentAssignmentOverlay,
} from "@/lib/assignment-details";
import {
  saveSlotAttendance,
  getSlotAttendance,
  buildTeacherReportCards,
  buildAttendanceHistoryReport,
  notifyFromAttendanceSubmit,
  listRegistersForSection,
  sectionHasSubmittedAttendance,
  applyLeaveApprovalToRegisters,
  periodsFromTimetableSlots,
  toAttendanceStudentId,
  type AttendanceActor,
  type AttendanceWorkflow,
  type AttendanceSlotRegister,
} from "@lumenx/module-attendance";
import { attendanceSectionKey } from "@/lib/attendance/section-key";
import {
  attendanceStudentIdsToLocalIds,
  localIdsToAttendanceStudentIds,
} from "@/lib/attendance/student-id-map";
import { INSTITUTE_HOLIDAYS } from "@/lib/attendance/calendar";
import type {
  AssignmentSubmission,
  AttendanceRecord,
  AttendanceReport,
  ComplaintStatus,
  DashboardSnapshot,
  HomeworkAttendanceRow,
  HomeworkClassSummary,
  MarkEntry,
  MarkStatus,
  PublishStatus,
  RemarkType,
  StudentDetail,
  StudentRemark,
  TeacherAssignment,
  TeacherClass,
  TeacherComplaint,
  TeacherEvent,
  TeacherExam,
  TeacherMessage,
  TeacherMessageTarget,
  TeacherNotification,
  TeacherPreferences,
  TeacherProfile,
  TeacherSelfAttendanceRecord,
  TeacherLeaveRequest,
  TeacherStudent,
  TimetableSlot,
} from "./types";
import type { TeacherFeeRecord } from "./mock-data";
import type { LeaveRequest } from "@lumenx/types";
import { enumerateLeaveDates, toLocalIsoDate } from "@/lib/leave-utils";

type Listener = () => void;

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

let profileStore: TeacherProfile = { ...teacherProfile };
let preferencesStore: TeacherPreferences = {
  push: true,
  email: true,
  sms: false,
  examAlerts: true,
  attendanceAlerts: true,
  messageAlerts: true,
  eventAlerts: true,
};
let remarksStore: StudentRemark[] = [];
let notificationsStore = [...teacherNotifications];
const notificationListeners = new Set<Listener>();
/** Cached filter result — useSyncExternalStore requires a stable reference between mutations. */
let subjectNotificationsSnapshot = filterSubjectPortalNotifications(notificationsStore);
const ingestedPrincipalMarkAlertIds = new Set<string>();
const ingestedPrincipalAttendanceAlertIds = new Set<string>();
const ingestedPhase7Ids = new Set<string>();

function notifyNotifications() {
  subjectNotificationsSnapshot = filterSubjectPortalNotifications(notificationsStore);
  notificationListeners.forEach((l) => l());
}

function currentSessionTeacherId(): string | null {
  try {
    const raw = localStorage.getItem("lumenx-teacher-session");
    if (raw) {
      const parsed = JSON.parse(raw) as { teacherId?: string };
      return parsed.teacherId ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Pull principal “submit marks” alerts for this teacher into the Connect inbox. */
function ingestPrincipalMarkAlerts(): boolean {
  if (typeof localStorage === "undefined") return false;
  const sessionTeacherId = currentSessionTeacherId();

  const byProfile = principalMarkAlertsForTeacher(teacherProfile.id, teacherProfile.name);
  const bySession = sessionTeacherId
    ? principalMarkAlertsForTeacher(sessionTeacherId, null)
    : [];
  const alerts = [...byProfile];
  for (const a of bySession) {
    if (!alerts.some((x) => x.id === a.id)) alerts.push(a);
  }

  let added = false;
  for (const alert of alerts) {
    const notifId = `principal-marks-${alert.id}`;
    if (ingestedPrincipalMarkAlertIds.has(notifId)) continue;
    if (notificationsStore.some((n) => n.id === notifId)) {
      ingestedPrincipalMarkAlertIds.add(notifId);
      continue;
    }
    const pending = Math.max(
      pendingCountForTeacherInAlert(alert, teacherProfile.id, teacherProfile.name),
      pendingCountForTeacherInAlert(alert, sessionTeacherId, null),
    );
    const detail =
      pending > 0
        ? ` You currently have ${pending} pending mark paper${pending === 1 ? "" : "s"} to update and submit.`
        : "";
    notificationsStore = [
      {
        id: notifId,
        title: alert.title,
        body: `${alert.body}${detail}`,
        category: "urgent",
        time: "Just now",
        unread: true,
        portalScope: "subject",
      },
      ...notificationsStore,
    ];
    ingestedPrincipalMarkAlertIds.add(notifId);
    added = true;
  }
  return added;
}

/** Pull principal attendance-pending alerts for this teacher. */
function ingestPrincipalAttendanceAlerts(): boolean {
  if (typeof localStorage === "undefined") return false;
  const sessionTeacherId = currentSessionTeacherId();

  const byProfile = principalAttendanceAlertsForTeacher(teacherProfile.id, teacherProfile.name);
  const bySession = sessionTeacherId
    ? principalAttendanceAlertsForTeacher(sessionTeacherId, null)
    : [];
  const alerts = [...byProfile];
  for (const a of bySession) {
    if (!alerts.some((x) => x.id === a.id)) alerts.push(a);
  }

  const activeIds = new Set(alerts.map((a) => `principal-attendance-${a.id}`));
  let changed = false;

  // Drop inbox rows that are no longer in the alert store (cleared on submit).
  const before = notificationsStore.length;
  notificationsStore = notificationsStore.filter(
    (n) => !n.id.startsWith("principal-attendance-") || activeIds.has(n.id),
  );
  if (notificationsStore.length !== before) changed = true;

  for (const alert of alerts) {
    const notifId = `principal-attendance-${alert.id}`;
    if (ingestedPrincipalAttendanceAlertIds.has(notifId)) continue;
    if (notificationsStore.some((n) => n.id === notifId)) {
      ingestedPrincipalAttendanceAlertIds.add(notifId);
      continue;
    }
    const pending = Math.max(
      pendingCountForTeacherInAttendanceAlert(alert, teacherProfile.id, teacherProfile.name),
      pendingCountForTeacherInAttendanceAlert(alert, sessionTeacherId, null),
    );
    notificationsStore = [
      {
        id: notifId,
        title: alert.title,
        body:
          pending > 0
            ? `${alert.body} (${pending} class${pending === 1 ? "" : "es"} still waiting).`
            : alert.body,
        category: "urgent",
        time: "Just now",
        unread: true,
        portalScope: "subject",
        href: alert.href ?? "/attendance",
      },
      ...notificationsStore,
    ];
    ingestedPrincipalAttendanceAlertIds.add(notifId);
    changed = true;
  }
  return changed;
}

function ingestPhase7TeacherInbox(): boolean {
  if (typeof localStorage === "undefined") return false;
  let added = false;
  for (const row of [...listPhase7Inbox("teacher"), ...listPhase8Inbox("teacher")]) {
    if (ingestedPhase7Ids.has(row.id)) continue;
    if (notificationsStore.some((n) => n.id === row.id)) {
      ingestedPhase7Ids.add(row.id);
      continue;
    }
    const category =
      row.module === "announcements" || row.category === "circulars"
        ? ("announcements" as const)
        : row.category === "exams"
          ? ("exam_updates" as const)
          : row.category === "events"
            ? ("events" as const)
            : ("staff_notices" as const);
    notificationsStore = [
      {
        id: row.id,
        title: row.title,
        body: row.desc,
        category,
        time: row.time,
        unread: row.unread !== false,
        portalScope: "subject",
        href: row.href,
      },
      ...notificationsStore,
    ];
    ingestedPhase7Ids.add(row.id);
    added = true;
  }
  return added;
}

function ensurePrincipalMarkAlertsIngested() {
  if (ingestPrincipalMarkAlerts()) notifyNotifications();
}

function ensurePrincipalAttendanceAlertsIngested() {
  if (ingestPrincipalAttendanceAlerts()) notifyNotifications();
}

function ensurePrincipalAlertsIngested() {
  const a = ingestPrincipalMarkAlerts();
  const b = ingestPrincipalAttendanceAlerts();
  const c = ingestPhase7TeacherInbox();
  if (a || b || c) notifyNotifications();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (
      e.key === PRINCIPAL_MARK_ALERTS_KEY ||
      e.key === PRINCIPAL_ATTENDANCE_ALERTS_KEY ||
      e.key === null
    ) {
      ensurePrincipalAlertsIngested();
    }
  });
  listenDemoSync("announcements", () => {
    if (ingestPhase7TeacherInbox()) notifyNotifications();
  });
}

let complaintsStore = [...teacherComplaints];
let examsStore = [...teacherExams];
let eventsStore = [...teacherEvents];
let messagesStore = [...teacherMessages];
let assignmentsStore = teacherAssignments.map((a) => ({ ...a }));
let submissionsStore = teacherAssignmentSubmissions.map((s) => ({ ...s }));
const markEntriesCache: Record<string, MarkEntry[]> = {};
const teacherSelfAttendanceStore: TeacherSelfAttendanceRecord[] = [...teacherSelfAttendanceSeed];

function rosterRefsForClass(classId: string) {
  return getStudentsByClass(classId).map((s) => ({
    id: s.id,
    roll: s.roll,
    className: s.className,
    section: s.section,
  }));
}

function registerToAttendanceRecord(
  classId: string,
  reg: AttendanceSlotRegister,
): AttendanceRecord {
  const roster = rosterRefsForClass(classId);
  return {
    classId,
    date: reg.date,
    absentIds: attendanceStudentIdsToLocalIds(reg.absentIds, roster),
    leaveIds: attendanceStudentIdsToLocalIds(reg.leaveIds, roster),
    status: reg.status,
    slotId: reg.slotId,
    slotLabel: reg.slotLabel,
    method: reg.method,
    configVersionId: reg.configVersionId,
  };
}

function isClassAttendanceSubmittedOn(classId: string, date: string): boolean {
  const cls = teacherClasses.find((c) => c.id === classId);
  if (!cls) return false;
  return sectionHasSubmittedAttendance(
    attendanceSectionKey(cls.className, cls.section),
    date,
  );
}

/** Month-to-date class attendance % from Registers (shared formula). */
function classAttendancePctFromRegisters(classId: string, now = new Date()): number {
  const cls = teacherClasses.find((c) => c.id === classId);
  if (!cls) return 0;
  const students = getStudentsByClass(classId);
  if (students.length === 0) return 0;
  const to = now.toISOString().slice(0, 10);
  const from = `${to.slice(0, 7)}-01`;
  const sectionKey = attendanceSectionKey(cls.className, cls.section);
  const studentIds = localIdsToAttendanceStudentIds(
    students.map((s) => s.id),
    students.map((s) => ({
      id: s.id,
      roll: s.roll,
      className: s.className,
      section: s.section,
    })),
  );
  return buildAttendanceHistoryReport({
    from,
    to,
    sectionKey,
    classLabel: cls.className,
    studentIds,
    holidayDates: INSTITUTE_HOLIDAYS.map((h) => h.date),
  }).attendancePct;
}

function studentAttendancePctFromRegisters(
  classId: string,
  studentLocalId: string,
  now = new Date(),
): number {
  const cls = teacherClasses.find((c) => c.id === classId);
  if (!cls) return 0;
  const students = getStudentsByClass(classId);
  const student = students.find((s) => s.id === studentLocalId);
  if (!student) return 0;
  const to = now.toISOString().slice(0, 10);
  const from = `${to.slice(0, 7)}-01`;
  const sectionKey = attendanceSectionKey(cls.className, cls.section);
  const roster = students.map((s) => ({
    id: s.id,
    roll: s.roll,
    className: s.className,
    section: s.section,
  }));
  const [studentId] = localIdsToAttendanceStudentIds([studentLocalId], roster);
  if (!studentId) return 0;
  const report = buildAttendanceHistoryReport({
    from,
    to,
    sectionKey,
    classLabel: cls.className,
    studentIds: [studentId],
    holidayDates: INSTITUTE_HOLIDAYS.map((h) => h.date),
  });
  return report.byStudent[0]?.attendancePct ?? report.attendancePct;
}

function markKey(examId: string, classId: string) {
  return `${examId}:${classId}`;
}

/** Keep an assignment's submittedCount/submissionRate in sync with its actual submissions. */
function recomputeAssignmentProgress(assignmentId: string) {
  const idx = assignmentsStore.findIndex((a) => a.id === assignmentId);
  if (idx < 0) return;
  const subs = submissionsStore.filter((s) => s.assignmentId === assignmentId);
  const total = assignmentsStore[idx].totalStudents || subs.length || 1;
  const submitted = subs.filter((s) => s.timing !== "missing").length;
  assignmentsStore[idx] = {
    ...assignmentsStore[idx],
    submittedCount: submitted,
    submissionRate: Math.round((submitted / total) * 100),
  };
}

/** Ensure every student in the class has a submission row for this assignment. */
function ensureSubmissionsForAssignment(assignmentId: string) {
  const asg = assignmentsStore.find((a) => a.id === assignmentId);
  if (!asg) return;
  const students = getStudentsByClass(asg.classId);
  const existing = new Set(
    submissionsStore.filter((s) => s.assignmentId === assignmentId).map((s) => s.studentId),
  );
  const maxMarks = asg.type === "assignment" ? 100 : 10;
  for (const s of students) {
    if (existing.has(s.id)) continue;
    submissionsStore.push({
      id: `sub-${assignmentId}-${s.id}`,
      assignmentId,
      studentId: s.id,
      studentName: s.name,
      roll: s.roll,
      timing: "missing",
      submittedAt: null,
      note: "",
      graded: false,
      marks: null,
      maxMarks,
    });
  }
}

function todayKey() {
  return toLocalIsoDate(new Date());
}

function resolveTeacherClassId(className: string, section: string): string | null {
  const numMatch = className.match(/(\d+)/);
  if (!numMatch) return null;
  const num = numMatch[1];
  const sectionNorm = section.trim().toUpperCase();
  const match =
    teacherClasses.find(
      (c) => c.className === num && c.section.toUpperCase() === sectionNorm && c.isClassTeacher,
    ) ?? teacherClasses.find((c) => c.className === num && c.section.toUpperCase() === sectionNorm);
  return match?.id ?? null;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export const teacherRepository = {
  async getProfile(): Promise<TeacherProfile> {
    await delay();
    return { ...profileStore };
  },

  async updateProfile(data: Partial<TeacherProfile>): Promise<TeacherProfile> {
    assertTeacherCanWrite();
    await delay(300);
    profileStore = { ...profileStore, ...data };
    return { ...profileStore };
  },

  async getPreferences(): Promise<TeacherPreferences> {
    await delay();
    return { ...preferencesStore };
  },

  async savePreferences(prefs: TeacherPreferences): Promise<void> {
    assertTeacherCanWrite();
    await delay(200);
    preferencesStore = { ...prefs };
  },

  async getClasses(): Promise<TeacherClass[]> {
    if (isApiAuthMode()) {
      const cached = getTeacherClassesFromCache();
      if (cached.length > 0) return cached;
      await delay(80);
      return getTeacherClassesFromCache();
    }
    await delay();
    return teacherClasses.map((c) => ({
      ...c,
      attendanceRate: classAttendancePctFromRegisters(c.id),
    }));
  },

  async getClass(id: string): Promise<TeacherClass | null> {
    await delay();
    const found = teacherClasses.find((c) => c.id === id);
    if (!found) return null;
    return { ...found, attendanceRate: classAttendancePctFromRegisters(found.id) };
  },

  async getDashboard(): Promise<DashboardSnapshot> {
    await delay();
    const base = getDashboardSnapshot();
    const pending = assignmentsStore.filter((a) => a.publishStatus === "draft");
    return {
      ...base,
      pendingHomework: pending.slice(0, 3).map((a) => ({
        assignmentId: a.id,
        label: `${a.title} · ${a.classLabel}`,
        pendingCount: a.totalStudents - a.submittedCount,
      })),
      upcomingExams: examsStore.filter((e) => e.status === "upcoming").slice(0, 4),
      upcomingEvents: eventsStore.slice(0, 4),
      unreadMessages: messagesStore.filter(
        (m) => m.unread && !m.archived && !m.draft && m.portalScope !== "activity",
      ).length,
      recentComplaints: complaintsStore.filter((c) => c.status !== "closed").slice(0, 3),
      classPerformance: teacherClasses.map((c) => ({
        classId: c.id,
        label: `${c.className}-${c.section}`,
        attendance: classAttendancePctFromRegisters(c.id),
        homework: c.homeworkSubmissionRate,
        avgScore: c.avgScore,
      })),
      attendancePending: teacherClasses
        .filter((c) => !isClassAttendanceSubmittedOn(c.id, todayKey()))
        .map((c) => ({
          classId: c.id,
          label: `${c.className}-${c.section} · ${c.subject}`,
          count: c.studentCount,
        })),
      attendanceCompleted: teacherClasses
        .filter((c) => isClassAttendanceSubmittedOn(c.id, todayKey()))
        .map((c) => ({
          classId: c.id,
          label: `${c.className}-${c.section} · ${c.subject}`,
          count: c.studentCount,
        })),
      classesRemaining: teacherClasses.filter(
        (c) => !isClassAttendanceSubmittedOn(c.id, todayKey()),
      ).length,
    };
  },

  async getStudents(classId?: string): Promise<TeacherStudent[]> {
    if (isApiAuthMode()) {
      const list = classId
        ? getTeacherStudentsForSection(classId)
        : getAllTeacherStudentsFromCache();
      return list;
    }
    await delay();
    const list = classId ? getStudentsByClass(classId) : instituteStudents;
    return list.map((s) => ({
      ...s,
      attendancePct: studentAttendancePctFromRegisters(s.classId, s.id),
    }));
  },

  async getInstituteClassNames(): Promise<string[]> {
    await delay(80);
    return getInstituteClassNames();
  },

  async getInstituteSections(className?: string): Promise<string[]> {
    await delay(80);
    return getInstituteSections(className);
  },

  async getStudent(id: string): Promise<StudentDetail | null> {
    await delay();
    const detail = getStudentDetail(id);
    if (!detail) return null;
    const extra = remarksStore.filter((r) => r.studentId === id);
    const attendancePct = studentAttendancePctFromRegisters(detail.classId, id);
    return {
      ...detail,
      attendancePct,
      attendanceSummary: {
        ...detail.attendanceSummary,
        rate: attendancePct,
      },
      remarks: [...detail.remarks, ...extra],
    };
  },

  async getExams(classId?: string): Promise<TeacherExam[]> {
    await delay();
    const list = examsStore.map((e) => ({ ...e }));
    if (!classId) return list;
    return list.filter((e) => e.classId === classId);
  },

  async getExam(id: string): Promise<TeacherExam | null> {
    await delay();
    return examsStore.find((e) => e.id === id) ?? null;
  },

  async createExam(data: Omit<TeacherExam, "id" | "marksStatus">): Promise<TeacherExam> {
    assertTeacherCanWrite();
    await delay(400);
    const exam: TeacherExam = { ...data, id: `ex-${Date.now()}`, marksStatus: "draft" };
    examsStore = [exam, ...examsStore];
    return exam;
  },

  async updateExam(id: string, data: Partial<TeacherExam>): Promise<TeacherExam | null> {
    assertTeacherCanWrite();
    await delay(350);
    const idx = examsStore.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    examsStore[idx] = { ...examsStore[idx], ...data };
    return { ...examsStore[idx] };
  },

  async deleteExam(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(250);
    examsStore = examsStore.filter((e) => e.id !== id);
  },

  async publishExam(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(300);
    examsStore = examsStore.map((e) =>
      e.id === id ? { ...e, publishStatus: "published" as PublishStatus } : e,
    );
  },

  async getEvents(): Promise<TeacherEvent[]> {
    await delay();
    return eventsStore.map((e) => ({ ...e }));
  },

  async createEvent(data: Omit<TeacherEvent, "id" | "createdBy">): Promise<TeacherEvent> {
    assertTeacherCanWrite();
    await delay(350);
    const ev: TeacherEvent = { ...data, id: `ev-${Date.now()}`, createdBy: profileStore.name };
    eventsStore = [ev, ...eventsStore];
    return ev;
  },

  async updateEvent(id: string, data: Partial<TeacherEvent>): Promise<TeacherEvent | null> {
    assertTeacherCanWrite();
    await delay(300);
    const idx = eventsStore.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    eventsStore[idx] = { ...eventsStore[idx], ...data };
    return { ...eventsStore[idx] };
  },

  async deleteEvent(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(250);
    eventsStore = eventsStore.filter((e) => e.id !== id);
  },

  async getMessages(filter?: "inbox" | "archived" | "drafts" | "sent"): Promise<TeacherMessage[]> {
    await delay();
    let list = messagesStore.map((m) => ({ ...m }));
    switch (filter) {
      case "archived":
        list = list.filter((m) => m.archived);
        break;
      case "drafts":
        list = list.filter((m) => m.draft);
        break;
      case "sent":
        list = list.filter((m) => m.from === profileStore.name && !m.draft && !m.archived);
        break;
      default:
        list = list.filter((m) => !m.archived && !m.draft && m.from !== profileStore.name);
    }
    return list.sort((a, b) => (a.time > b.time ? -1 : 1));
  },

  async getMessageTargets(params: {
    role: TeacherMessage["recipientRole"];
    classId?: string;
    section?: string;
    query?: string;
  }): Promise<TeacherMessageTarget[]> {
    await delay(160);
    const { role, classId, section, query } = params;
    const needle = query?.trim().toLowerCase() ?? "";
    const matches = (label: string) => !needle || label.toLowerCase().includes(needle);

    if (role === "teacher") {
      return teacherColleagues.filter((item) => matches(item.label));
    }
    if (role === "principal") {
      return [{ id: "principal", label: "Principal / Admin Office", role: "principal" }];
    }

    const scoped = instituteStudents.filter((student) => {
      if (classId && student.classId !== classId) return false;
      if (section && student.section.toUpperCase() !== section.toUpperCase()) return false;
      return true;
    });

    if (role === "class") {
      const classGroups = new Map<string, TeacherMessageTarget>();
      for (const student of scoped) {
        const key = `${student.className}-${student.section}`;
        if (!classGroups.has(key)) {
          classGroups.set(key, {
            id: `class-${key}`,
            label: `Class ${key} Parents`,
            role: "class",
            classId: student.classId,
            section: student.section,
          });
        }
      }
      return [...classGroups.values()].filter((item) => matches(item.label));
    }

    return scoped
      .map((student) => ({
        id: `${role}-${student.id}`,
        label:
          role === "parent"
            ? `${student.name} Parent · ${student.className}-${student.section} · Roll ${student.roll}`
            : `${student.name} · ${student.className}-${student.section} · Roll ${student.roll}`,
        role,
        classId: student.classId,
        section: student.section,
      }))
      .filter((item) => matches(item.label))
      .slice(0, 80);
  },

  async sendMessage(data: {
    /** When set (editing a draft), the existing message is updated in place instead of duplicated. */
    id?: string;
    to: string;
    recipientRole: TeacherMessage["recipientRole"];
    subject: string;
    body: string;
    draft?: boolean;
  }): Promise<TeacherMessage> {
    assertTeacherCanWrite();
    await delay(400);
    const existing = data.id ? messagesStore.find((m) => m.id === data.id) : undefined;
    const msg: TeacherMessage = {
      id: existing?.id ?? `msg-${Date.now()}`,
      threadId: existing?.threadId ?? `thread-${Date.now()}`,
      from: profileStore.name,
      to: data.to,
      recipientRole: data.recipientRole,
      subject: data.subject,
      body: data.body,
      time: "Just now",
      unread: false,
      archived: false,
      draft: data.draft ?? false,
    };
    messagesStore = existing
      ? messagesStore.map((m) => (m.id === existing.id ? msg : m))
      : [msg, ...messagesStore];

    if (!msg.draft) {
      try {
        const recipientRole =
          data.recipientRole === "parent"
            ? ("parent" as const)
            : data.recipientRole === "student"
              ? ("student" as const)
              : ("teacher" as const);
        const pointer = notifyDirectMessage({
          messageId: msg.id,
          threadId: msg.threadId,
          senderName: msg.from,
          subjectPreview: msg.subject || msg.body.slice(0, 80),
          recipientRole,
          href: "/messages",
        });
        if (recipientRole === "parent") {
          parentNotificationStore.add(pointer.appNotification);
        } else if (recipientRole === "student") {
          studentNotificationStore.add(pointer.appNotification);
        }
      } catch {
        /* notification best-effort */
      }
    }

    return msg;
  },

  async markMessageRead(id: string): Promise<void> {
    await delay(150);
    messagesStore = messagesStore.map((m) => (m.id === id ? { ...m, unread: false } : m));
  },

  async archiveMessage(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(150);
    messagesStore = messagesStore.map((m) => (m.id === id ? { ...m, archived: true } : m));
  },

  async getMarkEntries(examId: string, classId: string): Promise<MarkEntry[]> {
    await delay();
    const key = markKey(examId, classId);
    if (!markEntriesCache[key]) markEntriesCache[key] = getMarkEntries(examId, classId);
    return markEntriesCache[key].map((e) => ({ ...e }));
  },

  async saveMarkEntries(examId: string, classId: string, entries: MarkEntry[]): Promise<void> {
    assertTeacherCanGrade();
    await delay(400);
    markEntriesCache[markKey(examId, classId)] = entries.map((e) => ({
      ...e,
      status: "draft" as MarkStatus,
    }));
  },

  async submitMarks(examId: string, classId: string): Promise<void> {
    assertTeacherCanGrade();
    await delay(500);
    const key = markKey(examId, classId);
    if (markEntriesCache[key]) {
      markEntriesCache[key] = markEntriesCache[key].map((e) => ({ ...e, status: "submitted" }));
    }
    examsStore = examsStore.map((e) => (e.id === examId ? { ...e, marksStatus: "submitted" } : e));
    try {
      const raw = localStorage.getItem("lumenx.admin.marks-entries.v1");
      if (raw) {
        const entries = JSON.parse(raw) as Array<{
          examId: string;
          classGrade: string;
          section: string;
          status: string;
          submittedAt?: string;
          examName?: string;
          subject?: string;
        }>;
        const next = entries.map((e) =>
          e.examId === examId
            ? { ...e, status: "submitted", submittedAt: new Date().toISOString() }
            : e,
        );
        localStorage.setItem("lumenx.admin.marks-entries.v1", JSON.stringify(next));
        const sample = next.find((e) => e.examId === examId);
        const readyCount = next.filter((e) => e.examId === examId && e.status === "submitted").length;
        notifyAdminResultsReady({
          examName: sample?.examName ?? examId,
          readyCount,
        });
        notifyTeacherMarksPublishPending({
          examName: sample?.examName ?? examId,
          subject: sample?.subject ?? classId,
        });
      }
    } catch {
      /* demo */
    }
    postDemoSync("marks", { examId, classId });
  },

  async getTimetable(): Promise<TimetableSlot[]> {
    await delay();
    return teacherTimetableSlots;
  },

  async getTimetableForDay(day: string): Promise<TimetableSlot[]> {
    await delay();
    return teacherTimetableSlots.filter((s) => s.day === day);
  },

  async getClassTimetable(classId: string): Promise<TimetableSlot[]> {
    await delay();
    return getClassTimetable(classId);
  },

  async getClassTimetableForDay(classId: string, day: string): Promise<TimetableSlot[]> {
    await delay();
    return getClassTimetableForDay(classId, day);
  },

  async getNotifications(): Promise<TeacherNotification[]> {
    await delay();
    ensurePrincipalAlertsIngested();
    return filterSubjectPortalNotifications(notificationsStore).map((n) => ({ ...n }));
  },

  getNotificationUnreadCount: (): number =>
    filterSubjectPortalNotifications(notificationsStore).filter((n) => n.unread).length,

  getSubjectNotificationUnreadCount: (): number =>
    filterSubjectPortalNotifications(notificationsStore).filter((n) => n.unread).length,

  /** Stable snapshot (same reference until a mutation) for useSyncExternalStore consumers. */
  getNotificationsSnapshot: (): TeacherNotification[] => subjectNotificationsSnapshot,

  subscribeNotifications: (listener: Listener) => {
    notificationListeners.add(listener);
    return () => notificationListeners.delete(listener);
  },

  async markNotificationRead(id: string): Promise<void> {
    await delay(150);
    notificationsStore = notificationsStore.map((n) => (n.id === id ? { ...n, unread: false } : n));
    notifyNotifications();
  },

  async markAllNotificationsRead(): Promise<void> {
    await delay(200);
    notificationsStore = notificationsStore.map((n) => ({ ...n, unread: false }));
    notifyNotifications();
  },

  /** Append a foundation-backed inbox row (leave / homework pointers). */
  pushInboxNotification(input: {
    id: string;
    title: string;
    body: string;
    category?: TeacherNotification["category"];
    href?: string;
  }): void {
    if (notificationsStore.some((n) => n.id === input.id)) return;
    notificationsStore = [
      {
        id: input.id,
        title: input.title,
        body: input.body,
        category: input.category ?? "urgent",
        time: "Just now",
        unread: true,
        portalScope: "subject",
        href: input.href,
      },
      ...notificationsStore,
    ];
    notifyNotifications();
  },

  async createAnnouncement(title: string, body: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(300);
    notificationsStore = [
      {
        id: `tn-${Date.now()}`,
        title,
        body,
        category: "announcements",
        time: "Just now",
        unread: false,
      },
      ...notificationsStore,
    ];
    notifyNotifications();
  },

  async getComplaints(): Promise<TeacherComplaint[]> {
    await delay();
    return complaintsStore.map((c) => ({ ...c }));
  },

  async createComplaint(data: {
    title: string;
    body: string;
    category: string;
    priority: TeacherComplaint["priority"];
    draft?: boolean;
  }): Promise<TeacherComplaint> {
    assertTeacherCanWrite();
    await delay(400);
    const c: TeacherComplaint = {
      id: `tc-${Date.now()}`,
      ...data,
      status: data.draft ? "draft" : "open",
      createdAt: formatDate(new Date().toISOString()),
    };
    complaintsStore = [c, ...complaintsStore];
    return c;
  },

  async deleteComplaint(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(300);
    complaintsStore = complaintsStore.filter((c) => c.id !== id);
  },

  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    response?: string,
  ): Promise<void> {
    assertTeacherCanWrite();
    await delay(350);
    complaintsStore = complaintsStore.map((c) =>
      c.id === id ? { ...c, status, response: response ?? c.response } : c,
    );
  },

  async saveAttendance(
    classId: string,
    absentIds: string[],
    draft = false,
    date?: string,
    leaveIds?: string[],
    engineCtx?: {
      workflow: AttendanceWorkflow;
      actor: AttendanceActor;
      slotId: string;
      classLabel: string;
      section: string;
      sectionKey?: string;
    },
  ): Promise<void> {
    assertTeacherCanWrite();
    await delay(450);
    if (!engineCtx?.workflow || !engineCtx.actor) {
      throw new Error("Attendance Engine context is required — Registers are the only SoT.");
    }
    const d = date ?? todayKey();
    const slotId = engineCtx.slotId ?? "slot:day";
    const sectionKey =
      engineCtx.sectionKey ??
      attendanceSectionKey(engineCtx.classLabel, engineCtx.section);

    const rosterRefs = rosterRefsForClass(classId);
    const existingReg = getSlotAttendance(sectionKey, d, slotId);
    const existingLeaveLocal = existingReg
      ? attendanceStudentIdsToLocalIds(existingReg.leaveIds, rosterRefs)
      : [];
    const preservedLeave = [
      ...new Set([...existingLeaveLocal, ...(leaveIds ?? [])]),
    ];
    const filteredAbsent = absentIds.filter((id) => !preservedLeave.includes(id));
    const canonicalAbsent = localIdsToAttendanceStudentIds(
      filteredAbsent,
      rosterRefs,
    );
    const canonicalLeave = localIdsToAttendanceStudentIds(
      preservedLeave,
      rosterRefs,
    );

    const result = saveSlotAttendance({
      workflow: engineCtx.workflow,
      actor: engineCtx.actor,
      sectionKey,
      classLabel: engineCtx.classLabel,
      section: engineCtx.section,
      date: d,
      slotId,
      absentIds: canonicalAbsent,
      leaveIds: canonicalLeave,
      draft,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }

    // Pending attendance reminders stop once this teacher has submitted.
    try {
      const sessionId = currentSessionTeacherId();
      removeTeacherFromPrincipalAttendanceAlerts(teacherProfile.id, teacherProfile.name);
      if (sessionId) removeTeacherFromPrincipalAttendanceAlerts(sessionId, null);
      // Drop matching inbox rows immediately.
      notificationsStore = notificationsStore.filter(
        (n) => !n.id.startsWith("principal-attendance-"),
      );
      ingestedPrincipalAttendanceAlertIds.clear();
      ensurePrincipalAttendanceAlertsIngested();
      notifyNotifications();
    } catch {
      /* ignore */
    }

    if (!draft && filteredAbsent.length) {
      const slotMeta = engineCtx.workflow.slots.find((s) => s.id === slotId);
      const roster = getStudentsByClass(classId);
      notifyFromAttendanceSubmit({
        date: d,
        sectionKey,
        classLabel: engineCtx.classLabel,
        section: engineCtx.section,
        slotId,
        slotLabel: slotMeta?.label ?? "Attendance",
        slotKind: slotMeta?.kind ?? "day",
        absentStudents: filteredAbsent.map((id) => ({
          id: localIdsToAttendanceStudentIds([id], rosterRefs)[0] ?? id,
          name: roster.find((s) => s.id === id)?.name ?? id,
        })),
      });
    }
  },

  async applyApprovedLeave(req: LeaveRequest): Promise<void> {
    await delay(200);
    const classId = resolveTeacherClassId(req.className, req.section);
    if (!classId) return;
    const cls = teacherClasses.find((c) => c.id === classId);
    if (!cls) return;

    const students = getStudentsByClass(classId);
    const student = students.find(
      (s) => s.name.toLowerCase() === req.childName.toLowerCase(),
    );
    if (!student) return;

    const sectionKey = attendanceSectionKey(cls.className, cls.section);
    const attendanceStudentId = toAttendanceStudentId({
      id: student.id,
      classLabel: student.className,
      section: student.section,
      rollNo: student.roll,
    });

    for (const date of enumerateLeaveDates(req.leaveStartDate, req.leaveEndDate)) {
      let dayName: string;
      try {
        dayName = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
          weekday: "long",
        });
      } catch {
        dayName = getTodayDayName();
      }
      const periods = periodsFromTimetableSlots(
        getClassTimetableForDay(cls.id, dayName).map((s) => ({
          subject: s.subject,
          time: s.time,
        })),
      );
      // Sole write path: Attendance Engine → saveSlotAttendance (no direct upsert).
      applyLeaveApprovalToRegisters({
        sectionKey,
        classLabel: cls.className,
        section: cls.section,
        date,
        studentId: attendanceStudentId,
        periods,
      });
    }
  },

  async getAttendanceRecord(
    classId: string,
    date?: string,
    slotId = "slot:day",
  ): Promise<AttendanceRecord | null> {
    await delay();
    const d = date ?? todayKey();
    const cls = teacherClasses.find((c) => c.id === classId);
    if (!cls) return null;
    const sectionKey = attendanceSectionKey(cls.className, cls.section);
    const reg = getSlotAttendance(sectionKey, d, slotId);
    return reg ? registerToAttendanceRecord(classId, reg) : null;
  },

  async getAttendanceHistory(classId?: string): Promise<AttendanceRecord[]> {
    await delay();
    const classes = classId
      ? teacherClasses.filter((c) => c.id === classId)
      : teacherClasses;
    const out: AttendanceRecord[] = [];
    for (const cls of classes) {
      const sectionKey = attendanceSectionKey(cls.className, cls.section);
      for (const reg of listRegistersForSection(sectionKey)) {
        out.push(registerToAttendanceRecord(cls.id, reg));
      }
    }
    return out.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return a.classId.localeCompare(b.classId);
    });
  },

  /** All submitted/draft attendance across classes — for History tab. */
  async getAllAttendanceHistory(): Promise<AttendanceRecord[]> {
    return this.getAttendanceHistory();
  },

  async getAttendanceReports(classId?: string) {
    await delay();
    const cls =
      teacherClasses.find((c) => c.id === (classId ?? teacherClasses[0]?.id)) ??
      teacherClasses[0];
    if (!cls) {
      return [
        { period: "daily" as const, label: "Today", present: 0, absent: 0, rate: 0, workingDays: 0 },
        { period: "weekly" as const, label: "This week", present: 0, absent: 0, rate: 0, workingDays: 0 },
        { period: "monthly" as const, label: "This month", present: 0, absent: 0, rate: 0, workingDays: 0 },
      ];
    }

    const students = getStudentsByClass(cls.id);
    const sectionKey = attendanceSectionKey(cls.className, cls.section);
    const cards = buildTeacherReportCards({
      sectionKey,
      classLabel: cls.className,
      studentIds: students.map((s) =>
        localIdsToAttendanceStudentIds(
          [s.id],
          [
            {
              id: s.id,
              roll: s.roll,
              className: s.className,
              section: s.section,
            },
          ],
        )[0]!,
      ),
      holidayDates: INSTITUTE_HOLIDAYS.map((h) => h.date),
    });
    return cards.map(
      (c): AttendanceReport => ({
        period: c.period,
        label: c.label,
        present: c.present,
        absent: c.absent,
        rate: c.rate,
        workingDays: c.workingDays,
      }),
    );
  },

  async getTeacherSelfAttendance(): Promise<TeacherSelfAttendanceRecord[]> {
    await delay(180);
    return [...teacherSelfAttendanceStore].sort((a, b) => b.date.localeCompare(a.date));
  },

  async getTeacherLeaveRequests(): Promise<TeacherLeaveRequest[]> {
    await delay(180);
    const { teacherLeaveStore } = await import("@/lib/teacher-leave-store");
    teacherLeaveStore.init();
    return teacherLeaveStore.getAll();
  },

  async submitTeacherLeaveRequest(
    input: Omit<TeacherLeaveRequest, "id" | "teacherId" | "teacherName" | "status" | "submittedAt">,
  ): Promise<TeacherLeaveRequest> {
    assertTeacherCanWrite();
    await delay(300);
    const { teacherLeaveStore } = await import("@/lib/teacher-leave-store");
    return teacherLeaveStore.submit({
      teacherId: profileStore.id,
      teacherName: profileStore.name,
      ...input,
    });
  },

  async getAnnouncements() {
    await delay();
    return dashboardAnnouncements;
  },

  async getAssignments(classId?: string): Promise<TeacherAssignment[]> {
    await delay();
    let list = assignmentsStore.map((a) => ({ ...a }));
    if (classId) list = list.filter((a) => a.classId === classId);
    return list;
  },

  async getAssignment(id: string): Promise<TeacherAssignment | null> {
    await delay();
    return assignmentsStore.find((a) => a.id === id) ?? null;
  },

  async getAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
    await delay();
    ensureSubmissionsForAssignment(assignmentId);
    return submissionsStore
      .filter((s) => s.assignmentId === assignmentId)
      .map((s) => ({ ...s }));
  },

  /** Tap to mark submitted / not submitted (no marks). */
  async toggleSubmission(submissionId: string): Promise<AssignmentSubmission | null> {
    assertTeacherCanWrite();
    await delay(120);
    const idx = submissionsStore.findIndex((s) => s.id === submissionId);
    if (idx < 0) return null;
    const row = submissionsStore[idx];
    const nowSubmitted = row.timing === "missing";
    submissionsStore[idx] = {
      ...row,
      timing: nowSubmitted ? "on_time" : "missing",
      submittedAt: nowSubmitted
        ? new Date().toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : null,
      note: nowSubmitted ? "Marked submitted by teacher." : "",
      graded: false,
      marks: null,
    };
    recomputeAssignmentProgress(submissionsStore[idx].assignmentId);
    const updated = submissionsStore[idx];
    const asg = assignmentsStore.find((a) => a.id === updated.assignmentId);
    try {
      if (asg) {
        if (nowSubmitted) {
          const n = notifyHomeworkSubmitted({
            assignmentId: asg.id,
            title: asg.title,
            subject: asg.subject,
            studentId: updated.studentId,
            studentName: updated.studentName,
          });
          parentNotificationStore.add(n.appNotification);
        } else {
          const n = notifyHomeworkNotSubmitted({
            assignmentId: asg.id,
            title: asg.title,
            subject: asg.subject,
            dueDate: asg.dueDate,
            studentId: updated.studentId,
            studentName: updated.studentName,
          });
          parentNotificationStore.add(n.appNotification);
        }
      }
    } catch {
      /* notification best-effort */
    }
    return { ...updated };
  },

  async updateSubmissionMarks(
    submissionId: string,
    marks: number | null,
  ): Promise<AssignmentSubmission | null> {
    assertTeacherCanGrade();
    await delay(200);
    const idx = submissionsStore.findIndex((s) => s.id === submissionId);
    if (idx < 0) return null;
    submissionsStore[idx] = {
      ...submissionsStore[idx],
      marks,
      graded: marks != null,
    };
    recomputeAssignmentProgress(submissionsStore[idx].assignmentId);
    return { ...submissionsStore[idx] };
  },

  async createAssignment(data: {
    title: string;
    description: string;
    instructions: string;
    subject: string;
    classId: string;
    dueDate: string;
    type: "homework" | "assignment";
    attachment?: {
      fileName: string;
      mimeType: string;
      size: number;
      dataUrl: string;
    } | null;
  }): Promise<TeacherAssignment> {
    assertTeacherCanWrite();
    await delay(400);
    const cls = teacherClasses.find((c) => c.id === data.classId);
    const newAsg: TeacherAssignment = {
      id: `asg-${Date.now()}`,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      subject: data.subject,
      classId: data.classId,
      classLabel: cls ? `${cls.className}-${cls.section}` : data.classId,
      section: cls?.section ?? "B",
      due: data.dueDate,
      dueDate: data.dueDate,
      status: "pending",
      publishStatus: "draft",
      type: data.type,
      totalStudents: cls?.studentCount ?? 32,
      submittedCount: 0,
      submissionRate: 0,
    };
    assignmentsStore = [newAsg, ...assignmentsStore];
    if (data.attachment) {
      upsertAssignmentDetailExtra(newAsg.id, {
        description: data.description,
        instructions: data.instructions,
        teacherId: teacherProfile.id,
        teacherName: teacherProfile.name,
        attachments: [attachmentFromSimpleUpload(data.attachment)],
      });
    } else {
      upsertAssignmentDetailExtra(newAsg.id, {
        description: data.description,
        instructions: data.instructions,
        teacherId: teacherProfile.id,
        teacherName: teacherProfile.name,
        attachments: [],
      });
    }
    pushHomeworkActivityLog({
      action: "created",
      teacherId: teacherProfile.id,
      teacherName: teacherProfile.name,
      assignmentId: newAsg.id,
      title: newAsg.title,
      classLabel: newAsg.classLabel,
      subject: newAsg.subject,
    });
    return newAsg;
  },

  async updateAssignment(
    id: string,
    data: Partial<TeacherAssignment>,
  ): Promise<TeacherAssignment | null> {
    assertTeacherCanWrite();
    await delay(350);
    const idx = assignmentsStore.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    assignmentsStore[idx] = { ...assignmentsStore[idx], ...data };
    pushHomeworkActivityLog({
      action: "updated",
      teacherId: teacherProfile.id,
      teacherName: teacherProfile.name,
      assignmentId: assignmentsStore[idx].id,
      title: assignmentsStore[idx].title,
      classLabel: assignmentsStore[idx].classLabel,
      subject: assignmentsStore[idx].subject,
    });
    return { ...assignmentsStore[idx] };
  },

  async deleteAssignment(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(250);
    const existing = assignmentsStore.find((a) => a.id === id);
    assignmentsStore = assignmentsStore.filter((a) => a.id !== id);
    if (existing) {
      pushHomeworkActivityLog({
        action: "deleted",
        teacherId: teacherProfile.id,
        teacherName: teacherProfile.name,
        assignmentId: existing.id,
        title: existing.title,
        classLabel: existing.classLabel,
        subject: existing.subject,
      });
    }
  },

  async publishAssignment(id: string): Promise<void> {
    assertTeacherCanWrite();
    await delay(300);
    assignmentsStore = assignmentsStore.map((a) =>
      a.id === id ? { ...a, publishStatus: "published" as PublishStatus } : a,
    );
    ensureSubmissionsForAssignment(id);
    recomputeAssignmentProgress(id);
    const published = assignmentsStore.find((a) => a.id === id);
    if (published) {
      upsertStudentAssignmentOverlay({
        id: published.id,
        title: published.title,
        subject: published.subject,
        due: published.dueDate,
        dueDate: published.dueDate,
        status: "pending",
        class: published.classLabel,
        type: published.type,
      });
      upsertAssignmentDetailExtra(published.id, {
        publishedAt: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
      pushHomeworkActivityLog({
        action: "published",
        teacherId: teacherProfile.id,
        teacherName: teacherProfile.name,
        assignmentId: published.id,
        title: published.title,
        classLabel: published.classLabel,
        subject: published.subject,
      });
      try {
        const classAssigned = notifyHomeworkAssigned({
          assignmentId: published.id,
          title: published.title,
          subject: published.subject,
          dueDate: published.dueDate,
        });
        parentNotificationStore.add(classAssigned.parent.appNotification);
        studentNotificationStore.add(classAssigned.student.appNotification);

        const dueMs = Date.parse(published.dueDate);
        const duePassed = !Number.isNaN(dueMs) && dueMs < Date.now();
        const rows = submissionsStore.filter((s) => s.assignmentId === published.id);
        for (const sub of rows) {
          if (sub.timing === "missing") {
            const reminder = notifyHomeworkReminder({
              assignmentId: published.id,
              title: published.title,
              subject: published.subject,
              dueDate: published.dueDate,
              studentId: sub.studentId,
              studentName: sub.studentName,
            });
            if (reminder) {
              parentNotificationStore.add(reminder.parent.appNotification);
              studentNotificationStore.add(reminder.student.appNotification);
            }
            if (duePassed) {
              const overdue = notifyHomeworkDuePassed({
                assignmentId: published.id,
                title: published.title,
                subject: published.subject,
                dueDate: published.dueDate,
                studentId: sub.studentId,
                studentName: sub.studentName,
              });
              if (overdue) {
                parentNotificationStore.add(overdue.parent.appNotification);
                studentNotificationStore.add(overdue.student.appNotification);
              }
            }
          }
        }
      } catch {
        /* notification best-effort */
      }
    }
  },

  /**
   * Class overview: total homework/assignments for the class + per-student submitted count.
   */
  async getClassSubmissionOverview(
    classId: string,
    type?: "homework" | "assignment",
  ): Promise<{
    totalItems: number;
    students: {
      studentId: string;
      studentName: string;
      roll: string;
      submitted: number;
      total: number;
    }[];
  }> {
    await delay();
    const asgs = assignmentsStore.filter(
      (a) => a.classId === classId && (!type || a.type === type),
    );
    for (const a of asgs) ensureSubmissionsForAssignment(a.id);
    const students = getStudentsByClass(classId);
    return {
      totalItems: asgs.length,
      students: students.map((s) => {
        let submitted = 0;
        for (const a of asgs) {
          const sub = submissionsStore.find(
            (x) => x.assignmentId === a.id && x.studentId === s.id,
          );
          if (sub && sub.timing !== "missing") submitted += 1;
        }
        return {
          studentId: s.id,
          studentName: s.name,
          roll: s.roll,
          submitted,
          total: asgs.length,
        };
      }),
    };
  },

  async getHomeworkAttendance(classId?: string): Promise<HomeworkAttendanceRow[]> {
    await delay();
    return getHomeworkAttendance(classId);
  },

  async getHomeworkClassSummaries(): Promise<HomeworkClassSummary[]> {
    await delay();
    return getHomeworkClassSummaries();
  },

  async getAllRemarks(): Promise<StudentRemark[]> {
    await delay();
    const seeded = teacherStudents.slice(0, 3).flatMap((s, i) =>
      i === 0
        ? [
            {
              id: "rm-seed-1",
              studentId: s.id,
              studentName: s.name,
              type: "academic" as RemarkType,
              text: "Strong problem-solving skills in algebra.",
              authorId: teacherProfile.id,
              authorName: teacherProfile.name,
              createdAt: "28 May 2026",
              visibleTo: ["teacher", "parent", "admin"] as StudentRemark["visibleTo"],
            },
          ]
        : [],
    );
    return [...seeded, ...remarksStore];
  },

  async addRemark(
    studentId: string,
    remark: { type: RemarkType; text: string },
  ): Promise<StudentRemark> {
    assertTeacherCanWrite();
    await delay(300);
    const student = instituteStudents.find((s) => s.id === studentId);
    const newRemark: StudentRemark = {
      id: `rm-${Date.now()}`,
      studentId,
      studentName: student?.name ?? "Student",
      type: remark.type,
      text: remark.text,
      authorId: teacherProfile.id,
      authorName: teacherProfile.name,
      createdAt: formatDate(new Date().toISOString()),
      visibleTo: ["teacher", "parent", "admin"],
    };
    remarksStore = [...remarksStore, newRemark];
    return newRemark;
  },

  async updateRemark(id: string, text: string): Promise<StudentRemark | null> {
    assertTeacherCanWrite();
    await delay(300);
    const idx = remarksStore.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    remarksStore[idx] = {
      ...remarksStore[idx],
      text,
      updatedAt: formatDate(new Date().toISOString()),
    };
    return { ...remarksStore[idx] };
  },

  async getClassFees(): Promise<TeacherFeeRecord[]> {
    await delay();
    return teacherClassFees.map((f) => ({ ...f }));
  },

  async search(query: string, opts?: { instituteId?: string | null }) {
    await delay(120);
    // Portal search is institute-bound; refuse results without a current institute.
    if (!opts?.instituteId) {
      return {
        students: [],
        classes: [],
        assignments: [],
        exams: [],
        events: [],
        messages: [] as TeacherMessage[],
      };
    }
    const q = query.trim().toLowerCase();
    if (!q)
      return {
        students: [],
        classes: [],
        assignments: [],
        exams: [],
        events: [],
        messages: [] as TeacherMessage[],
      };
    return {
      // Teacher portal: only students in this teacher's classes (not whole institute).
      students: teacherStudents
        .filter((s) => s.name.toLowerCase().includes(q) || s.roll.includes(q))
        .slice(0, 6),
      classes: teacherClasses
        .filter(
          (c) =>
            `${c.className}-${c.section}`.toLowerCase().includes(q) ||
            c.subject.toLowerCase().includes(q),
        )
        .slice(0, 4),
      assignments: assignmentsStore.filter((a) => a.title.toLowerCase().includes(q)).slice(0, 4),
      exams: examsStore.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 4),
      events: eventsStore.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 4),
      messages: messagesStore
        .filter((m) => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
        .slice(0, 4),
    };
  },

  /** Restore seed state so a later sign-in never inherits demo mutations. */
  reset() {
    profileStore = { ...teacherProfile };
    preferencesStore = {
      push: true,
      email: true,
      sms: false,
      examAlerts: true,
      attendanceAlerts: true,
      messageAlerts: true,
      eventAlerts: true,
    };
    remarksStore = [];
    notificationsStore = [...teacherNotifications];
    notifyNotifications();
    complaintsStore = [...teacherComplaints];
    examsStore = [...teacherExams];
    eventsStore = [...teacherEvents];
    messagesStore = [...teacherMessages];
    assignmentsStore = teacherAssignments.map((a) => ({ ...a }));
    submissionsStore = teacherAssignmentSubmissions.map((s) => ({ ...s }));
    for (const key of Object.keys(markEntriesCache)) delete markEntriesCache[key];
    // Attendance Registers are the shared SoT — do not reset or auto-seed.
    teacherSelfAttendanceStore.length = 0;
    teacherSelfAttendanceStore.push(...teacherSelfAttendanceSeed);
  },
};

export { DAYS, getTodayDayName, getDefaultTeacherDay } from "./mock-data";
export type { TeacherFeeRecord } from "./mock-data";
