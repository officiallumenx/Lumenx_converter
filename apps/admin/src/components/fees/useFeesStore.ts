import { useCallback, useEffect, useState } from "react";
import {
  loadFeesSnapshot,
  saveFeesSnapshot,
  subscribeFeesUpdates,
  syncClassKeysFromDirectory,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import { loadClassDirectory } from "@/lib/class-directory-store";
import { CONNECT_CLASS_KEYS } from "@lumenx/module-fees";

function classKeysFromDirectory(): string[] {
  const fromDir = [
    ...new Set(loadClassDirectory().map((c) => c.timetableGrade).filter(Boolean)),
  ];
  return [...new Set([...fromDir, ...CONNECT_CLASS_KEYS])];
}

export function useFeesStore() {
  const [snapshot, setSnapshotState] = useState<FeesSnapshot>(() => {
    const loaded = loadFeesSnapshot();
    return syncClassKeysFromDirectory(loaded, classKeysFromDirectory());
  });

  const setSnapshot = useCallback((next: FeesSnapshot) => {
    saveFeesSnapshot(next);
    setSnapshotState(next);
  }, []);

  const refresh = useCallback(() => {
    setSnapshotState(loadFeesSnapshot());
  }, []);

  useEffect(() => subscribeFeesUpdates(refresh), [refresh]);

  return { snapshot, setSnapshot, refresh };
}
