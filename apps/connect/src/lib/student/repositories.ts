import {
  achievements,
  exams,
  getConnectStudentProfile,
  performance,
  reportCards,
  schoolEvents,
  studentTimetable,
  teachers,
  trend,
} from "@/lib/mock-data";
import { STUDENT_ALL_NAV } from "@/lib/student/nav";
import { studentNotificationStore } from "@/lib/student/notification-store";
import {
  academicTermSummaries,
  examHistory,
  studentCertificateRecords,
  studentCompetitions,
} from "@/lib/student/mock-data";
import { mergeIssuedCertificates } from "@/lib/student/admin-issued-certificates-bridge";
import {
  buildLearnerAttendanceDays,
  buildLearnerAttendanceLog,
  buildLearnerAttendanceTrend,
  computeAttendanceSummary,
  computeLearnerMonthAttendanceDelta,
} from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import type { StudentSearchResults, StudentSnapshot } from "./types";

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

export const studentRepository = {
  async getSnapshot(): Promise<StudentSnapshot> {
    await delay();
    const profile = getConnectStudentProfile();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const studentId = toAttendanceStudentId({
      id: profile.id,
      classLabel: profile.class,
      section: profile.section,
      rollNo: profile.rollNo,
    });
    const sectionKey = attendanceSectionKey(profile.class, profile.section);
    const attendanceDays = buildLearnerAttendanceDays({
      year,
      month,
      studentId,
      sectionKey,
    });
    const computed = computeAttendanceSummary(attendanceDays, year, month);
    const attendanceTrend = buildLearnerAttendanceTrend({
      year,
      month,
      studentId,
      sectionKey,
    });
    const attendanceLog = buildLearnerAttendanceLog({
      year,
      month,
      studentId,
      sectionKey,
    });
    const monthDelta = computeLearnerMonthAttendanceDelta({
      year,
      month,
      studentId,
      sectionKey,
    });
    return {
      profile: { ...profile },
      reportCards: [...reportCards],
      performance: [...performance],
      trend: [...trend],
      timetable: { ...studentTimetable },
      achievements: [...achievements],
      certificates: mergeIssuedCertificates(profile.id, studentCertificateRecords),
      competitions: [...studentCompetitions],
      examHistory: [...examHistory],
      academicTerms: [...academicTermSummaries],
      attendanceSummary: {
        monthLabel: computed.monthLabel,
        year,
        month,
        attendancePct: computed.attendancePct,
        classAvgPct: 0,
        present: computed.present,
        absent: computed.absent,
        leave: computed.leave,
        workingDays: computed.workingDays,
        monthDelta,
      },
      attendanceDays,
      attendanceTrend,
      attendanceLog,
      notifications: studentNotificationStore.getItems(),
      exams: [...exams],
      schoolEvents: schoolEvents.map((e) => ({
        id: e.id,
        title: e.title,
        kind: e.kind,
        date: e.date,
        venue: "venue" in e ? e.venue : undefined,
      })),
    };
  },

  async search(
    query: string,
    opts?: { instituteId?: string | null },
  ): Promise<StudentSearchResults> {
    await delay(120);
    if (!opts?.instituteId) {
      return {
        modules: [],
        subjects: [],
        certificates: [],
        notifications: [],
        reportCards: [],
        teachers: [],
        achievements: [],
        competitions: [],
      };
    }
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        modules: [],
        subjects: [],
        certificates: [],
        notifications: [],
        reportCards: [],
        teachers: [],
        achievements: [],
        competitions: [],
      };
    }

    const modules = STUDENT_ALL_NAV.filter((n) => n.label.toLowerCase().includes(q)).map((n) => ({
      label: n.label,
      path: n.to,
    }));

    const subjects: StudentSearchResults["subjects"] = [];
    for (const [day, periods] of Object.entries(studentTimetable)) {
      for (const p of periods) {
        if (p.subject.toLowerCase().includes(q) || p.teacher.toLowerCase().includes(q)) {
          subjects.push({ subject: p.subject, teacher: p.teacher, day, time: p.time });
        }
      }
    }

    const notifications = studentNotificationStore
      .getItems()
      .filter((n) => n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q))
      .slice(0, 6);

    return {
      modules: modules.slice(0, 6),
      subjects: subjects.slice(0, 8),
      certificates: mergeIssuedCertificates(profile.id, studentCertificateRecords)
        .filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.refNo.toLowerCase().includes(q) ||
            c.category.includes(q),
        )
        .slice(0, 6),
      notifications,
      reportCards: reportCards
        .filter((r) => r.term.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q))
        .slice(0, 4),
      teachers: teachers
        .filter((t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
        .slice(0, 6)
        .map((t) => ({ id: t.id, name: t.name, subject: t.subject })),
      achievements: achievements
        .filter((a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
        .slice(0, 6),
      competitions: studentCompetitions
        .filter((c) => c.title.toLowerCase().includes(q) || c.result.toLowerCase().includes(q))
        .slice(0, 4),
    };
  },
};
