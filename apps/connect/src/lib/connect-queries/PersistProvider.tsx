/**
 * Persist TanStack Query cache to IndexedDB (user-scoped).
 * Hydrates only after auth has a real user id — never an anonymous bucket.
 * Must mount under AppProvider (for user id) and under the root QueryClientProvider.
 */
import { type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import {
  connectPersistOptions,
  connectPersistStorageKey,
  getConnectQueryPersister,
} from "./persist";

export function ConnectPersistQueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  const { user } = useApp();
  const userId = user?.id?.trim() || null;

  // Logged out / hydrating: keep the outer QueryClientProvider; no disk restore.
  if (!userId) {
    return <>{children}</>;
  }

  const persister = getConnectQueryPersister(userId);

  return (
    <PersistQueryClientProvider
      key={connectPersistStorageKey(userId)}
      client={client}
      persistOptions={{
        persister,
        ...connectPersistOptions,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
