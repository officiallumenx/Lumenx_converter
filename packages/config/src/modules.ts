import { MODULE_IDS, type Plan } from "./module-ids";

export type OwnerApp = "nexus" | "admin" | "connect" | "transport";

export interface ModuleDefinition {
  id: (typeof MODULE_IDS)[keyof typeof MODULE_IDS];
  name: string;
  minPlan: Plan;
  owner: OwnerApp;
  packageName: string;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { id: MODULE_IDS.students, name: "Students", minPlan: "core", owner: "admin", packageName: "@lumenx/module-students" },
  { id: MODULE_IDS.teachers, name: "Teachers", minPlan: "core", owner: "admin", packageName: "@lumenx/module-teachers" },
  { id: MODULE_IDS.parents, name: "Parents", minPlan: "core", owner: "admin", packageName: "@lumenx/module-parents" },
  { id: MODULE_IDS.attendance, name: "Attendance", minPlan: "core", owner: "admin", packageName: "@lumenx/module-attendance" },
  { id: MODULE_IDS.notifications, name: "Notifications", minPlan: "core", owner: "admin", packageName: "@lumenx/module-notifications" },
  { id: MODULE_IDS.timetable, name: "Timetable", minPlan: "plus", owner: "admin", packageName: "@lumenx/module-timetable" },
  { id: MODULE_IDS.exams, name: "Exams", minPlan: "plus", owner: "admin", packageName: "@lumenx/module-exams" },
  { id: MODULE_IDS.fees, name: "Fees", minPlan: "plus", owner: "admin", packageName: "@lumenx/module-fees" },
  { id: MODULE_IDS.complaints, name: "Complaints", minPlan: "plus", owner: "admin", packageName: "@lumenx/module-complaints" },
  { id: MODULE_IDS.analytics, name: "Analytics", minPlan: "plus", owner: "nexus", packageName: "@lumenx/module-analytics" },
  { id: MODULE_IDS.admissions, name: "Admissions", minPlan: "plus", owner: "admin", packageName: "@lumenx/module-admissions" },
  { id: MODULE_IDS.transport, name: "Transport", minPlan: "plus", owner: "transport", packageName: "@lumenx/module-transport" },
  { id: MODULE_IDS.careers, name: "Careers", minPlan: "max", owner: "admin", packageName: "@lumenx/module-careers" },
  { id: MODULE_IDS.certificates, name: "Certificates", minPlan: "max", owner: "nexus", packageName: "@lumenx/module-certificates" },
];

export function isModuleEnabled(moduleId: string, plan: Plan): boolean {
  const mod = MODULE_REGISTRY.find((m) => m.id === moduleId);
  if (!mod) return false;
  const order: Plan[] = ["core", "plus", "max"];
  return order.indexOf(plan) >= order.indexOf(mod.minPlan);
}
