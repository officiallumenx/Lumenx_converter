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
  attendanceReports,
  dashboardAnnouncements,
  teacherClassFees,
} from "./mock-data";
import type {
  AssignmentSubmission,
  AttendanceRecord,
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
let complaintsStore = [...teacherComplaints];
let examsStore = [...teacherExams];
let eventsStore = [...teacherEvents];
let messagesStore = [...teacherMessages];
let assignmentsStore = teacherAssignments.map((a) => ({ ...a }));
const markEntriesCache: Record<string, MarkEntry[]> = {};
let attendanceRecords: AttendanceRecord[] = [];
const attendanceMarkedClasses = new Set<string>();
const teacherSelfAttendanceStore: TeacherSelfAttendanceRecord[] = [...teacherSelfAttendanceSeed];

function markKey(examId: string, classId: string) {
  return `${examId}:${classId}`;
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
    await delay(300);
    profileStore = { ...profileStore, ...data };
    return { ...profileStore };
  },

  async getPreferences(): Promise<TeacherPreferences> {
    await delay();
    return { ...preferencesStore };
  },

  async savePreferences(prefs: TeacherPreferences): Promise<void> {
    await delay(200);
    preferencesStore = { ...prefs };
  },

  async getClasses(): Promise<TeacherClass[]> {
    await delay();
    return teacherClasses;
  },

  async getClass(id: string): Promise<TeacherClass | null> {
    await delay();
    return teacherClasses.find((c) => c.id === id) ?? null;
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
      unreadMessages: messagesStore.filter((m) => m.unread && !m.archived && !m.draft).length,
      recentComplaints: complaintsStore.filter((c) => c.status !== "closed").slice(0, 3),
      classPerformance: teacherClasses.map((c) => ({
        classId: c.id,
        label: `${c.className}-${c.section}`,
        attendance: c.attendanceRate,
        homework: c.homeworkSubmissionRate,
        avgScore: c.avgScore,
      })),
      attendancePending: teacherClasses
        .filter((c) => !attendanceMarkedClasses.has(`${c.id}:${todayKey()}`))
        .map((c) => ({
          classId: c.id,
          label: `${c.className}-${c.section} · ${c.subject}`,
          count: c.studentCount,
        })),
    };
  },

  async getStudents(classId?: string): Promise<TeacherStudent[]> {
    await delay();
    if (classId) return getStudentsByClass(classId);
    return instituteStudents;
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
    return { ...detail, remarks: [...detail.remarks, ...extra] };
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
    await delay(400);
    const exam: TeacherExam = { ...data, id: `ex-${Date.now()}`, marksStatus: "draft" };
    examsStore = [exam, ...examsStore];
    return exam;
  },

  async updateExam(id: string, data: Partial<TeacherExam>): Promise<TeacherExam | null> {
    await delay(350);
    const idx = examsStore.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    examsStore[idx] = { ...examsStore[idx], ...data };
    return { ...examsStore[idx] };
  },

  async deleteExam(id: string): Promise<void> {
    await delay(250);
    examsStore = examsStore.filter((e) => e.id !== id);
  },

  async publishExam(id: string): Promise<void> {
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
    await delay(350);
    const ev: TeacherEvent = { ...data, id: `ev-${Date.now()}`, createdBy: profileStore.name };
    eventsStore = [ev, ...eventsStore];
    return ev;
  },

  async updateEvent(id: string, data: Partial<TeacherEvent>): Promise<TeacherEvent | null> {
    await delay(300);
    const idx = eventsStore.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    eventsStore[idx] = { ...eventsStore[idx], ...data };
    return { ...eventsStore[idx] };
  },

  async deleteEvent(id: string): Promise<void> {
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
    to: string;
    recipientRole: TeacherMessage["recipientRole"];
    subject: string;
    body: string;
    draft?: boolean;
  }): Promise<TeacherMessage> {
    await delay(400);
    const msg: TeacherMessage = {
      id: `msg-${Date.now()}`,
      threadId: `thread-${Date.now()}`,
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
    messagesStore = [msg, ...messagesStore];
    return msg;
  },

  async markMessageRead(id: string): Promise<void> {
    await delay(150);
    messagesStore = messagesStore.map((m) => (m.id === id ? { ...m, unread: false } : m));
  },

  async archiveMessage(id: string): Promise<void> {
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
    await delay(400);
    markEntriesCache[markKey(examId, classId)] = entries.map((e) => ({
      ...e,
      status: "draft" as MarkStatus,
    }));
  },

  async publishMarks(examId: string, classId: string): Promise<void> {
    await delay(500);
    const key = markKey(examId, classId);
    if (markEntriesCache[key]) {
      markEntriesCache[key] = markEntriesCache[key].map((e) => ({ ...e, status: "published" }));
    }
    examsStore = examsStore.map((e) => (e.id === examId ? { ...e, marksStatus: "published" } : e));
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
    return notificationsStore.map((n) => ({ ...n }));
  },

  async markNotificationRead(id: string): Promise<void> {
    await delay(150);
    notificationsStore = notificationsStore.map((n) => (n.id === id ? { ...n, unread: false } : n));
  },

  async markAllNotificationsRead(): Promise<void> {
    await delay(200);
    notificationsStore = notificationsStore.map((n) => ({ ...n, unread: false }));
  },

  async createAnnouncement(title: string, body: string): Promise<void> {
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
    await delay(300);
    complaintsStore = complaintsStore.filter((c) => c.id !== id);
  },

  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    response?: string,
  ): Promise<void> {
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
  ): Promise<void> {
    await delay(450);
    const d = date ?? todayKey();
    const key = `${classId}:${d}`;
    const existing = attendanceRecords.find((r) => r.classId === classId && r.date === d);
    const preservedLeave = leaveIds ?? existing?.leaveIds ?? [];
    const filteredAbsent = absentIds.filter((id) => !preservedLeave.includes(id));

    attendanceRecords = attendanceRecords.filter((r) => !(r.classId === classId && r.date === d));
    attendanceRecords.push({
      classId,
      date: d,
      absentIds: [...filteredAbsent],
      leaveIds: [...preservedLeave],
      status: draft ? "draft" : "submitted",
    });
    if (!draft) attendanceMarkedClasses.add(key);
  },

  async applyApprovedLeave(req: LeaveRequest): Promise<void> {
    await delay(200);
    const classId = resolveTeacherClassId(req.className, req.section);
    if (!classId) return;

    const students = getStudentsByClass(classId);
    const student = students.find((s) => s.name.toLowerCase() === req.childName.toLowerCase());
    if (!student) return;

    for (const date of enumerateLeaveDates(req.leaveStartDate, req.leaveEndDate)) {
      const idx = attendanceRecords.findIndex((r) => r.classId === classId && r.date === date);
      if (idx >= 0) {
        const record = attendanceRecords[idx];
        const leaveSet = new Set(record.leaveIds ?? []);
        leaveSet.add(student.id);
        attendanceRecords[idx] = {
          ...record,
          leaveIds: [...leaveSet],
          absentIds: record.absentIds.filter((id) => id !== student.id),
        };
      } else {
        attendanceRecords.push({
          classId,
          date,
          absentIds: [],
          leaveIds: [student.id],
          status: "submitted",
        });
      }
    }
  },

  async getAttendanceRecord(classId: string, date?: string): Promise<AttendanceRecord | null> {
    await delay();
    const d = date ?? todayKey();
    return attendanceRecords.find((r) => r.classId === classId && r.date === d) ?? null;
  },

  async getAttendanceHistory(classId?: string): Promise<AttendanceRecord[]> {
    await delay();
    let list = [...attendanceRecords];
    if (classId) list = list.filter((r) => r.classId === classId);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getAttendanceReports() {
    await delay();
    return attendanceReports;
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
    return teacherAssignmentSubmissions
      .filter((s) => s.assignmentId === assignmentId)
      .map((s) => ({ ...s }));
  },

  async createAssignment(data: {
    title: string;
    description: string;
    instructions: string;
    subject: string;
    classId: string;
    dueDate: string;
    type: "homework" | "assignment";
  }): Promise<TeacherAssignment> {
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
    return newAsg;
  },

  async updateAssignment(
    id: string,
    data: Partial<TeacherAssignment>,
  ): Promise<TeacherAssignment | null> {
    await delay(350);
    const idx = assignmentsStore.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    assignmentsStore[idx] = { ...assignmentsStore[idx], ...data };
    return { ...assignmentsStore[idx] };
  },

  async deleteAssignment(id: string): Promise<void> {
    await delay(250);
    assignmentsStore = assignmentsStore.filter((a) => a.id !== id);
  },

  async publishAssignment(id: string): Promise<void> {
    await delay(300);
    assignmentsStore = assignmentsStore.map((a) =>
      a.id === id ? { ...a, publishStatus: "published" as PublishStatus } : a,
    );
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
              visibleTo: ["teacher", "parent", "admin"],
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

  async search(query: string) {
    await delay(120);
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
      students: instituteStudents
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
};

export { DAYS, getTodayDayName } from "./mock-data";
export type { TeacherFeeRecord } from "./mock-data";
