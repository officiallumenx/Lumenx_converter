/**
 * Persist TanStack Query cache to IndexedDB (user-scoped).
 * Hydrates only after auth has a real user id — never an anonymous bucket.
 * Fail-open if storage is unavailable.
 */
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  adminPersistOptions,
  adminPersistStorageKey,
  getAdminQueryPersister,
} from "./persist";

export function AdminPersistQueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id?.trim() || null;

  // Auth loading / logged out: in-memory only (AuthGate shows spinner until ready).
  if (!userId) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  const persister = getAdminQueryPersister(userId);

  return (
    <PersistQueryClientProvider
      key={adminPersistStorageKey(userId)}
      client={client}
      persistOptions={{
        persister,
        ...adminPersistOptions,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
