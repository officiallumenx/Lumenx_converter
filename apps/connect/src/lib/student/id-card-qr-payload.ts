import type { Child } from "@lumenx/types";
import {
  children as allChildren,
  achievements,
  performance,
  reportCards,
  studentProfile,
  trend,
} from "@/lib/mock-data";
import {
  academicTermSummaries,
  examHistory,
  studentCertificateRecords,
  studentCompetitions,
} from "@/lib/student/mock-data";
import { buildLearnerMonthAttendanceSummary } from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import type { StudentSnapshot } from "@/lib/student/types";
import {
  displayOrEmpty,
  findIdCardSyncRow,
  type StudentIdCardSyncRow,
} from "@/lib/student/admin-id-card-bridge";
import { resolveCanonicalStudentId } from "@lumenx/utils";

function registerAttendanceSummary(input: {
  id: string;
  classLabel: string;
  section: string;
  rollNo: string;
}) {
  const summary = buildLearnerMonthAttendanceSummary({
    studentId: toAttendanceStudentId({
      id: input.id,
      classLabel: input.classLabel,
      section: input.section,
      rollNo: input.rollNo,
    }),
    sectionKey: attendanceSectionKey(input.classLabel, input.section),
  });
  return {
    monthLabel: summary.monthLabel,
    year: summary.year,
    month: summary.month,
    attendancePct: summary.attendancePct,
    classAvgPct: 0,
    present: summary.present,
    absent: summary.absent,
    leave: summary.leave,
    workingDays: summary.workingDays,
    monthDelta: 0,
  };
}

/** Full student profile shown on the public /verify page (not embedded in QR). */
export type StudentIdQrPayload = {
  v: 2;
  type: "lumenx-student-profile";
  generatedAt: string;
  verifyUrl: string;
  /** When true, public page shows identity-only (Admin-synced card). */
  identityOnly?: boolean;
  photoDataUrl?: string;
  identity: {
    studentId: string;
    name: string;
    rollNo: string;
    class: string;
    section: string;
    institute: string;
    address: string;
    bloodGroup: string;
    emergencyContact: string;
    parentName: string;
    house: string;
    classTeacher: string;
    email: string;
    idCardIssuedOn: string;
    idCardValidTill: string;
  };
  academic: {
    overallAvg: number;
    rank: number;
    classSize: number;
    attendancePct: number;
    performanceBySubject: { subject: string; score: number; prev: number }[];
    termTrend: { term: string; score: number }[];
    terms: {
      label: string;
      avgScore: number;
      rank: number;
      attendance: number;
      reportCardId: string;
    }[];
  };
  progressReports: {
    term: string;
    grade: string;
    percentage: number;
    rank: number;
    publishedOn: string;
    status: string;
    subjects: { subject: string; score: number; grade: string; remark?: string }[];
  }[];
  achievements: {
    title: string;
    description: string;
    tier: string;
    unlockedOn?: string;
  }[];
  certificates: {
    title: string;
    category: string;
    issuedOn: string;
    issuer: string;
    refNo: string;
  }[];
  competitions: {
    title: string;
    category: string;
    date: string;
    result: string;
    rank: string;
    venue: string;
  }[];
  examHistory: {
    title: string;
    term: string;
    subject: string;
    date: string;
    obtained: number;
    maxMarks: number;
    grade: string;
    status: string;
  }[];
  attendance: {
    monthLabel: string;
    present: number;
    absent: number;
    leave: number;
    workingDays: number;
    pct: number;
    classAvgPct: number;
  };
};

const PARENT_CHILD_ADDRESSES: Record<string, string> = {
  C1: studentProfile.address,
  C2: "45 Lakeview Enclave, Block C, Hyderabad — 500081",
  C3: "8 Civic Centre Lane, Madhapur, Hyderabad — 500033",
};

function emptyAcademic(): StudentIdQrPayload["academic"] {
  return {
    overallAvg: 0,
    rank: 0,
    classSize: 0,
    attendancePct: 0,
    performanceBySubject: [],
    termTrend: [],
    terms: [],
  };
}

function emptyAttendance(): StudentIdQrPayload["attendance"] {
  return {
    monthLabel: "—",
    present: 0,
    absent: 0,
    leave: 0,
    workingDays: 0,
    pct: 0,
    classAvgPct: 0,
  };
}

function payloadFromAdminSync(row: StudentIdCardSyncRow, origin = ""): StudentIdQrPayload {
  return {
    v: 2,
    type: "lumenx-student-profile",
    generatedAt: new Date().toISOString(),
    verifyUrl: buildStudentVerifyUrl(row.studentId, origin),
    identityOnly: true,
    photoDataUrl: row.photoDataUrl,
    identity: {
      studentId: row.studentId,
      name: row.name,
      rollNo: displayOrEmpty(row.rollNo),
      class: displayOrEmpty(row.classLabel),
      section: displayOrEmpty(row.section),
      institute: row.institute || "Test1School",
      address: displayOrEmpty(row.address),
      bloodGroup: displayOrEmpty(row.bloodGroup),
      emergencyContact: displayOrEmpty(row.emergencyContact),
      parentName: displayOrEmpty(row.parentName),
      house: displayOrEmpty(row.house),
      classTeacher: "—",
      email: displayOrEmpty(row.email),
      idCardIssuedOn: displayOrEmpty(row.idCardIssuedOn),
      idCardValidTill: displayOrEmpty(row.idCardValidTill),
    },
    academic: emptyAcademic(),
    progressReports: [],
    achievements: [],
    certificates: [],
    competitions: [],
    examHistory: [],
    attendance: emptyAttendance(),
  };
}

function defaultSnapshot(): Pick<
  StudentSnapshot,
  | "performance"
  | "trend"
  | "reportCards"
  | "achievements"
  | "certificates"
  | "competitions"
  | "examHistory"
  | "academicTerms"
  | "attendanceSummary"
> {
  return {
    performance: [...performance],
    trend: [...trend],
    reportCards: [...reportCards],
    achievements: [...achievements],
    certificates: [...studentCertificateRecords],
    competitions: [...studentCompetitions],
    examHistory: [...examHistory],
    academicTerms: [...academicTermSummaries],
    attendanceSummary: registerAttendanceSummary({
      id: studentProfile.id,
      classLabel: studentProfile.class,
      section: studentProfile.section,
      rollNo: studentProfile.rollNo,
    }),
  };
}

function buildPayloadObject(
  profile: StudentSnapshot["profile"],
  snapshot: Pick<
    StudentSnapshot,
    | "performance"
    | "trend"
    | "reportCards"
    | "achievements"
    | "certificates"
    | "competitions"
    | "examHistory"
    | "academicTerms"
    | "attendanceSummary"
  >,
  origin = "",
): StudentIdQrPayload {
  const latestTerm = snapshot.academicTerms[0];
  const unlockedAchievements = snapshot.achievements.filter((a) => a.unlockedOn);

  return {
    v: 2,
    type: "lumenx-student-profile",
    generatedAt: new Date().toISOString(),
    verifyUrl: buildStudentVerifyUrl(profile.id, origin),
    identity: {
      studentId: profile.id,
      name: profile.name,
      rollNo: profile.rollNo,
      class: profile.class,
      section: profile.section,
      institute: profile.institute,
      address: profile.address ?? "",
      bloodGroup: profile.bloodGroup,
      emergencyContact: profile.emergencyContact,
      parentName: profile.parentName,
      house: profile.house,
      classTeacher: profile.classTeacher,
      email: profile.email,
      idCardIssuedOn: profile.idCardIssuedOn,
      idCardValidTill: profile.idCardValidTill,
    },
    academic: {
      overallAvg:
        latestTerm?.avgScore ??
        (snapshot.performance.length > 0
          ? Math.round(
              snapshot.performance.reduce((sum, p) => sum + p.score, 0) /
                snapshot.performance.length,
            )
          : 0),
      rank: latestTerm?.rank ?? 0,
      classSize: latestTerm?.classSize ?? 0,
      attendancePct: snapshot.attendanceSummary.attendancePct,
      performanceBySubject: snapshot.performance.map((p) => ({
        subject: p.subject,
        score: p.score,
        prev: p.prev,
      })),
      termTrend: snapshot.trend.map((t) => ({ term: t.term, score: t.score })),
      terms: snapshot.academicTerms.map((t) => ({
        label: t.label,
        avgScore: t.avgScore,
        rank: t.rank,
        attendance: t.attendance,
        reportCardId: t.reportCardId,
      })),
    },
    progressReports: snapshot.reportCards
      .filter((rc) => rc.status === "published")
      .slice(0, 4)
      .map((rc) => ({
        term: rc.term,
        grade: rc.grade,
        percentage: rc.percentage,
        rank: rc.rank,
        publishedOn: rc.publishedOn,
        status: rc.status,
        subjects: rc.marks.map((m) => ({
          subject: m.subject,
          score: m.total,
          grade: m.grade,
          remark: m.remark || undefined,
        })),
      })),
    achievements: unlockedAchievements.slice(0, 10).map((a) => ({
      title: a.title,
      description: a.description,
      tier: a.tier,
      unlockedOn: a.unlockedOn,
    })),
    certificates: snapshot.certificates.map((c) => ({
      title: c.title,
      category: c.category,
      issuedOn: c.issuedOn,
      issuer: c.issuer,
      refNo: c.refNo,
    })),
    competitions: snapshot.competitions.map((c) => ({
      title: c.title,
      category: c.category,
      date: c.date,
      result: c.result,
      rank: c.rank,
      venue: c.venue,
    })),
    examHistory: snapshot.examHistory
      .filter((e) => e.status === "completed")
      .slice(0, 8)
      .map((e) => ({
        title: e.title,
        term: e.term,
        subject: e.subject,
        date: e.date,
        obtained: e.obtained,
        maxMarks: e.maxMarks,
        grade: e.grade,
        status: e.status,
      })),
    attendance: {
      monthLabel: snapshot.attendanceSummary.monthLabel,
      present: snapshot.attendanceSummary.present,
      absent: snapshot.attendanceSummary.absent,
      leave: snapshot.attendanceSummary.leave,
      workingDays: snapshot.attendanceSummary.workingDays,
      pct: snapshot.attendanceSummary.attendancePct,
      classAvgPct: snapshot.attendanceSummary.classAvgPct,
    },
  };
}

/** Absolute URL for the public student profile page (no login). */
export function buildStudentVerifyUrl(studentId: string, origin = ""): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const path = `/verify/${encodeURIComponent(studentId)}`;
  return base ? `${base}${path}` : path;
}

export function buildVerificationProfileFromSnapshot(
  snapshot: StudentSnapshot,
  origin = "",
): StudentIdQrPayload {
  return buildPayloadObject(snapshot.profile, snapshot, origin);
}

function snapshotForChild(child: Child, studentId: string): StudentSnapshot {
  const scale = child.avgScore / 84;
  const scaledPerformance = performance.map((p) => ({
    ...p,
    score: Math.min(100, Math.round(p.score * scale)),
    prev: Math.min(100, Math.round(p.prev * scale)),
  }));
  const attendanceSummary = registerAttendanceSummary({
    id: studentId,
    classLabel: child.className,
    section: child.section,
    rollNo: child.rollNo,
  });

  return {
    profile: {
      ...studentProfile,
      id: studentId,
      name: child.name,
      class: child.className,
      section: child.section,
      rollNo: child.rollNo,
      attendance: attendanceSummary.attendancePct,
      address: PARENT_CHILD_ADDRESSES[child.id] ?? studentProfile.address,
    },
    performance: scaledPerformance,
    trend: [...trend],
    reportCards: [...reportCards],
    achievements: [...achievements],
    certificates: [...studentCertificateRecords],
    competitions: [...studentCompetitions],
    examHistory: [...examHistory],
    academicTerms: academicTermSummaries.map((t) => ({
      ...t,
      avgScore: Math.min(100, Math.round(t.avgScore * scale)),
      attendance: attendanceSummary.attendancePct,
    })),
    attendanceSummary,
  } as StudentSnapshot;
}

/** Demo lookup for public verify page and QR preview. Prefers Admin sync for STU-* IDs. */
export function resolveStudentVerificationProfile(
  studentId: string,
  origin = "",
): StudentIdQrPayload | null {
  const normalized = decodeURIComponent(studentId).trim();
  const canonical = resolveCanonicalStudentId(normalized);

  const syncRow = findIdCardSyncRow(normalized) ?? findIdCardSyncRow(canonical);
  if (syncRow) {
    return payloadFromAdminSync(syncRow, origin);
  }

  if (normalized === studentProfile.id || canonical === studentProfile.id) {
    return buildPayloadObject(studentProfile, defaultSnapshot(), origin);
  }

  const childIndex = allChildren.findIndex((_, i) => `S-${2040 + i}` === normalized);
  if (childIndex >= 0) {
    const snap = snapshotForChild(allChildren[childIndex]!, normalized);
    return buildPayloadObject(snap.profile, snap, origin);
  }

  if (normalized.startsWith("S-") || normalized.startsWith("STU-")) {
    return buildPayloadObject(
      {
        ...studentProfile,
        id: normalized.startsWith("STU-") ? normalized : canonical,
      },
      defaultSnapshot(),
      origin,
    );
  }

  return null;
}
