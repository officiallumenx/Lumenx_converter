/** Admission / transfer / dropout meta persisted for timeline assembly. */

import { readAdminDataScopeKey } from "@/lib/admin-tenant";
import { createLocalStorageStore } from "@/lib/client-data-store";
import {
  activeAcademicYearLabel,
  formatTimelineDate,
} from "@/lib/student-academic-timeline-dates";
import type { StudentDirectoryRecord } from "@/lib/student-directory-store";

type TimelineAdmissionRecord = {
  recordedAt: string;
  displayDate: string;
  academicYear: string;
  grade: string;
};

export type TimelineEventMeta = {
  recordedAt: string;
  displayDate: string;
};

export type StudentTimelineMeta = {
  studentId: string;
  admission?: TimelineAdmissionRecord;
  transfer?: TimelineEventMeta;
  dropout?: TimelineEventMeta;
  /** @deprecated Legacy formatted date — migrated at read time. */
  transferDate?: string;
  /** @deprecated Legacy formatted date — migrated at read time. */
  dropoutDate?: string;
};

type TimelineMetaMap = Record<string, StudentTimelineMeta>;

const META_STORAGE_KEY_PREFIX = "lumenx.admin.student-timeline-meta.v1";
export const TIMELINE_META_CHANGED_EVENT = "lumenx-student-timeline-meta-changed";

const LEGACY_STORAGE_KEY_PREFIX = "lumenx.admin.student-academic-timeline.v1";

function metaStorageKey(): string {
  return `${META_STORAGE_KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

function legacyStorageKey(): string {
  return `${LEGACY_STORAGE_KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

const metaStore = createLocalStorageStore<TimelineMetaMap>({
  storageKey: metaStorageKey,
  eventName: TIMELINE_META_CHANGED_EVENT,
  seed: () => ({}),
});

function eventMetaFromLegacy(displayDate?: string): TimelineEventMeta | undefined {
  if (!displayDate?.trim()) return undefined;
  const parsed = Date.parse(displayDate);
  return {
    displayDate,
    recordedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : displayDate,
  };
}

function normalizeTimelineMeta(meta: StudentTimelineMeta): StudentTimelineMeta {
  const transfer = meta.transfer ?? eventMetaFromLegacy(meta.transferDate);
  const dropout = meta.dropout ?? eventMetaFromLegacy(meta.dropoutDate);
  return {
    studentId: meta.studentId,
    admission: meta.admission,
    transfer,
    dropout,
  };
}

function readLegacyTimelineMeta(studentId: string): Partial<StudentTimelineMeta> {
  try {
    const raw = localStorage.getItem(legacyStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<
      string,
      { transferDate?: string; dropoutDate?: string }
    >;
    const legacy = parsed[studentId];
    if (!legacy) return {};
    return {
      transferDate: legacy.transferDate,
      dropoutDate: legacy.dropoutDate,
    };
  } catch {
    return {};
  }
}

export function loadTimelineMeta(studentId: string): StudentTimelineMeta {
  const stored = metaStore.load()[studentId];
  if (stored) return normalizeTimelineMeta(stored);

  const legacy = readLegacyTimelineMeta(studentId);
  if (legacy.transferDate || legacy.dropoutDate) {
    return normalizeTimelineMeta({ studentId, ...legacy });
  }

  return { studentId };
}

export function subscribeTimelineMeta(listener: () => void): () => void {
  return metaStore.subscribe(listener);
}

function putTimelineMeta(next: StudentTimelineMeta): void {
  metaStore.mutate((map) => ({ ...map, [next.studentId]: next }));
}

export function recordAdmissionOnTimeline(
  student: StudentDirectoryRecord,
  academicYear?: string,
): void {
  const existing = metaStore.load()[student.id];
  if (existing?.admission) return;
  putTimelineMeta({
    studentId: student.id,
    ...existing,
    admission: {
      recordedAt: new Date().toISOString(),
      displayDate: formatTimelineDate(),
      academicYear: academicYear?.trim() || activeAcademicYearLabel(),
      grade: student.grade,
    },
  });
}

export function recordTransferOnTimeline(studentId: string): void {
  const existing = loadTimelineMeta(studentId);
  if (existing.transfer) return;
  const now = new Date();
  putTimelineMeta({
    ...existing,
    studentId,
    transfer: {
      recordedAt: now.toISOString(),
      displayDate: formatTimelineDate(now),
    },
  });
}

export function recordDropoutOnTimeline(studentId: string): void {
  const existing = loadTimelineMeta(studentId);
  if (existing.dropout) return;
  const now = new Date();
  putTimelineMeta({
    ...existing,
    studentId,
    dropout: {
      recordedAt: now.toISOString(),
      displayDate: formatTimelineDate(now),
    },
  });
}
