import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import { listComplaintsForActor } from "../complaints/service.js";
import { listMarksForInstitute } from "../attendance/repository.js";
import { listStudents } from "../students/repository.js";
import { listEmergencies } from "../transport/ops-repository.js";
import { listRecentSchoolAlerts } from "../school-alerts/repository.js";
import type { AlertFireDto, AlertRuleRow } from "./types.js";

const DEFAULT_ATTENDANCE_THRESHOLD = 75;

type CandidateFire = Omit<AlertFireDto, "id" | "at"> & {
  detail: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
};

function attendancePct(present: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((present / total) * 100);
}

async function evaluateAttendanceRules(
  admin: SupabaseClient,
  instituteId: string,
  rules: AlertRuleRow[],
): Promise<CandidateFire[]> {
  const marks = await listMarksForInstitute(admin, instituteId);
  if (marks.length === 0) return [];

  const students = await listStudents(admin, { instituteId, status: "active" });
  const nameById = new Map(students.map((s) => [s.id, s.display_name?.trim() || "Student"]));

  const byStudent = new Map<string, { present: number; total: number }>();
  for (const mark of marks) {
    const row = byStudent.get(mark.student_id) ?? { present: 0, total: 0 };
    row.total += 1;
    if (mark.status === "present" || mark.status === "late") row.present += 1;
    byStudent.set(mark.student_id, row);
  }

  const fires: CandidateFire[] = [];
  for (const rule of rules) {
    const threshold =
      typeof rule.config?.threshold_pct === "number"
        ? rule.config.threshold_pct
        : DEFAULT_ATTENDANCE_THRESHOLD;

    for (const [studentId, stats] of byStudent) {
      const pct = attendancePct(stats.present, stats.total);
      if (pct >= threshold) continue;
      const name = nameById.get(studentId) ?? "Student";
      fires.push({
        ruleId: rule.id,
        title: `${rule.name}: ${name} at ${pct}%`,
        detail: `${name} attendance is ${pct}% (threshold ${threshold}%).`,
        dedupeKey: `attendance:${rule.id}:${studentId}`,
        metadata: { studentId, attendancePct: pct, thresholdPct: threshold },
      });
    }
  }
  return fires;
}

async function evaluateComplaintRules(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  rules: AlertRuleRow[],
): Promise<CandidateFire[]> {
  let complaints: Awaited<ReturnType<typeof listComplaintsForActor>> = [];
  try {
    complaints = await listComplaintsForActor(admin, actor, { instituteId });
  } catch {
    return [];
  }

  const openHigh = complaints.filter(
    (c) =>
      c.priority === "high" &&
      (c.status === "pending" || c.status === "review" || c.status === "forwarded"),
  );

  const fires: CandidateFire[] = [];
  for (const rule of rules) {
    for (const c of openHigh) {
      fires.push({
        ruleId: rule.id,
        title: `${rule.name}: ${c.title}`,
        detail: c.title,
        complaintId: c.id,
        dedupeKey: `complaint:${rule.id}:${c.id}`,
        metadata: { complaintId: c.id },
      });
    }
  }
  return fires;
}

async function evaluateSecurityRules(
  admin: SupabaseClient,
  instituteId: string,
  rules: AlertRuleRow[],
): Promise<CandidateFire[]> {
  const open = await listEmergencies(admin, instituteId, "open");
  if (open.length === 0) return [];

  const fires: CandidateFire[] = [];
  for (const rule of rules) {
    for (const emergency of open) {
      fires.push({
        ruleId: rule.id,
        title: `${rule.name}: ${emergency.emergency_type} emergency`,
        detail: emergency.note?.trim() || "Open transport emergency requires attention.",
        dedupeKey: `security:${rule.id}:${emergency.id}`,
        metadata: { emergencyId: emergency.id },
      });
    }
  }
  return fires;
}

async function evaluateEmergencyRules(
  admin: SupabaseClient,
  instituteId: string,
  rules: AlertRuleRow[],
): Promise<CandidateFire[]> {
  const alerts = await listRecentSchoolAlerts(admin, instituteId, 20);
  const recentEmergency = alerts.filter((a) => a.severity === "emergency");
  if (recentEmergency.length === 0) return [];

  const fires: CandidateFire[] = [];
  for (const rule of rules) {
    for (const alert of recentEmergency) {
      fires.push({
        ruleId: rule.id,
        title: `${rule.name}: ${alert.title}`,
        detail: alert.summary || alert.title,
        dedupeKey: `emergency:${rule.id}:${alert.id}`,
        metadata: { schoolAlertId: alert.id },
      });
    }
  }
  return fires;
}

/** Warning rules: flag institutes with any open high-priority complaints (lighter signal). */
async function evaluateWarningRules(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  rules: AlertRuleRow[],
): Promise<CandidateFire[]> {
  let complaints: Awaited<ReturnType<typeof listComplaintsForActor>> = [];
  try {
    complaints = await listComplaintsForActor(admin, actor, { instituteId });
  } catch {
    return [];
  }
  const openMediumPlus = complaints.filter(
    (c) =>
      (c.priority === "high" || c.priority === "medium") &&
      c.status !== "resolved" &&
      c.status !== "closed",
  );
  if (openMediumPlus.length === 0) return [];

  return rules.map((rule) => ({
    ruleId: rule.id,
    title: `${rule.name}: ${openMediumPlus.length} open issue(s)`,
    detail: `${openMediumPlus.length} complaints need follow-up.`,
    dedupeKey: `warning:${rule.id}:${openMediumPlus.length}`,
    metadata: { openCount: openMediumPlus.length },
  }));
}

export async function collectCandidateFires(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  rules: AlertRuleRow[],
): Promise<CandidateFire[]> {
  const byKey = rules.reduce(
    (acc, rule) => {
      const list = acc.get(rule.icon_key) ?? [];
      list.push(rule);
      acc.set(rule.icon_key, list);
      return acc;
    },
    new Map<string, AlertRuleRow[]>(),
  );

  const batches = await Promise.all([
    evaluateAttendanceRules(admin, instituteId, byKey.get("attendance") ?? []),
    evaluateComplaintRules(admin, actor, instituteId, byKey.get("complaint") ?? []),
    evaluateWarningRules(admin, actor, instituteId, byKey.get("warning") ?? []),
    evaluateSecurityRules(admin, instituteId, byKey.get("security") ?? []),
    evaluateEmergencyRules(admin, instituteId, byKey.get("emergency") ?? []),
  ]);

  return batches.flat();
}
