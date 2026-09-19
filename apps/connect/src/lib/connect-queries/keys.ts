/**
 * Canonical Connect TanStack Query keys.
 * Always include instituteId (and child/teacher/section where scoped).
 */

export const connectQueryRoots = {
  teacherPortal: "teacher-portal",
  parentPortal: "parent-portal",
  studentPortal: "student-portal",
  activityWorkspace: "activity-workspace",
  attendance: "attendance",
  fees: "fees",
  marks: "marks",
  homework: "homework",
  timetable: "timetable",
  diary: "diary",
  messages: "messages",
  events: "events",
  exams: "exams",
  leave: "leave",
  inbox: "inbox",
  announcements: "announcements",
  complaints: "complaints",
  transport: "transport",
  students: "students",
  remarks: "remarks",
  teachers: "teachers",
  schoolAlerts: "school-alerts",
  certificates: "certificates",
  enrollmentHistory: "enrollment-history",
  activities: "activities",
  prefs: "prefs",
  holidays: "holidays",
} as const;

export const connectQueryKeys = {
  teacherPortal: (instituteId: string) =>
    [connectQueryRoots.teacherPortal, instituteId] as const,
  teacherPortalBundle: (instituteId: string) =>
    [connectQueryRoots.teacherPortal, instituteId, "bundle"] as const,
  parentPortal: (instituteId: string, childId: string) =>
    [connectQueryRoots.parentPortal, instituteId, childId] as const,
  studentPortal: (instituteId: string) =>
    [connectQueryRoots.studentPortal, instituteId] as const,
  activityWorkspace: (instituteId: string) =>
    [connectQueryRoots.activityWorkspace, instituteId, "dashboard"] as const,

  attendanceTeacher: (instituteId: string, sectionId: string, date: string) =>
    [connectQueryRoots.attendance, "teacher", instituteId, sectionId, date] as const,
  attendanceLearner: (instituteId: string, studentId: string, from: string, to: string) =>
    [connectQueryRoots.attendance, "learner", instituteId, studentId, from, to] as const,
  attendanceTeacherSelf: (instituteId: string, teacherId: string) =>
    [connectQueryRoots.attendance, "teacher-self", instituteId, teacherId] as const,
  holidays: (instituteId: string) =>
    [connectQueryRoots.holidays, instituteId] as const,

  feesTeacher: (instituteId: string) =>
    [connectQueryRoots.fees, "teacher", instituteId] as const,
  feesParent: (instituteId: string) =>
    [connectQueryRoots.fees, "parent", instituteId] as const,
  feesStudent: (instituteId: string, studentId: string) =>
    [connectQueryRoots.fees, "student", instituteId, studentId] as const,

  marksSheet: (
    instituteId: string,
    sectionId: string,
    examId: string,
    subjectId: string,
  ) =>
    [connectQueryRoots.marks, "sheet", instituteId, sectionId, examId, subjectId] as const,
  marksParent: (instituteId: string) =>
    [connectQueryRoots.marks, "parent", instituteId] as const,
  marksStudent: (instituteId: string, studentId: string) =>
    [connectQueryRoots.marks, "student", instituteId, studentId] as const,

  homeworkTeacher: (instituteId: string, teacherId: string) =>
    [connectQueryRoots.homework, "teacher", instituteId, teacherId] as const,
  homeworkParent: (instituteId: string) =>
    [connectQueryRoots.homework, "parent", instituteId] as const,
  homeworkStudent: (instituteId: string, studentId: string) =>
    [connectQueryRoots.homework, "student", instituteId, studentId] as const,

  timetableTeacher: (instituteId: string, scope: string) =>
    [connectQueryRoots.timetable, "teacher", instituteId, scope] as const,
  timetableLearner: (instituteId: string, studentId: string) =>
    [connectQueryRoots.timetable, "learner", instituteId, studentId] as const,

  diaryTeacher: (instituteId: string, scope: string, date: string) =>
    [connectQueryRoots.diary, "teacher", instituteId, scope, date] as const,
  diaryLearner: (instituteId: string) =>
    [connectQueryRoots.diary, "learner", instituteId] as const,

  messagesThreads: (instituteId: string) =>
    [connectQueryRoots.messages, "threads", instituteId] as const,

  events: (instituteId: string) => [connectQueryRoots.events, instituteId] as const,

  examsTeacher: (instituteId: string) =>
    [connectQueryRoots.exams, "teacher", instituteId] as const,
  examsLearner: (instituteId: string, studentId: string) =>
    [connectQueryRoots.exams, "learner", instituteId, studentId] as const,

  leaveTeacher: (instituteId: string, teacherId: string) =>
    [connectQueryRoots.leave, "teacher", instituteId, teacherId] as const,
  leaveParent: (instituteId: string, studentId: string) =>
    [connectQueryRoots.leave, "parent", instituteId, studentId] as const,

  inbox: (instituteId: string, role: string) =>
    [connectQueryRoots.inbox, instituteId, role] as const,

  announcements: (instituteId: string) =>
    [connectQueryRoots.announcements, instituteId] as const,
  announcement: (instituteId: string, id: string) =>
    [connectQueryRoots.announcements, instituteId, id] as const,

  complaintsTeacher: (instituteId: string) =>
    [connectQueryRoots.complaints, "teacher", instituteId] as const,
  complaintsLearner: (instituteId: string) =>
    [connectQueryRoots.complaints, "learner", instituteId] as const,

  transportTeacher: (instituteId: string) =>
    [connectQueryRoots.transport, "teacher", instituteId] as const,
  transportLearner: (instituteId: string, studentId: string) =>
    [connectQueryRoots.transport, "learner", instituteId, studentId] as const,

  studentDetail: (instituteId: string, studentId: string) =>
    [connectQueryRoots.students, "detail", instituteId, studentId] as const,
  remarks: (instituteId: string) => [connectQueryRoots.remarks, instituteId] as const,
  teachersLearner: (instituteId: string, studentId: string) =>
    [connectQueryRoots.teachers, "learner", instituteId, studentId] as const,
  schoolAlerts: (instituteId: string) =>
    [connectQueryRoots.schoolAlerts, instituteId] as const,
  certificates: (instituteId: string, studentId: string) =>
    [connectQueryRoots.certificates, instituteId, studentId] as const,
  enrollmentHistory: (instituteId: string, studentId: string) =>
    [connectQueryRoots.enrollmentHistory, instituteId, studentId] as const,
  activitiesLearner: (instituteId: string, studentId: string) =>
    [connectQueryRoots.activities, "learner", instituteId, studentId] as const,
  prefsTeacher: (instituteId: string) =>
    [connectQueryRoots.prefs, "teacher", instituteId] as const,
};

/** Roots invalidated on Connect soft refresh for the active session. */
export const CONNECT_SOFT_REFRESH_ROOTS = Object.values(connectQueryRoots);
