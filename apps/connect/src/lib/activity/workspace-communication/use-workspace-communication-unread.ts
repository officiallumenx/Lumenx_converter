import { useSyncExternalStore } from "react";
import { workspaceCommunicationRepository } from "./repository";
import type { WorkspaceCommunicationKind } from "./types";

/** Unread counts for Activity Coordinator workspace communication. */
export function useWorkspaceCommunicationUnread(kind?: WorkspaceCommunicationKind) {
  // Prefer a primitive snapshot — Object.is-stable when the count is unchanged.
  return useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    () => workspaceCommunicationRepository.getUnreadCount(kind),
    () => workspaceCommunicationRepository.getUnreadCount(kind),
  );
}
