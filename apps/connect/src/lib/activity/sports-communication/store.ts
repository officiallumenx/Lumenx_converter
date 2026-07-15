import { announcementsSeed, cloneAnnouncement, createAnnouncementFromInput } from "./mock";
import type {
  CommunicationAnnouncementInput,
  CommunicationListFilters,
  SportsCommunicationAnnouncement,
} from "./types";

let announcementsStore: SportsCommunicationAnnouncement[] = announcementsSeed.map(cloneAnnouncement);

function findAnnouncement(id: string): SportsCommunicationAnnouncement {
  const a = announcementsStore.find((x) => x.id === id);
  if (!a) throw new Error("Announcement not found");
  if (a.status === "archived") throw new Error("Archived announcements cannot be modified.");
  return a;
}

function applyFilters(
  items: SportsCommunicationAnnouncement[],
  filters?: CommunicationListFilters,
): SportsCommunicationAnnouncement[] {
  let result = [...items].filter((a) => a.status !== "archived");
  const f = filters ?? {};

  if (f.historyTab && f.historyTab !== "all") {
    if (f.historyTab === "sent") result = result.filter((a) => a.status === "sent");
    if (f.historyTab === "scheduled") result = result.filter((a) => a.status === "scheduled");
    if (f.historyTab === "cancelled") result = result.filter((a) => a.status === "cancelled");
  }

  if (f.status && f.status !== "all") {
    result = result.filter((a) => a.status === f.status);
  }
  if (f.category && f.category !== "all") {
    result = result.filter((a) => a.category === f.category);
  }
  if (f.messageType && f.messageType !== "all") {
    result = result.filter((a) => a.messageType === f.messageType);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.createdBy.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "updatedAt";
  const dir = (f.sortDir ?? "desc") === "asc" ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === "title") return dir * a.title.localeCompare(b.title);
    if (sortBy === "scheduledDate") {
      const da = a.scheduledDate ?? "";
      const db = b.scheduledDate ?? "";
      return dir * da.localeCompare(db);
    }
    return dir * a.updatedAt.localeCompare(b.updatedAt);
  });

  return result;
}

function touch(id: string, patch: Partial<SportsCommunicationAnnouncement>): SportsCommunicationAnnouncement {
  const now = new Date().toISOString().slice(0, 10);
  const updated = cloneAnnouncement({
    ...announcementsStore.find((a) => a.id === id)!,
    ...patch,
    updatedAt: now,
  });
  announcementsStore = announcementsStore.map((a) => (a.id === id ? updated : a));
  return cloneAnnouncement(updated);
}

export function resetSportsCommunicationStore() {
  announcementsStore = announcementsSeed.map(cloneAnnouncement);
}

export function listAnnouncementsFromStore(
  filters?: CommunicationListFilters,
): SportsCommunicationAnnouncement[] {
  return applyFilters(announcementsStore, filters).map(cloneAnnouncement);
}

export function getAnnouncementByIdFromStore(id: string): SportsCommunicationAnnouncement | null {
  const found = announcementsStore.find((a) => a.id === id);
  return found ? cloneAnnouncement(found) : null;
}

export function createAnnouncementInStore(
  input: CommunicationAnnouncementInput,
  asScheduled = false,
): SportsCommunicationAnnouncement {
  const status = asScheduled && input.scheduledDate ? "scheduled" : "draft";
  const record = createAnnouncementFromInput(input, undefined, status);
  announcementsStore = [record, ...announcementsStore];
  return cloneAnnouncement(record);
}

export function updateAnnouncementInStore(
  id: string,
  patch: Partial<CommunicationAnnouncementInput>,
): SportsCommunicationAnnouncement {
  const prev = findAnnouncement(id);
  if (prev.status !== "draft" && prev.status !== "scheduled") {
    throw new Error("Only draft or scheduled announcements can be edited.");
  }

  return touch(id, {
    title: patch.title?.trim() ?? prev.title,
    body: patch.body?.trim() ?? prev.body,
    category: patch.category ?? prev.category,
    messageType: patch.messageType ?? prev.messageType,
    audience: patch.audience ?? prev.audience,
    notifications: patch.notifications ?? prev.notifications,
    scheduledDate: patch.scheduledDate ?? prev.scheduledDate,
    scheduledTime: patch.scheduledTime ?? prev.scheduledTime,
    createdBy: patch.createdBy?.trim() ?? prev.createdBy,
  });
}

export function scheduleAnnouncementInStore(
  id: string,
  scheduledDate: string,
  scheduledTime: string,
): SportsCommunicationAnnouncement {
  const prev = findAnnouncement(id);
  if (prev.status !== "draft" && prev.status !== "scheduled") {
    throw new Error("Only draft or scheduled announcements can be rescheduled.");
  }
  return touch(id, { status: "scheduled", scheduledDate, scheduledTime });
}

export function sendAnnouncementNowInStore(id: string): SportsCommunicationAnnouncement {
  const prev = findAnnouncement(id);
  if (prev.status === "sent") throw new Error("Announcement has already been sent.");
  const now = new Date().toISOString();
  return touch(id, {
    status: "sent",
    sentAt: now,
    scheduledDate: undefined,
    scheduledTime: undefined,
  });
}

export function cancelAnnouncementInStore(id: string): SportsCommunicationAnnouncement {
  const prev = findAnnouncement(id);
  if (prev.status !== "scheduled" && prev.status !== "draft") {
    throw new Error("Only draft or scheduled announcements can be cancelled.");
  }
  const now = new Date().toISOString().slice(0, 10);
  return touch(id, { status: "cancelled", cancelledAt: now });
}

export function archiveAnnouncementInStore(id: string): SportsCommunicationAnnouncement {
  const prev = announcementsStore.find((a) => a.id === id);
  if (!prev) throw new Error("Announcement not found");
  if (prev.status !== "sent" && prev.status !== "cancelled") {
    throw new Error("Only sent or cancelled announcements can be archived.");
  }
  const now = new Date().toISOString().slice(0, 10);
  return touch(id, { status: "archived", archivedAt: now });
}
