export const PLANS = ["core", "plus", "max"] as const;
export type Plan = (typeof PLANS)[number];

export const MODULE_IDS = {
  students: "lumenx.module.students",
  teachers: "lumenx.module.teachers",
  parents: "lumenx.module.parents",
  attendance: "lumenx.module.attendance",
  fees: "lumenx.module.fees",
  exams: "lumenx.module.exams",
  timetable: "lumenx.module.timetable",
  transport: "lumenx.module.transport",
  admissions: "lumenx.module.admissions",
  careers: "lumenx.module.careers",
  certificates: "lumenx.module.certificates",
  complaints: "lumenx.module.complaints",
  notifications: "lumenx.module.notifications",
  analytics: "lumenx.module.analytics",
} as const;
