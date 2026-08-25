import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_NOTIFICATION_CENTER_KEY,
  getAdminNotifications,
} from "./notification-center-store";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.stubGlobal("window", {
  dispatchEvent: vi.fn(() => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  CustomEvent: globalThis.CustomEvent ?? class CE extends Event {
    detail: unknown;
    constructor(type: string, opts?: { detail?: unknown }) {
      super(type);
      this.detail = opts?.detail;
    }
  },
});

vi.mock("@lumenx/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/types")>();
  return { ...actual, readDemoProfileId: () => "multi_institute" as const };
});

const ALERT_RULES_KEY = "lumenx.admin.alert-rules.v1";
const BROADCAST_KEY = "lumenx.demo.broadcast-inbox.v1";

async function loadAlertsModule() {
  vi.resetModules();
  return import("./alert-rules-store");
}

function seedNotificationInbox() {
  const seed = [
    {
      id: "admin-n-seed",
      title: "Seed notification",
      desc: "Pre-existing inbox item",
      time: "1h ago",
      type: "info" as const,
      category: "circulars" as const,
      unread: false,
      createdAt: new Date().toISOString(),
    },
  ];
  store.set(ADMIN_NOTIFICATION_CENTER_KEY, JSON.stringify(seed));
}

describe("admin alerts workflow", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    seedNotificationInbox();
  });

  it("covers create, evaluate, notify, dedupe, toggle, multi-record, emergency, reload", async () => {
    const alerts = await loadAlertsModule();
    const {
      addAlertRule,
      evaluateAllAlertRules,
      loadAlertRulesState,
      resolveAlertFire,
      scheduleAlertRuleEvaluation,
      toggleAlertRuleActive,
      updateAlertRuleConfig,
    } = alerts;

    // Pause non-attendance evaluators until explicitly tested below.
    toggleAlertRuleActive("2");
    toggleAlertRuleActive("3");
    toggleAlertRuleActive("4");

    // 1. Create a supported custom rule entry (stored; not auto-evaluated).
    addAlertRule({
      id: "custom-1",
      name: "Late fee overdue",
      iconKey: "warning",
      desc: "Custom demo rule",
      priority: "P2",
      channels: ["Email"],
      audience: "Accounts",
      active: true,
    });
    expect(loadAlertRulesState().rules.some((row) => row.id === "custom-1")).toBe(true);

    const seedCount = getAdminNotifications().length;

    // 2. Condition not met — threshold impossibly low.
    updateAlertRuleConfig("1", { thresholdPct: 1 });
    expect(evaluateAllAlertRules()).toBe(0);
    expect(loadAlertRulesState().fired).toHaveLength(0);

    // 3–4. Condition becomes met — attendance rule fires for multiple students.
    updateAlertRuleConfig("1", { thresholdPct: 75 });
    const created = evaluateAllAlertRules();
    expect(created).toBeGreaterThanOrEqual(2);

    const stateAfterFire = loadAlertRulesState();
    const attendanceFires = stateAfterFire.fired.filter((row) => row.ruleId === "1" && !row.resolvedAt);
    expect(attendanceFires.length).toBeGreaterThanOrEqual(2);

    // 5. Alerts appear in Notification Center with category, href, timestamp.
    const notifications = getAdminNotifications();
    expect(notifications.length).toBeGreaterThan(seedCount);
    const attendanceNotif = notifications.find((row) => row.id.startsWith("fire-att-"));
    expect(attendanceNotif).toBeDefined();
    expect(attendanceNotif?.category).toBe("attendance");
    expect(attendanceNotif?.href).toBe("/student-attendance");
    expect(attendanceNotif?.createdAt).toBeTruthy();
    expect(attendanceNotif?.detail).toContain("Student:");

    // 6. Deep link href is supported on generated notifications.
    expect(["/student-attendance", "/marks", "/complaints"]).toContain(attendanceNotif?.href);

    // 7–8. Re-evaluation does not duplicate fires or notifications.
    const beforeIds = stateAfterFire.fired.map((row) => row.id);
    expect(evaluateAllAlertRules()).toBe(0);
    const afterReeval = loadAlertRulesState();
    expect(afterReeval.fired.filter((row) => !row.resolvedAt).length).toBe(
      stateAfterFire.fired.filter((row) => !row.resolvedAt).length,
    );
    expect(afterReeval.fired.map((row) => row.id).sort()).toEqual(beforeIds.sort());

    const notifIds = getAdminNotifications()
      .filter((row) => row.id.startsWith("fire-att-"))
      .map((row) => row.id);
    evaluateAllAlertRules();
    const notifIdsAfter = getAdminNotifications()
      .filter((row) => row.id.startsWith("fire-att-"))
      .map((row) => row.id);
    expect(notifIdsAfter.sort()).toEqual(notifIds.sort());

    // 9. Disable rule — no new attendance fires while inactive.
    toggleAlertRuleActive("1");
    const activeBeforeDisable = loadAlertRulesState().fired.filter(
      (row) => row.ruleId === "1" && !row.resolvedAt,
    ).length;
    expect(evaluateAllAlertRules()).toBe(0);
    expect(
      loadAlertRulesState().fired.filter((row) => row.ruleId === "1" && !row.resolvedAt).length,
    ).toBe(activeBeforeDisable);

    // 10. Re-enable rule — evaluates without duplicating existing active fires.
    toggleAlertRuleActive("1");
    scheduleAlertRuleEvaluation();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(evaluateAllAlertRules()).toBe(0);
    expect(
      loadAlertRulesState().fired.filter((row) => row.ruleId === "1" && !row.resolvedAt).length,
    ).toBe(activeBeforeDisable);

    // 11. Multiple affected students remain distinct.
    const studentIds = new Set(
      loadAlertRulesState()
        .fired.filter((row) => row.ruleId === "1")
        .map((row) => row.studentId)
        .filter(Boolean),
    );
    expect(studentIds.size).toBeGreaterThanOrEqual(2);

    // Complaint rule single high-priority admin record.
    toggleAlertRuleActive("3");
    const complaintCreated = evaluateAllAlertRules();
    expect(complaintCreated).toBe(1);
    expect(evaluateAllAlertRules()).toBe(0);
    const complaintNotif = getAdminNotifications().find((row) => row.id === "fire-cmp-CMP-201");
    expect(complaintNotif?.href).toBe("/complaints");
    expect(complaintNotif?.category).toBe("circulars");

    // Mark handled uses existing resolution model.
    const activeComplaint = loadAlertRulesState().fired.find((row) => row.id === "fire-cmp-CMP-201");
    expect(activeComplaint?.resolvedAt).toBeUndefined();
    resolveAlertFire("fire-cmp-CMP-201");
    expect(loadAlertRulesState().fired.find((row) => row.id === "fire-cmp-CMP-201")?.resolvedAt).toBeTruthy();

    // 12. Emergency broadcast workflow (existing path).
    const { appendBroadcastInbox, loadBroadcastInbox } = await import("@lumenx/utils");
    appendBroadcastInbox({
      id: "emergency-test-1",
      title: "School closed",
      message: "Weather closure",
      audience: "Everyone",
      priority: "critical",
      time: "Just now",
    });
    expect(loadBroadcastInbox().some((row) => row.id === "emergency-test-1")).toBe(true);

    // 13. Existing seed notifications remain.
    expect(getAdminNotifications().some((row) => row.id === "admin-n-seed")).toBe(true);

    // 14. Reload — persisted fired + rules survive storage round-trip.
    const persisted = store.get(ALERT_RULES_KEY);
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted!) as { fired: unknown[]; rules: unknown[] };
    expect(parsed.fired.length).toBeGreaterThan(0);
    expect(parsed.rules.length).toBeGreaterThan(0);
    expect(store.get(BROADCAST_KEY)).toBeTruthy();
  });

  it("coalesces scheduled evaluation (no duplicate burst)", async () => {
    const { scheduleAlertRuleEvaluation, loadAlertRulesState } = await loadAlertsModule();
    scheduleAlertRuleEvaluation();
    scheduleAlertRuleEvaluation();
    scheduleAlertRuleEvaluation();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const count = loadAlertRulesState().fired.length;
    scheduleAlertRuleEvaluation();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(loadAlertRulesState().fired.length).toBe(count);
  });
});
