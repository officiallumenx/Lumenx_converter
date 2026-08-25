/** Persist Admin alert rules and evaluate simple local triggers. */

import { ADMIN_EXAMS } from "@/lib/admin-module-data";
import {
  attendanceDedupeKey,
  complaintDedupeKey,
  isActiveDedupe,
  normalizeFireRecord,
  reconcileAttendanceFires,
  reconcileComplaintFires,
  reconcileWeakPerformanceFires,
  weakPerformanceDedupeKey,
  type AlertFireRecord,
} from "@/lib/alert-rule-dedupe";
import {
  ATTENDANCE_DROP_THRESHOLD_PCT,
  buildStudentExamScores,
  findConsecutiveLowExamPerformance,
  findStudentsBelowAttendanceThreshold,
  findUnresolvedHighPriorityAdminComplaints,
  WEAK_PERFORMANCE_CONSECUTIVE_EXAMS,
  WEAK_PERFORMANCE_THRESHOLD_PCT,
} from "@/lib/alert-rule-evaluators";
import { DEMO_COMPLAINTS_SEED } from "@/lib/complaints-data";
import { getMarkEntriesSnapshot } from "@/lib/marks-entry-store";
import { loadStudentDirectory } from "@/lib/student-directory-store";
import { prependAdminNotification } from "@/lib/notification-center-store";
import type { NotificationCategory } from "@lumenx/types";
import { appendBroadcastInbox, loadBroadcastInbox, loadDemoComplaints } from "@lumenx/utils";
import { notifyAttendancePercentageWarning, toAttendanceStudentId } from "@lumenx/module-attendance";
import { createLocalStorageStore } from "@/lib/client-data-store";

export type AlertRuleIconKey =
  | "attendance"
  | "warning"
  | "complaint"
  | "security"
  | "emergency";

export type AlertRuleRecord = {
  id: string;
  name: string;
  iconKey: AlertRuleIconKey;
  desc: string;
  priority: "P0" | "P2";
  channels: string[];
  audience: string;
  active: boolean;
  config?: {
    thresholdPct?: number;
    consecutiveExams?: number;
  };
};

export type FiredAlert = AlertFireRecord;
export type RuleAlertSeverity = "mandatory" | "emergency";

type AlertRulesState = {
  rules: AlertRuleRecord[];
  fired: FiredAlert[];
};

const STORAGE_KEY = "lumenx.admin.alert-rules.v1";

const SEED_RULES: AlertRuleRecord[] = [
  {
    id: "1",
    name: "Attendance drop",
    iconKey: "attendance",
    desc: "Triggers when a student's monthly attendance falls below 75%.",
    priority: "P2",
    channels: ["Email", "Parent app"],
    audience: "Class teacher · Parent",
    active: true,
    config: { thresholdPct: ATTENDANCE_DROP_THRESHOLD_PCT },
  },
  {
    id: "2",
    name: "Weak performance",
    iconKey: "warning",
    desc: "Triggers on two consecutive exam scores under 40%.",
    priority: "P2",
    channels: ["Email", "Counsellor"],
    audience: "HoD · Parent",
    active: true,
    config: {
      thresholdPct: WEAK_PERFORMANCE_THRESHOLD_PCT,
      consecutiveExams: WEAK_PERFORMANCE_CONSECUTIVE_EXAMS,
    },
  },
  {
    id: "3",
    name: "Complaint escalation",
    iconKey: "complaint",
    desc: "Triggers when a P0/P1 complaint sits unresolved past SLA.",
    priority: "P0",
    channels: ["SMS", "Push", "Email"],
    audience: "Principal · Admin",
    active: true,
  },
  {
    id: "4",
    name: "Security incident",
    iconKey: "security",
    desc: "Triggers on multiple failed admin logins or token tampering.",
    priority: "P0",
    channels: ["SMS", "PagerDuty"],
    audience: "Root admins",
    active: true,
  },
  {
    id: "5",
    name: "Emergency broadcast",
    iconKey: "emergency",
    desc: "Manual critical alert — title, message, and targeted audience.",
    priority: "P0",
    channels: ["All channels"],
    audience: "Configurable",
    active: false,
  },
];

function normalizeState(state: AlertRulesState): AlertRulesState {
  return {
    ...state,
    fired: state.fired.map((row) => normalizeFireRecord(row)),
  };
}

const alertRulesStore = createLocalStorageStore<AlertRulesState>({
  storageKey: STORAGE_KEY,
  eventName: "lumenx-alert-rules-changed",
  seed: () => ({ rules: SEED_RULES.map((rule) => ({ ...rule })), fired: [] }),
  normalize: normalizeState,
  parse: (raw) => {
    const parsed = JSON.parse(raw) as AlertRulesState;
    if (!parsed || !Array.isArray(parsed.rules)) {
      return { rules: SEED_RULES.map((rule) => ({ ...rule })), fired: [] };
    }
    return normalizeState({
      rules: parsed.rules,
      fired: Array.isArray(parsed.fired) ? parsed.fired : [],
    });
  },
});

export function loadAlertRulesState(): AlertRulesState {
  return alertRulesStore.load();
}

export function subscribeAlertRules(listener: () => void): () => void {
  return alertRulesStore.subscribe(listener);
}

export function useAlertRulesState(): AlertRulesState {
  return alertRulesStore.useSnapshot();
}

export function setAlertRules(rules: AlertRuleRecord[]): void {
  alertRulesStore.mutate((state) => ({ ...state, rules }));
}

export function toggleAlertRuleActive(id: string): void {
  alertRulesStore.mutate((state) => ({
    ...state,
    rules: state.rules.map((rule) =>
      rule.id === id ? { ...rule, active: !rule.active } : rule,
    ),
  }));
  scheduleAlertRuleEvaluation();
}

export function addAlertRule(rule: AlertRuleRecord): void {
  alertRulesStore.mutate((state) => ({ ...state, rules: [...state.rules, rule] }));
}

export function updateAlertRuleConfig(
  id: string,
  patch: Partial<NonNullable<AlertRuleRecord["config"]>>,
): void {
  alertRulesStore.mutate((state) => ({
    ...state,
    rules: state.rules.map((rule) =>
      rule.id === id
        ? {
            ...rule,
            config: {
              ...(rule.config ?? {}),
              ...patch,
            },
          }
        : rule,
    ),
  }));
}

export function resolveAlertFire(id: string): void {
  const now = new Date().toISOString();
  alertRulesStore.mutate((state) => ({
    ...state,
    fired: state.fired.map((row) =>
      row.id === id ? { ...row, resolvedAt: row.resolvedAt ?? now } : row,
    ),
  }));
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Parse Admin `grade` labels like `10-A` into class + section for attendance ids. */
function splitGradeClassSection(grade: string): { classLabel: string; section: string } {
  const trimmed = (grade ?? "").trim();
  const m = trimmed.match(/^(.+)-([A-Za-z0-9]+)$/);
  if (m) return { classLabel: m[1]!.trim(), section: m[2]!.toUpperCase() };
  return { classLabel: trimmed || "NA", section: "A" };
}

type RuleDispatchInput = {
  fired: FiredAlert;
  notificationTitle: string;
  rule: AlertRuleRecord;
  severity: RuleAlertSeverity;
  category: NotificationCategory;
  href: string;
  broadcastPriority: "normal" | "high" | "critical";
  detail: string;
};

function dispatchRuleAlert(input: RuleDispatchInput, now: string): void {
  const priority = input.severity === "emergency" ? "high" : "normal";
  const type = input.severity === "emergency" ? "warning" : "info";
  const inbox = loadBroadcastInbox();
  if (!inbox.some((row) => row.id === input.fired.id)) {
    appendBroadcastInbox({
      id: input.fired.id,
      title: input.notificationTitle,
      message: input.fired.title,
      audience: input.rule.audience,
      priority: input.broadcastPriority,
      time: "Just now",
    });
  }
  prependAdminNotification({
    id: input.fired.id,
    title: input.notificationTitle,
    desc: input.fired.title,
    time: "Just now",
    unread: true,
    createdAt: now,
    type,
    priority,
    href: input.href,
    category: input.category,
    detail: input.detail,
  });
}

/**
 * Reserve a fire in the store before side effects.
 * Returns the record when the dedupe key is new; null when already active.
 */
function tryReserveAlertFire(
  dedupeKey: string,
  build: () => Omit<FiredAlert, "dedupeKey" | "resolvedAt">,
): FiredAlert | null {
  let reserved: FiredAlert | null = null;
  alertRulesStore.mutate((current) => {
    const fired = current.fired.map((row) => normalizeFireRecord(row));
    if (isActiveDedupe(fired, dedupeKey)) return current;
    const record: FiredAlert = { ...build(), dedupeKey };
    reserved = record;
    return { ...current, fired: [record, ...fired] };
  });
  return reserved;
}

function applyFiredReconciliation(nextFired: FiredAlert[]): void {
  alertRulesStore.mutate((current) => {
    const normalized = current.fired.map((row) => normalizeFireRecord(row));
    const changed =
      normalized.length !== nextFired.length ||
      normalized.some(
        (row, index) =>
          row.dedupeKey !== nextFired[index]?.dedupeKey ||
          row.resolvedAt !== nextFired[index]?.resolvedAt,
      );
    if (!changed) return current;
    return { ...current, fired: nextFired };
  });
}

/** Evaluate attendance-drop once per call; writes only when new fires exist. */
export function evaluateAttendanceDropAlerts(): number {
  const state = alertRulesStore.load();
  const rule = state.rules.find((row) => row.id === "1" && row.active);
  if (!rule) return 0;

  const today = dayKey(new Date().toISOString());
  const now = new Date().toISOString();
  const thresholdPct = Math.max(1, Number(rule.config?.thresholdPct ?? ATTENDANCE_DROP_THRESHOLD_PCT));
  const belowThreshold = findStudentsBelowAttendanceThreshold(
    loadStudentDirectory(),
    thresholdPct,
  );
  const belowIds = new Set(belowThreshold.map((student) => student.id));

  applyFiredReconciliation(
    reconcileAttendanceFires(state.fired, belowIds, today, now),
  );

  let created = 0;
  for (const student of belowThreshold) {
    const dedupeKey = attendanceDedupeKey(rule.id, student.id, today);
    const reserved = tryReserveAlertFire(dedupeKey, () => ({
      id: `fire-att-${student.id}-${today}`,
      ruleId: rule.id,
      title: `${student.name}: attendance ${student.attendance}% (below ${thresholdPct}%)`,
      at: now,
      studentId: student.id,
    }));
    if (!reserved) continue;
    dispatchRuleAlert(
      {
        fired: reserved,
        notificationTitle: "Attendance drop",
        rule,
        severity: "mandatory",
        category: "attendance",
        href: "/attendance",
        broadcastPriority: "high",
        detail: [
          `Student: ${student.name}`,
          `Class: ${student.grade}`,
          `Attendance: ${student.attendance}%`,
          `Threshold: < ${thresholdPct}%`,
          `Detected at: ${new Date(reserved.at).toLocaleString("en-IN")}`,
        ].join("\n"),
      },
      now,
    );
    const { classLabel, section } = splitGradeClassSection(student.grade);
    const attendanceStudentId = toAttendanceStudentId({
      id: student.id,
      classLabel,
      section,
      rollNo: "rollNo" in student ? (student as { rollNo?: string }).rollNo : undefined,
    });
    notifyAttendancePercentageWarning({
      studentId: attendanceStudentId,
      studentName: student.name,
      attendancePct: student.attendance,
      thresholdPct,
      date: today,
      notifyStudent: true,
    });
    created += 1;
  }

  return created;
}

/** Evaluate weak-performance rule from published mark entries. */
export function evaluateWeakPerformanceAlerts(): number {
  const state = alertRulesStore.load();
  const rule = state.rules.find((row) => row.id === "2" && row.active);
  if (!rule) return 0;

  const now = new Date().toISOString();
  const thresholdPct = Math.max(1, Number(rule.config?.thresholdPct ?? WEAK_PERFORMANCE_THRESHOLD_PCT));
  const consecutiveExams = Math.max(
    2,
    Number(rule.config?.consecutiveExams ?? WEAK_PERFORMANCE_CONSECUTIVE_EXAMS),
  );
  const examOrder = ADMIN_EXAMS.map((exam) => exam.id);
  const matches = findConsecutiveLowExamPerformance(
    buildStudentExamScores(getMarkEntriesSnapshot()),
    examOrder,
    thresholdPct,
    consecutiveExams,
  );

  applyFiredReconciliation(reconcileWeakPerformanceFires(state.fired, matches, rule.id, now));

  let created = 0;
  for (const match of matches) {
    const dedupeKey = weakPerformanceDedupeKey(rule.id, match.studentId, match.examIds);
    const examLabel = match.examIds.join(", ");
    const pctLabel = match.pcts.join("%, ") + "%";
    const title = `${match.studentName}: ${consecutiveExams} consecutive exams below ${thresholdPct}% (${examLabel}: ${pctLabel})`;
    const reserved = tryReserveAlertFire(dedupeKey, () => ({
      id: `fire-marks-${match.studentId}-${match.examIds.join("-")}`,
      ruleId: rule.id,
      title,
      at: now,
      studentId: match.studentId,
    }));
    if (!reserved) continue;
    dispatchRuleAlert(
      {
        fired: reserved,
        notificationTitle: "Weak performance",
        rule,
        severity: "mandatory",
        category: "academic",
        href: "/marks",
        broadcastPriority: "high",
        detail: [
          `Student: ${match.studentName}`,
          `Consecutive exams below ${thresholdPct}%: ${examLabel}`,
          `Exam percentages: ${pctLabel}`,
          `Detected at: ${new Date(reserved.at).toLocaleString("en-IN")}`,
        ].join("\n"),
      },
      now,
    );
    created += 1;
  }

  return created;
}

/**
 * Evaluate complaint escalation for high-priority admin-queue items.
 * Demo complaints have no SLA timestamps — only priority, routing, and status are checked.
 */
export function evaluateComplaintEscalationAlerts(): number {
  const state = alertRulesStore.load();
  const rule = state.rules.find((row) => row.id === "3" && row.active);
  if (!rule) return 0;

  const now = new Date().toISOString();
  const complaints = loadDemoComplaints(DEMO_COMPLAINTS_SEED);
  const activeComplaints = findUnresolvedHighPriorityAdminComplaints(complaints);

  applyFiredReconciliation(reconcileComplaintFires(state.fired, activeComplaints, rule.id, now));

  let created = 0;
  for (const complaint of activeComplaints) {
    const dedupeKey = complaintDedupeKey(rule.id, complaint.id);
    const title = `${complaint.title} · ${complaint.status} · from ${complaint.from}`;
    const reserved = tryReserveAlertFire(dedupeKey, () => ({
      id: `fire-cmp-${complaint.id}`,
      ruleId: rule.id,
      title,
      at: now,
      complaintId: complaint.id,
    }));
    if (!reserved) continue;
    dispatchRuleAlert(
      {
        fired: reserved,
        notificationTitle: "Complaint escalation",
        rule,
        severity: "emergency",
        category: "circulars",
        href: "/complaints",
        broadcastPriority: "critical",
        detail: [
          `Complaint ID: ${complaint.id}`,
          `Title: ${complaint.title}`,
          `From: ${complaint.from} (${complaint.role})`,
          `Priority: ${complaint.priority}`,
          `Status: ${complaint.status}`,
          `Queue: ${complaint.destination}`,
          `Detected at: ${new Date(reserved.at).toLocaleString("en-IN")}`,
        ].join("\n"),
      },
      now,
    );
    created += 1;
  }

  return created;
}

let evaluateInFlight = false;

/** Run all evaluators backed by existing local/demo data. Security and manual rules are skipped. */
export function evaluateAllAlertRules(): number {
  if (evaluateInFlight) return 0;
  evaluateInFlight = true;
  try {
    return (
      evaluateAttendanceDropAlerts() +
      evaluateWeakPerformanceAlerts() +
      evaluateComplaintEscalationAlerts()
    );
  } finally {
    evaluateInFlight = false;
  }
}

let evaluationQueued = false;

/**
 * Coalesce evaluation requests (e.g. React Strict Mode double effects).
 * Side effects run outside render; safe to call from useEffect.
 */
export function scheduleAlertRuleEvaluation(): void {
  if (evaluationQueued) return;
  evaluationQueued = true;
  queueMicrotask(() => {
    evaluationQueued = false;
    evaluateAllAlertRules();
  });
}

export function countFiredInLastHours(hours: number): number {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return alertRulesStore.load().fired.filter((row) => {
    const at = Date.parse(row.at);
    return Number.isFinite(at) && at >= cutoff;
  }).length;
}
