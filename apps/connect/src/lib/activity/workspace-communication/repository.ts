import { isApiAuthMode } from "@/auth/auth-mode";
import { createAnnouncement, listAnnouncements } from "@/lib/announcements/api";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import { getActivityTeamRecipients } from "@/lib/activity/api";
import { emitNotification } from "@/lib/notifications/api";
import type {
  WorkspaceCommunicationFilters,
  WorkspaceCommunicationItem,
  WorkspaceCommunicationKind,
} from "./types";

const SEED: WorkspaceCommunicationItem[] = [
  {
    id: "wc-n1",
    kind: "notification",
    title: "Practice assigned",
    body: "Kabaddi · Team 1 practice was added to the calendar for 16 Jul at 16:00.",
    sentAt: "2026-07-15T16:05:00",
    audienceLabel: "Practice · Kabaddi · Team 1",
    audiences: ["teachers", "teams"],
    unread: true,
  },
  {
    id: "wc-n2",
    kind: "notification",
    title: "Message sent",
    body: "“Bus list for kabaddi away match” was sent to Kabaddi · Team 1.",
    sentAt: "2026-07-14T11:20:00",
    audienceLabel: "Messages · Kabaddi · Team 1",
    audiences: ["teachers", "teams"],
    unread: true,
  },
  {
    id: "wc-n3",
    kind: "notification",
    title: "Announcement sent",
    body: "“Inter-house sports meet — final schedule” was sent to Cricket · Team 1.",
    sentAt: "2026-07-13T09:10:00",
    audienceLabel: "Announcements · Cricket · Team 1",
    audiences: ["teachers", "teams"],
    unread: false,
  },
  {
    id: "wc-n4",
    kind: "notification",
    title: "Attendance saved",
    body: "Attendance recorded for Cricket · Team 1.",
    sentAt: "2026-07-12T08:30:00",
    audienceLabel: "Attendance · Cricket · Team 1",
    audiences: ["teachers", "teams"],
    unread: false,
  },
  {
    id: "wc-a1",
    kind: "announcement",
    title: "Inter-house sports meet — final schedule",
    body: "Track & field events begin 7:30 AM. Team captains report to the athletics field by 7:00 AM.",
    sentAt: "2026-07-05T09:00:00",
    audienceLabel: "Sports · Cricket · Team 1",
    audiences: ["teams"],
    pinned: true,
  },
  {
    id: "wc-m1",
    kind: "message",
    title: "Bus list for kabaddi away match",
    body: "Confirm student list for outbound buses by 4 PM today.",
    sentAt: "2026-07-03T11:15:00",
    audienceLabel: "Sports · Kabaddi · Team 1",
    audiences: ["teams", "parents"],
  },
];

let store = [...SEED];
/** Stable snapshot for useSyncExternalStore — must not allocate a new array each read. */
let snapshot: WorkspaceCommunicationItem[] = store;
const listeners = new Set<() => void>();

function useApi() {
  return isApiAuthMode();
}

function requireInstituteId(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

function emit() {
  snapshot = store.slice();
  listeners.forEach((l) => l());
}

function delay(ms = 100) {
  return new Promise((r) => setTimeout(r, ms));
}

function applyFilters(
  items: WorkspaceCommunicationItem[],
  filters?: WorkspaceCommunicationFilters,
): WorkspaceCommunicationItem[] {
  let result = items.map((i) => ({ ...i }));
  if (filters?.kind && filters.kind !== "all") {
    result = result.filter((i) => i.kind === filters.kind);
  }
  if (filters?.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.audienceLabel.toLowerCase().includes(q),
    );
  }
  return result.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

function announcementToItem(row: {
  id: string;
  title: string;
  body: string | null;
  audienceLabel: string | null;
  publishedAt: string | null;
  createdAt: string;
  pinned: boolean;
}): WorkspaceCommunicationItem {
  return {
    id: row.id,
    kind: "announcement",
    title: row.title,
    body: row.body ?? "",
    sentAt: row.publishedAt ?? row.createdAt,
    audienceLabel: row.audienceLabel ?? "Activity team",
    audiences: ["teams"],
    pinned: row.pinned,
    unread: false,
  };
}

async function loadApiItems(): Promise<WorkspaceCommunicationItem[]> {
  const instituteId = requireInstituteId();
  const rows = await listAnnouncements({
    instituteId,
    audienceScope: "activity_team",
  });
  return rows
    .filter((r) => r.status === "published")
    .map(announcementToItem);
}

function pushActivityNotificationSync(input: {
  title: string;
  body: string;
  audienceLabel: string;
}): WorkspaceCommunicationItem {
  const item: WorkspaceCommunicationItem = {
    id: `wc-n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "notification",
    title: input.title,
    body: input.body,
    sentAt: new Date().toISOString(),
    audienceLabel: input.audienceLabel,
    audiences: ["teachers", "teams"],
    unread: true,
  };
  store = [item, ...store];
  emit();
  return { ...item };
}

async function persistOutboundDemo(input: {
  kind: "message" | "announcement";
  title: string;
  body: string;
  activityType: "sports" | "eca";
  unitLabels: string[];
}): Promise<WorkspaceCommunicationItem> {
  await delay(120);
  const audienceLabel = `${input.activityType === "sports" ? "Sports" : "ECA"} · ${input.unitLabels.join(", ")}`;
  const item: WorkspaceCommunicationItem = {
    id: `wc-${input.kind[0]}-${Date.now()}`,
    kind: input.kind,
    title: input.title,
    body: input.body,
    sentAt: new Date().toISOString(),
    audienceLabel,
    audiences: ["teams", "students"],
    unread: false,
  };
  store = [item, ...store];
  emit();

  const actionLabel = input.kind === "message" ? "Message sent" : "Announcement sent";
  pushActivityNotificationSync({
    title: actionLabel,
    body: `“${input.title}” was sent to ${input.unitLabels.join(", ")}.`,
    audienceLabel: `${input.kind === "message" ? "Messages" : "Announcements"} · ${input.unitLabels.join(", ")}`,
  });

  return { ...item };
}

async function sendTeamAnnouncementApi(input: {
  title: string;
  body: string;
  activityType: "sports" | "eca";
  unitLabels: string[];
  unitIds: string[];
}): Promise<WorkspaceCommunicationItem> {
  const instituteId = requireInstituteId();
  const teamId = input.unitIds[0];
  if (!teamId) throw new Error("Team id is required");

  const audienceLabel = `${input.activityType === "sports" ? "Sports" : "ECA"} · ${input.unitLabels.join(", ")}`;
  const row = await createAnnouncement({
    instituteId,
    title: input.title,
    body: input.body,
    audienceScope: "activity_team",
    audienceLabel,
    activityTeamId: teamId,
    publishNow: true,
  });

  const item = announcementToItem(row);
  store = [item, ...store.filter((i) => i.id !== item.id)];
  emit();
  pushActivityNotificationSync({
    title: "Announcement sent",
    body: `“${input.title}” was sent to ${input.unitLabels.join(", ")}.`,
    audienceLabel: `Announcements · ${input.unitLabels.join(", ")}`,
  });
  return item;
}

async function sendTeamMessageApi(input: {
  title: string;
  body: string;
  activityType: "sports" | "eca";
  unitLabels: string[];
  unitIds: string[];
}): Promise<WorkspaceCommunicationItem> {
  const instituteId = requireInstituteId();
  const teamId = input.unitIds[0];
  if (!teamId) throw new Error("Team id is required");

  const { recipientUserIds } = await getActivityTeamRecipients(teamId);
  await emitNotification({
    instituteId,
    category: "messages",
    title: input.title,
    body: input.body,
    recipientUserIds,
    deepLink: "/activities",
    payload: { activityTeamId: teamId },
  });

  const audienceLabel = `${input.activityType === "sports" ? "Sports" : "ECA"} · ${input.unitLabels.join(", ")}`;
  const item: WorkspaceCommunicationItem = {
    id: `wc-m-${Date.now()}`,
    kind: "message",
    title: input.title,
    body: input.body,
    sentAt: new Date().toISOString(),
    audienceLabel,
    audiences: ["teams", "students"],
    unread: false,
  };
  store = [item, ...store];
  emit();
  pushActivityNotificationSync({
    title: "Message sent",
    body: `“${input.title}” was sent to ${input.unitLabels.join(", ")}.`,
    audienceLabel: `Messages · ${input.unitLabels.join(", ")}`,
  });
  return item;
}

export const workspaceCommunicationRepository = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): WorkspaceCommunicationItem[] {
    return snapshot;
  },

  async preload() {
    if (!useApi()) return;
    store = [];
    const apiItems = await loadApiItems();
    store = apiItems;
    emit();
  },

  getUnreadCount(kind?: WorkspaceCommunicationKind): number {
    return store.filter(
      (i) => i.unread && (kind ? i.kind === kind : i.kind === "notification"),
    ).length;
  },

  async list(filters?: WorkspaceCommunicationFilters): Promise<WorkspaceCommunicationItem[]> {
    if (useApi()) {
      const apiItems = await loadApiItems();
      const localNotifications = store.filter((i) => i.kind === "notification");
      return applyFilters([...localNotifications, ...apiItems], filters);
    }
    await delay();
    return applyFilters(store, filters);
  },

  async markRead(id: string): Promise<void> {
    store = store.map((i) => (i.id === id ? { ...i, unread: false } : i));
    emit();
    await delay(40);
  },

  async markAllNotificationsRead(): Promise<void> {
    store = store.map((i) =>
      i.kind === "notification" && i.unread ? { ...i, unread: false } : i,
    );
    emit();
    await delay(40);
  },

  async pushFromActivity(input: {
    title: string;
    body: string;
    audienceLabel: string;
  }): Promise<WorkspaceCommunicationItem> {
    await delay(40);
    return pushActivityNotificationSync(input);
  },

  async sendMessage(input: {
    title: string;
    body: string;
    activityType: "sports" | "eca";
    unitLabels: string[];
    unitIds: string[];
  }): Promise<WorkspaceCommunicationItem> {
    if (useApi()) return sendTeamMessageApi(input);
    return persistOutboundDemo({ ...input, kind: "message" });
  },

  async sendAnnouncement(input: {
    title: string;
    body: string;
    activityType: "sports" | "eca";
    unitLabels: string[];
    unitIds: string[];
  }): Promise<WorkspaceCommunicationItem> {
    if (useApi()) return sendTeamAnnouncementApi(input);
    return persistOutboundDemo({ ...input, kind: "announcement" });
  },

  reset() {
    store = SEED.map((i) => ({ ...i }));
    emit();
  },
};
