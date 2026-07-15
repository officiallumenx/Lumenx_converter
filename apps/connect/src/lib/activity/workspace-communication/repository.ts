import type {
  WorkspaceCommunicationFilters,
  WorkspaceCommunicationItem,
  WorkspaceCommunicationKind,
} from "./types";

const SEED: WorkspaceCommunicationItem[] = [
  {
    id: "wc-1",
    kind: "announcement",
    title: "Inter-house sports meet — final schedule",
    body: "Track & field events begin 7:30 AM. Team captains report to the athletics field by 7:00 AM.",
    sentAt: "2026-07-05T09:00:00",
    audienceLabel: "Cricket Team 1 · Kabaddi Team 1",
    audiences: ["teams"],
    pinned: true,
  },
  {
    id: "wc-2",
    kind: "notification",
    title: "Dance group rehearsal reminder",
    body: "Extra-curricular dance team reports to the auditorium at 2 PM with costumes.",
    sentAt: "2026-07-04T14:30:00",
    audienceLabel: "Dance Team",
    audiences: ["teams", "students"],
    unread: true,
  },
  {
    id: "wc-3",
    kind: "message",
    title: "Bus list for kabaddi away match",
    body: "Confirm student list for outbound buses by 4 PM today.",
    sentAt: "2026-07-03T11:15:00",
    audienceLabel: "Kabaddi Team 1",
    audiences: ["teams", "parents"],
    unread: true,
  },
  {
    id: "wc-4",
    kind: "notification",
    title: "Practice session — Cricket Team 2",
    body: "Net practice scheduled tomorrow 7:00 AM at cricket nets.",
    sentAt: "2026-07-02T16:00:00",
    audienceLabel: "Cricket Team 2",
    audiences: ["teams"],
    unread: true,
  },
];

let store = [...SEED];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function delay(ms = 120) {
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

export const workspaceCommunicationRepository = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): WorkspaceCommunicationItem[] {
    return store.map((i) => ({ ...i }));
  },

  getUnreadCount(kind?: WorkspaceCommunicationKind): number {
    return store.filter(
      (i) => i.unread && (kind ? i.kind === kind : i.kind === "notification"),
    ).length;
  },

  async list(filters?: WorkspaceCommunicationFilters): Promise<WorkspaceCommunicationItem[]> {
    await delay();
    return applyFilters(store, filters);
  },

  async markRead(id: string): Promise<void> {
    await delay(80);
    store = store.map((i) => (i.id === id ? { ...i, unread: false } : i));
    emit();
  },

  async sendMessage(input: {
    title: string;
    body: string;
    activityType: "sports" | "eca";
    teamLabels: string[];
  }): Promise<WorkspaceCommunicationItem> {
    await delay(150);
    const item: WorkspaceCommunicationItem = {
      id: `wc-${Date.now()}`,
      kind: "message",
      title: input.title,
      body: input.body,
      sentAt: new Date().toISOString(),
      audienceLabel: `${input.activityType === "sports" ? "Sports" : "ECA"} · ${input.teamLabels.join(", ")}`,
      audiences: ["teams", "students"],
      unread: false,
    };
    store = [item, ...store];
    emit();
    return { ...item };
  },

  reset() {
    store = SEED.map((i) => ({ ...i }));
    emit();
  },
};
