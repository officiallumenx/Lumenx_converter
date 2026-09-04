/** Connect reader for Admin-published student ID card snapshot. */

import { resolveCanonicalStudentId } from "@lumenx/utils";
import { useSyncExternalStore } from "react";

export const STUDENT_ID_CARD_SYNC_KEY = "lumenx.shared.studentIdCards.v1";
export const STUDENT_ID_CARD_SYNC_MESSAGE = "lumenx-student-id-card-sync";

export type StudentIdCardSyncRow = {
  studentId: string;
  name: string;
  firstName: string;
  surname: string;
  classLabel: string;
  section: string;
  rollNo: string;
  address: string;
  parentName: string;
  parentPhone: string;
  photoDataUrl?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  house?: string;
  idCardIssuedOn?: string;
  idCardValidTill?: string;
  institute: string;
  email?: string;
  aliases: string[];
};

export type StudentIdCardSyncSnapshot = {
  updatedAt: string;
  students: StudentIdCardSyncRow[];
};

function readSnapshot(): StudentIdCardSyncSnapshot | null {
  try {
    const raw = localStorage.getItem(STUDENT_ID_CARD_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentIdCardSyncSnapshot;
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cachedSnapshot: StudentIdCardSyncSnapshot | null = null;

function getSnapshot(): StudentIdCardSyncSnapshot | null {
  try {
    const raw = localStorage.getItem(STUDENT_ID_CARD_SYNC_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    cachedSnapshot = raw ? (JSON.parse(raw) as StudentIdCardSyncSnapshot) : null;
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = null;
    return null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STUDENT_ID_CARD_SYNC_KEY || event.key === null) onStoreChange();
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === STUDENT_ID_CARD_SYNC_MESSAGE) onStoreChange();
  };
  const onCustom = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener("message", onMessage);
  window.addEventListener("lumenx-student-id-card-sync", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("message", onMessage);
    window.removeEventListener("lumenx-student-id-card-sync", onCustom);
  };
}

export function useStudentIdCardSync(): StudentIdCardSyncSnapshot | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function findIdCardSyncRow(
  studentOrLearnerId: string,
  snapshot: StudentIdCardSyncSnapshot | null = readSnapshot(),
): StudentIdCardSyncRow | null {
  if (!snapshot?.students?.length) return null;
  const raw = decodeURIComponent(studentOrLearnerId).trim();
  const canonical = resolveCanonicalStudentId(raw);

  const direct = snapshot.students.find(
    (row) =>
      row.studentId === raw ||
      row.studentId === canonical ||
      row.aliases?.includes(raw) ||
      row.aliases?.includes(canonical),
  );
  if (direct) return direct;

  // Parent mock IDs like S-2040 map via canonical when present in CONNECT_LEARNER map.
  return (
    snapshot.students.find((row) => row.studentId === resolveCanonicalStudentId(raw)) ?? null
  );
}

export function displayOrEmpty(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export type ConnectIdCardViewModel = {
  id: string;
  name: string;
  initials: string;
  className: string;
  section: string;
  rollNo: string;
  address: string;
  parentName: string;
  bloodGroup: string;
  emergencyContact: string;
  house: string;
  issuedOn: string;
  validTill: string;
  institute: string;
  photoDataUrl?: string;
  /** True when this card came from Admin sync (prefer empty placeholders). */
  fromAdmin: boolean;
};

export function idCardViewFromSyncRow(row: StudentIdCardSyncRow): ConnectIdCardViewModel {
  const initials =
    `${row.firstName?.[0] ?? ""}${row.surname?.[0] ?? ""}`.toUpperCase() ||
    row.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return {
    id: row.studentId,
    name: row.name,
    initials: initials || "—",
    className: row.classLabel || "—",
    section: displayOrEmpty(row.section),
    rollNo: displayOrEmpty(row.rollNo),
    address: displayOrEmpty(row.address),
    parentName: displayOrEmpty(row.parentName),
    bloodGroup: displayOrEmpty(row.bloodGroup),
    emergencyContact: displayOrEmpty(row.emergencyContact),
    house: displayOrEmpty(row.house),
    issuedOn: displayOrEmpty(row.idCardIssuedOn),
    validTill: displayOrEmpty(row.idCardValidTill),
    institute: row.institute || "Test1School",
    photoDataUrl: row.photoDataUrl,
    fromAdmin: true,
  };
}
