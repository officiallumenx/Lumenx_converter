import { useMemo, useSyncExternalStore } from "react";
import { workspaceCommunicationRepository } from "./repository";
import type { WorkspaceCommunicationKind } from "./types";

/** Unread counts for Activity Coordinator workspace communication. */
export function useWorkspaceCommunicationUnread(kind?: WorkspaceCommunicationKind) {
  const snapshot = useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    workspaceCommunicationRepository.getSnapshot,
    workspaceCommunicationRepository.getSnapshot,
  );

  return useMemo(() => {
    if (kind) {
      return snapshot.filter((i) => i.kind === kind && i.unread).length;
    }
    return snapshot.filter((i) => i.kind === "notification" && i.unread).length;
  }, [snapshot, kind]);
}
