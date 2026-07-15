import type { Achievement, AppNotification, ReportCard } from "@lumenx/types";
import type { AttendanceDayStatus, ExamHistoryEntry, StudentCertificateRecord } from "./mock-data";

export interface StudentProfile {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNo: string;
  attendance: number;
  bloodGroup: string;
  emergencyContact: string;
  parentName: string;
  house: string;
  idCardIssuedOn: string;
  idCardValidTill: string;
  email: string;
  bio: string;
  classTeacher: string;
  institute: string;
  address: string;
}

export type PerformanceRow = { subject: string; score: number; prev: number };
export type TrendRow = { term: string; score: number };
export type TimetablePeriod = { time: string; subject: string; teacher: string };

export interface StudentSnapshot {
  profile: StudentProfile;
  reportCards: ReportCard[];
  performance: PerformanceRow[];
  trend: TrendRow[];
  timetable: Record<string, TimetablePeriod[]>;
  achievements: Achievement[];
  certificates: StudentCertificateRecord[];
  competitions: {
    id: string;
    title: string;
    category: string;
    date: string;
    result: string;
    rank: string;
    venue: string;
  }[];
  examHistory: ExamHistoryEntry[];
  academicTerms: {
    id: string;
    label: string;
    year: string;
    avgScore: number;
    rank: number;
    classSize: number;
    attendance: number;
    reportCardId: string;
  }[];
  attendanceSummary: {
    monthLabel: string;
    year: number;
    month: number;
    attendancePct: number;
    classAvgPct: number;
    present: number;
    absent: number;
    leave: number;
    workingDays: number;
  };
  attendanceDays: { day: number; status: AttendanceDayStatus }[];
  attendanceTrend: { week: string; pct: number }[];
  attendanceLog: { date: string; status: "present" | "absent" | "leave"; note: string }[];
  notifications: AppNotification[];
  exams: {
    id: string;
    title: string;
    subject: string;
    date: string;
    duration: string;
    room: string;
  }[];
  schoolEvents: { id: string; title: string; kind: string; date: string; venue?: string }[];
}

export interface StudentSearchResults {
  modules: { label: string; path: string }[];
  subjects: { subject: string; teacher: string; day: string; time: string }[];
  certificates: StudentCertificateRecord[];
  notifications: AppNotification[];
  reportCards: ReportCard[];
  teachers: { id: string; name: string; subject: string }[];
  achievements: Achievement[];
  competitions: StudentSnapshot["competitions"];
}
