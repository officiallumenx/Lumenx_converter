/**
 * Nexus Support Center — institute conversation threads (demo / localStorage).
 * Institute-level only. No student / teacher / parent personal records.
 * No WhatsApp / email integration.
 */

import { listPlatformInstitutes } from "@/lib/institute-directory-store";
import { appendAuditEvent } from "@/lib/audit-log-store";

export type SupportCategory =
  | "issue"
  | "feature_request"
  | "feedback"
  | "improvement_request";

export type SupportStatus = "open" | "in_progress" | "waiting" | "resolved";

export type SupportPriority = "low" | "medium" | "high";

export type MessageAuthorRole = "institute" | "nexus" | "internal";

export type SupportMessage = {
  id: string;
  authorRole: MessageAuthorRole;
  /** Display label only — institute contact or operator handle, never student/parent names */
  authorLabel: string;
  body: string;
  createdAt: string;
  /** Internal notes are Nexus-only */
  internal?: boolean;
};

export type SupportThread = {
  id: string;
  instituteId: string;
  instituteName: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  priority: SupportPriority;
  /** Nexus operator handle or null */
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export const NEXUS_OPERATORS = [
  "nexus_root",
  "ops.priya",
  "ops.arjun",
  "support.maya",
] as const;

const STORAGE_KEY = "lumenx.nexus.supportThreads.v1";
const CHANGE_EVENT = "lumenx-nexus-support-threads-changed";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function daysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function seedThreads(): SupportThread[] {
  const institutes = listPlatformInstitutes().filter((i) => i.status !== "archived");
  const byId = (id: string) => institutes.find((i) => i.id === id);
  const delhi = byId("ins-delhi-riverside");
  const oak = byId("ins-bengaluru-oak");
  const harbor = byId("ins-mumbai-harbor");
  const lotus = byId("ins-hyderabad-lotus");
  const jaipur = byId("ins-jaipur-heritage") ?? institutes.find((i) => i.status === "suspended") ?? institutes[0];

  const threads: SupportThread[] = [];

  if (oak) {
    threads.push({
      id: "sup-oak-billing",
      instituteId: oak.id,
      instituteName: oak.name,
      subject: "Annual Max invoice still showing overdue",
      category: "issue",
      status: "in_progress",
      priority: "high",
      assignee: "ops.priya",
      createdAt: daysAgo(6, 9),
      updatedAt: daysAgo(0, 11),
      messages: [
        {
          id: "m1",
          authorRole: "institute",
          authorLabel: "Institute Admin",
          body: "Our Max yearly license shows overdue in Admin after bank transfer last week. Please confirm receipt.",
          createdAt: daysAgo(6, 9),
        },
        {
          id: "m2",
          authorRole: "nexus",
          authorLabel: "ops.priya",
          body: "Thanks — we’re matching the transfer against the Oakridge Max invoice. Expect an update within one business day.",
          createdAt: daysAgo(5, 14),
        },
        {
          id: "m3",
          authorRole: "internal",
          authorLabel: "ops.priya",
          body: "UTR pending from finance. Escalate if not cleared by EOD.",
          createdAt: daysAgo(1, 10),
          internal: true,
        },
        {
          id: "m4",
          authorRole: "institute",
          authorLabel: "Institute Admin",
          body: "Shared the remittance advice on the institute contact email.",
          createdAt: daysAgo(0, 11),
        },
      ],
    });
  }

  if (delhi) {
    threads.push({
      id: "sup-delhi-transport",
      instituteId: delhi.id,
      instituteName: delhi.name,
      subject: "Request to keep Transport module disabled",
      category: "feedback",
      status: "resolved",
      priority: "low",
      assignee: "nexus_root",
      createdAt: daysAgo(12, 11),
      updatedAt: daysAgo(10, 16),
      messages: [
        {
          id: "m1",
          authorRole: "institute",
          authorLabel: "Institute Admin",
          body: "We do not operate buses this year. Please keep Transport off so it stays hidden in Admin.",
          createdAt: daysAgo(12, 11),
        },
        {
          id: "m2",
          authorRole: "nexus",
          authorLabel: "nexus_root",
          body: "Confirmed — Transport entitlement remains disabled for Delhi Riverside. Data is retained if you re-enable later.",
          createdAt: daysAgo(10, 16),
        },
      ],
    });
  }

  if (harbor) {
    threads.push({
      id: "sup-harbor-analytics",
      instituteId: harbor.id,
      instituteName: harbor.name,
      subject: "Enable Analytics on Plus plan",
      category: "feature_request",
      status: "waiting",
      priority: "medium",
      assignee: "ops.arjun",
      createdAt: daysAgo(4, 15),
      updatedAt: daysAgo(2, 9),
      messages: [
        {
          id: "m1",
          authorRole: "institute",
          authorLabel: "Institute Admin",
          body: "Can Analytics be turned on for Harbor without upgrading to Max?",
          createdAt: daysAgo(4, 15),
        },
        {
          id: "m2",
          authorRole: "nexus",
          authorLabel: "ops.arjun",
          body: "Analytics requires Plus min plan — you qualify. Confirm and we will enable entitlement from Plans & Modules.",
          createdAt: daysAgo(3, 12),
        },
        {
          id: "m3",
          authorRole: "nexus",
          authorLabel: "ops.arjun",
          body: "Waiting on your confirmation to proceed.",
          createdAt: daysAgo(2, 9),
        },
      ],
    });
  }

  if (lotus) {
    threads.push({
      id: "sup-lotus-onboarding",
      instituteId: lotus.id,
      instituteName: lotus.name,
      subject: "Trial onboarding checklist feedback",
      category: "improvement_request",
      status: "open",
      priority: "medium",
      assignee: null,
      createdAt: daysAgo(1, 16),
      updatedAt: daysAgo(1, 16),
      messages: [
        {
          id: "m1",
          authorRole: "institute",
          authorLabel: "Institute Admin",
          body: "Trial setup was smooth. Suggestion: add a one-page renewal preview before converting from trial.",
          createdAt: daysAgo(1, 16),
        },
      ],
    });
  }

  if (jaipur) {
    threads.push({
      id: "sup-jaipur-access",
      instituteId: jaipur.id,
      instituteName: jaipur.name,
      subject: "Cannot reach Admin after suspension",
      category: "issue",
      status: "open",
      priority: "high",
      assignee: "support.maya",
      createdAt: daysAgo(0, 8),
      updatedAt: daysAgo(0, 8),
      messages: [
        {
          id: "m1",
          authorRole: "institute",
          authorLabel: "Institute Admin",
          body: "Institute appears suspended. We need guidance on restoring platform access for Admin operators only.",
          createdAt: daysAgo(0, 8),
        },
      ],
    });
  }

  return threads;
}

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function readStore(): SupportThread[] {
  if (typeof localStorage === "undefined") return seedThreads();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedThreads();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as SupportThread[];
    return Array.isArray(parsed) ? parsed : seedThreads();
  } catch {
    return seedThreads();
  }
}

function writeStore(threads: SupportThread[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  notify();
}

export function subscribeSupportThreads(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function listSupportThreads(): SupportThread[] {
  return readStore().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getSupportThread(id: string): SupportThread | null {
  return readStore().find((t) => t.id === id) ?? null;
}

function patchThread(
  id: string,
  updater: (t: SupportThread) => SupportThread,
): SupportThread | null {
  const all = readStore();
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const next = updater(all[idx]!);
  all[idx] = next;
  writeStore(all);
  return next;
}

export function replyToThread(threadId: string, body: string, operator = "nexus_root"): SupportThread | null {
  const text = body.trim();
  if (!text) return null;
  return patchThread(threadId, (t) => {
    const msg: SupportMessage = {
      id: uid("msg"),
      authorRole: "nexus",
      authorLabel: operator,
      body: text,
      createdAt: nowIso(),
    };
    return {
      ...t,
      updatedAt: nowIso(),
      status: t.status === "resolved" ? "in_progress" : t.status === "open" ? "in_progress" : t.status,
      messages: [...t.messages, msg],
    };
  });
}

export function addInternalNote(threadId: string, body: string, operator = "nexus_root"): SupportThread | null {
  const text = body.trim();
  if (!text) return null;
  return patchThread(threadId, (t) => {
    const msg: SupportMessage = {
      id: uid("note"),
      authorRole: "internal",
      authorLabel: operator,
      body: text,
      createdAt: nowIso(),
      internal: true,
    };
    return {
      ...t,
      updatedAt: nowIso(),
      messages: [...t.messages, msg],
    };
  });
}

/** Demo helper: simulate an institute follow-up message. */
export function addInstituteMessage(threadId: string, body: string): SupportThread | null {
  const text = body.trim();
  if (!text) return null;
  return patchThread(threadId, (t) => {
    const msg: SupportMessage = {
      id: uid("imsg"),
      authorRole: "institute",
      authorLabel: "Institute Admin",
      body: text,
      createdAt: nowIso(),
    };
    return {
      ...t,
      updatedAt: nowIso(),
      status: t.status === "waiting" ? "open" : t.status,
      messages: [...t.messages, msg],
    };
  });
}

export function setThreadStatus(threadId: string, status: SupportStatus): SupportThread | null {
  const prev = getSupportThread(threadId);
  const next = patchThread(threadId, (t) => ({
    ...t,
    status,
    updatedAt: nowIso(),
  }));
  if (prev && next && prev.status !== next.status) {
    appendAuditEvent({
      action: "support_status_changed",
      targetId: next.id,
      targetLabel: `${next.instituteName} · ${next.subject}`,
      targetKind: "support",
      before: labelStatus(prev.status),
      after: labelStatus(next.status),
      summary: "Support thread status updated",
    });
  }
  return next;
}

export function markThreadResolved(threadId: string): SupportThread | null {
  return setThreadStatus(threadId, "resolved");
}

export function reopenThread(threadId: string): SupportThread | null {
  return setThreadStatus(threadId, "open");
}

export function assignThread(threadId: string, assignee: string | null): SupportThread | null {
  return patchThread(threadId, (t) => ({
    ...t,
    assignee,
    updatedAt: nowIso(),
    status: t.status === "open" && assignee ? "in_progress" : t.status,
  }));
}

export function setThreadPriority(threadId: string, priority: SupportPriority): SupportThread | null {
  return patchThread(threadId, (t) => ({
    ...t,
    priority,
    updatedAt: nowIso(),
  }));
}

export function createSupportThread(input: {
  instituteId: string;
  subject: string;
  category: SupportCategory;
  priority?: SupportPriority;
  body: string;
}): SupportThread | null {
  const inst = listPlatformInstitutes().find((i) => i.id === input.instituteId);
  if (!inst) return null;
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) return null;

  const thread: SupportThread = {
    id: uid("sup"),
    instituteId: inst.id,
    instituteName: inst.name,
    subject,
    category: input.category,
    status: "open",
    priority: input.priority ?? "medium",
    assignee: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    messages: [
      {
        id: uid("msg"),
        authorRole: "institute",
        authorLabel: "Institute Admin",
        body,
        createdAt: nowIso(),
      },
    ],
  };
  const all = [thread, ...readStore()];
  writeStore(all);
  return thread;
}

export function supportStats(threads: SupportThread[]) {
  return {
    total: threads.length,
    open: threads.filter((t) => t.status === "open").length,
    inProgress: threads.filter((t) => t.status === "in_progress").length,
    waiting: threads.filter((t) => t.status === "waiting").length,
    resolved: threads.filter((t) => t.status === "resolved").length,
    high: threads.filter((t) => t.priority === "high" && t.status !== "resolved").length,
  };
}

export function labelCategory(c: SupportCategory): string {
  if (c === "issue") return "Issue";
  if (c === "feature_request") return "Feature Request";
  if (c === "feedback") return "Feedback";
  return "Improvement Request";
}

export function labelStatus(s: SupportStatus): string {
  if (s === "open") return "Open";
  if (s === "in_progress") return "In Progress";
  if (s === "waiting") return "Waiting";
  return "Resolved";
}

export function labelPriority(p: SupportPriority): string {
  if (p === "low") return "Low";
  if (p === "medium") return "Medium";
  return "High";
}

export function statusTone(s: SupportStatus): "success" | "warning" | "danger" | "info" | "neutral" {
  if (s === "resolved") return "success";
  if (s === "waiting") return "warning";
  if (s === "in_progress") return "info";
  return "neutral";
}

export function priorityTone(p: SupportPriority): "success" | "warning" | "danger" | "info" | "neutral" {
  if (p === "high") return "danger";
  if (p === "medium") return "warning";
  return "neutral";
}

export function formatSupportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSupportTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
