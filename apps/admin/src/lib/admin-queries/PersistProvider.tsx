/**
 * Persist TanStack Query cache to IndexedDB (user-scoped).
 * Fail-open if storage is unavailable.
 */
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { QueryClient } from "@tanstack/react-query";
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
  const userId = user?.id ?? null;
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
