import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import { restoreFromRecycleBin, type RecycleBinItem } from "@lumenx/utils";
import {
  loadStudentDirectory,
  saveStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";
import {
  loadParentDirectory,
  saveParentDirectory,
  type ParentDirectoryRecord,
} from "@/lib/parent-directory-store";
import { addSubject, getSubjectById, type SubjectCatalogItem } from "@/lib/subjects-data";

const ACCOUNTS_KEY = "lumenx.admin.accounts.v1";

export function loadPersistedAccounts<T>(fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as T[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fallback */
  }
  return fallback;
}

export function savePersistedAccounts(rows: unknown[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function restoreTeachers(snapshot: Record<string, unknown>) {
  const key = ADMIN_STORAGE_KEYS.teachers;
  let rows: Record<string, unknown>[] = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) rows = JSON.parse(raw) as Record<string, unknown>[];
  } catch {
    rows = [];
  }
  const id = String(snapshot.id ?? "");
  const next = rows.filter((r) => String(r.id) !== id);
  next.push(snapshot);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function restoreRecycleBinEntity(item: RecycleBinItem): RecycleBinItem | null {
  const restored = restoreFromRecycleBin(item.id);
  if (!restored) return null;
  const snap = restored.snapshot;
  if (!snap) return restored;

  if (restored.module === "Students") {
    const record = snap as unknown as StudentDirectoryRecord;
    const rows = loadStudentDirectory().filter((r) => r.id !== record.id);
    saveStudentDirectory([...rows, record]);
  } else if (restored.module === "Teachers") {
    restoreTeachers(snap);
  } else if (restored.module === "Parents") {
    const record = snap as unknown as ParentDirectoryRecord;
    const rows = loadParentDirectory().filter((r) => r.id !== record.id);
    saveParentDirectory([...rows, record]);
  } else if (restored.module === "Subjects") {
    const record = snap as unknown as SubjectCatalogItem;
    if (!getSubjectById(record.id)) {
      addSubject({
        name: record.name,
        code: record.code,
        category: record.category,
        periodsPerWeek: record.periodsPerWeek,
        grades: record.grades ?? [],
        status: record.status,
      });
    }
  } else if (restored.module === "Accounts") {
    const rows = loadPersistedAccounts<Record<string, unknown>>([]);
    const id = String(snap.id ?? "");
    savePersistedAccounts([...rows.filter((r) => String(r.id) !== id), snap]);
  }

  return restored;
}
