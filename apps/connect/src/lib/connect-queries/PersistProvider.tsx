/**
 * Persist TanStack Query cache to IndexedDB (user-scoped).
 * Hydrates only after auth has a real user id — never an anonymous bucket.
 * Must mount under AppProvider (for user id) and under the root QueryClientProvider.
 *
 * While IndexedDB restore runs, portal queries stay disabled (see useConnectQueryRestoring)
 * so Home does not race an empty memory cache and blank the warm reopen paint.
 */
import { type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/lib/app-state";
import {
  connectPersistOptions,
  connectPersistStorageKey,
  getConnectQueryPersister,
  removeForeignUserConnectQueries,
} from "./persist";

const ConnectQueryRestoringCtx = createContext(false);

/** True while persisted RQ cache is hydrating from IndexedDB for the signed-in user. */
export function useConnectQueryRestoring(): boolean {
  return useContext(ConnectQueryRestoringCtx);
}

export function ConnectPersistQueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  const { user } = useApp();
  const userId = user?.id?.trim() || null;
  const [restoring, setRestoring] = useState(Boolean(userId));

  // When the signed-in user changes, block portal fetches until that user's IDB restores.
  useEffect(() => {
    setRestoring(Boolean(userId));
  }, [userId]);

  // Failsafe: never leave Home blocked if persist callbacks are skipped.
  useEffect(() => {
    if (!userId || !restoring) return;
    const t = window.setTimeout(() => setRestoring(false), 2_500);
    return () => window.clearTimeout(t);
  }, [userId, restoring]);

  const markRestored = useCallback(() => {
    // Defense in depth: drop any in-memory entries for a different user.
    removeForeignUserConnectQueries(client, userId);
    setRestoring(false);
  }, [client, userId]);

  // Logged out / hydrating: keep the outer QueryClientProvider; no disk restore.
  if (!userId) {
    return (
      <ConnectQueryRestoringCtx.Provider value={false}>
        {children}
      </ConnectQueryRestoringCtx.Provider>
    );
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
      onSuccess={markRestored}
      onError={markRestored}
    >
      <ConnectQueryRestoringCtx.Provider value={restoring}>
        {children}
      </ConnectQueryRestoringCtx.Provider>
    </PersistQueryClientProvider>
  );
}
