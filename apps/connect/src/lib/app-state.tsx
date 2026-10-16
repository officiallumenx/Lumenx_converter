import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import type { Institute, Role, User, Child } from "@lumenx/types";
import { CONNECT_STORAGE_KEYS } from "@lumenx/auth";
import { applyTextScale, loadTextScale } from "@lumenx/ui";
import { recordLocalChangeForSync } from "@lumenx/utils";
import { registeredInstitutes, children as demoLinkedChildren } from "./mock-data";
import { LINKED_CHILD_IDS, resolveLinkedChildId } from "./parent-portal-data";
import { appLockStore } from "./app-lock-store";
import { awaitConnectStoreReset, resetAllConnectStores } from "./reset-stores";
import { isRole, isThemeMode, parsePersistedUser } from "./session-validation";
import { isApiAuthMode } from "@/auth/auth-mode";
import { apiSignOut, tryHydrateApiSession } from "@/auth/api-auth";
import {
  bumpConnectAuthSessionGeneration,
  setConnectApiUnauthorizedHandler,
} from "@/lib/connect-api";
import { ApiClientError } from "@/lib/api";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { isInstituteUuid } from "@/lib/institute-id";
import { useDataRefreshGeneration } from "@/hooks/useReloadKey";
import {
  clearAllLinkedChildrenCaches,
  clearLinkedChildrenCacheForUser,
  readLinkedChildrenCache,
  writeLinkedChildrenCache,
} from "@/lib/parents/linked-children-cache";
import {
  enrichLinkedChildrenMetrics,
  loadLinkedChildrenFromApi,
} from "@/lib/parents/load-linked-children";
import { clearPhotoSignedUrlCache } from "@/lib/photos/api";
import { clearTeacherPortalApiCache } from "@/lib/teacher-classes/load";

function resolveInstitute(id: string | null): Institute | null {
  if (!id) return null;
  return registeredInstitutes.find((i) => i.id === id) ?? null;
}

/** Persist / restore child id — keep API UUIDs; never coerce them to demo C1/C2. */
function readPersistedChildId(): string {
  const raw = localStorage.getItem(CONNECT_STORAGE_KEYS.child)?.trim() ?? "";
  if (!raw) return "";
  if (isApiAuthMode()) {
    return isInstituteUuid(raw) ? raw : "";
  }
  return resolveLinkedChildId(raw);
}

interface AppState {
  user: User | null;
  role: Role | null;
  /** False until localStorage session is restored (avoids login redirect flash). */
  hydrated: boolean;
  activeInstituteId: string | null;
  institute: Institute | null;
  theme: "light" | "dark";
  activeChildId: string;
  /** Parent-linked learners — demo mock or API-loaded in auth mode. */
  linkedChildren: Child[];
  /** Parent API: children list load in flight. */
  linkedChildrenLoading: boolean;
  /** Parent API: last children load error (if any). */
  linkedChildrenError: string | null;
  /** Parent: show student-facing nav (growth, ID card) for a child without their own device. */
  studentIncludedMode: boolean;
  setActiveChildId: (id: string) => void;
  setStudentIncludedMode: (value: boolean) => void;
  signIn: (phone: string, role: Role, instituteId: string, opts?: { displayName?: string }) => void;
  signInApi: (user: User, role: Role, instituteId: string) => void;
  updateProfile: (
    patch: Partial<Pick<User, "name" | "phone" | "email" | "address" | "avatar">>,
  ) => void;
  signOut: () => void;
  toggleTheme: () => void;
}

const Ctx = createContext<AppState | null>(null);

function clearAuthStorage() {
  localStorage.removeItem(CONNECT_STORAGE_KEYS.user);
  localStorage.removeItem(CONNECT_STORAGE_KEYS.role);
  localStorage.removeItem(CONNECT_STORAGE_KEYS.institute);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const refreshGeneration = useDataRefreshGeneration();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role | null>(null);
  const [activeInstituteId, setActiveInstituteIdState] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeChildId, setActiveChildIdState] = useState<string>(
    isApiAuthMode() ? "" : (demoLinkedChildren[0]?.id ?? "C1"),
  );
  const [linkedChildren, setLinkedChildren] = useState<Child[]>(
    isApiAuthMode() ? [] : demoLinkedChildren,
  );
  const [linkedChildrenLoading, setLinkedChildrenLoading] = useState(false);
  const [linkedChildrenError, setLinkedChildrenError] = useState<string | null>(null);
  const [studentIncludedMode, setStudentIncludedModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConnectApiUnauthorizedHandler(() => {
      void (async () => {
        bumpConnectAuthSessionGeneration();
        // API client already refreshed + retried once on 401.
        // Reaching here means auth is genuinely invalid — clear Supabase + UI + caches.
        await apiSignOut().catch(() => undefined);
        clearAuthStorage();
        setUser(null);
        setRoleState(null);
        setActiveInstituteIdState(null);
        setLinkedChildren(isApiAuthMode() ? [] : demoLinkedChildren);
        setLinkedChildrenLoading(false);
        setLinkedChildrenError(null);
        clearPhotoSignedUrlCache();
        clearAllLinkedChildrenCaches();
        // Embedded admissions portal shares Connect's API client + Supabase session.
        void import("@/lib/admissions/repositories").then(({ signOutUser }) => {
          signOutUser();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("lumenx:connect-auth-cleared"));
          }
        });
        void import("@/lib/connect-queries").then(
          ({ clearConnectQueryClient, clearAllPersistedConnectCaches }) => {
            clearConnectQueryClient();
            void clearAllPersistedConnectCaches();
          },
        );
      })();
    });
    return () => setConnectApiUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const persistedUser = parsePersistedUser(localStorage.getItem(CONNECT_STORAGE_KEYS.user));
        const persistedRole = localStorage.getItem(CONNECT_STORAGE_KEYS.role);
        const persistedTheme = localStorage.getItem(CONNECT_STORAGE_KEYS.theme);
        const ins = localStorage.getItem(CONNECT_STORAGE_KEYS.institute);
        const sim = localStorage.getItem(CONNECT_STORAGE_KEYS.studentIncluded);

        const roleOk = isRole(persistedRole);

        if (roleOk && persistedUser) {
          // Restore immediately so a returning user never sits on the spinner.
          setUser(persistedUser);
          setRoleState(persistedRole);
          if (ins) setActiveInstituteIdState(ins);
          if (isThemeMode(persistedTheme)) setTheme(persistedTheme);
          const childId = readPersistedChildId();
          if (childId) setActiveChildIdState(childId);
          if (sim === "1") setStudentIncludedModeState(true);
          setHydrated(true);

          const session = await tryHydrateApiSession(persistedRole, ins);
          if (session) {
            setUser(session.user);
            setRoleState(persistedRole);
            setActiveInstituteIdState(session.instituteId);
            localStorage.setItem(CONNECT_STORAGE_KEYS.institute, session.instituteId);
          } else if (isApiAuthMode()) {
            // Persisted UI without a usable token must not stay "logged in".
            // Institute resolve failures with a live token keep the shell (API 401 clears).
            const token = await getSupabaseAccessToken();
            if (!token) {
              clearAuthStorage();
              setUser(null);
              setRoleState(null);
              setActiveInstituteIdState(null);
              clearPhotoSignedUrlCache();
              clearTeacherPortalApiCache();
              clearAllLinkedChildrenCaches();
            }
          }
          return;
        }

        if (persistedUser || persistedRole) {
          const token = await getSupabaseAccessToken();
          if (!token) clearAuthStorage();
        }

        if (isThemeMode(persistedTheme)) setTheme(persistedTheme);
        const childId = readPersistedChildId();
        if (childId) setActiveChildIdState(childId);
        if (sim === "1") setStudentIncludedModeState(true);
      } catch (err) {
        const transient =
          err instanceof ApiClientError &&
          (err.status === 0 || err.status >= 500 || err.status === 401);
        if (!transient) {
          const token = await getSupabaseAccessToken();
          if (!token) clearAuthStorage();
        }
      }
      setHydrated(true);
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isApiAuthMode()) {
      setLinkedChildren(demoLinkedChildren);
      setLinkedChildrenLoading(false);
      setLinkedChildrenError(null);
      return;
    }
    if (role !== "parent" || !activeInstituteId) {
      setLinkedChildren([]);
      setLinkedChildrenLoading(false);
      setLinkedChildrenError(null);
      return;
    }

    const userId = user?.id?.trim() ?? "";
    const warm =
      userId && activeInstituteId
        ? readLinkedChildrenCache(userId, activeInstituteId)
        : null;
    if (warm && warm.length > 0) {
      // Paint ChildSwitcher / Home immediately from last successful load.
      setLinkedChildren(warm);
      setLinkedChildrenLoading(false);
      setLinkedChildrenError(null);
      setActiveChildIdState((current) => {
        const valid = warm.some((child) => child.id === current);
        const next = valid ? current : warm[0]!.id;
        localStorage.setItem(CONNECT_STORAGE_KEYS.child, next);
        return next;
      });
    } else {
      setLinkedChildrenLoading(true);
      setLinkedChildrenError(null);
    }

    let cancelled = false;
    void loadLinkedChildrenFromApi({
      instituteId: activeInstituteId,
      priorChildren: warm ?? undefined,
      fastIdentityOnly: true,
    }).then(async (result) => {
      if (cancelled) return;
      if (result.status === "error") {
        // Keep warm cache visible — never replace real children with empty on refresh fail.
        setLinkedChildrenLoading(false);
        setLinkedChildrenError(result.errorMessage);
        if (!warm?.length) setLinkedChildren([]);
        return;
      }
      if (result.status !== "ready" && result.status !== "empty") {
        setLinkedChildrenLoading(false);
        if (!warm?.length) setLinkedChildren([]);
        return;
      }
      setLinkedChildren(result.children);
      setLinkedChildrenLoading(false);
      setLinkedChildrenError(result.errorMessage);
      if (result.children.length === 0) {
        setActiveChildIdState("");
        localStorage.removeItem(CONNECT_STORAGE_KEYS.child);
        return;
      }
      if (userId) {
        writeLinkedChildrenCache(userId, activeInstituteId, result.children);
      }
      setActiveChildIdState((current) => {
        const valid = result.children.some((child) => child.id === current);
        const next = valid ? current : result.children[0]!.id;
        localStorage.setItem(CONNECT_STORAGE_KEYS.child, next);
        return next;
      });

      // Metrics (attendance / avg) enrich in background — do not block Home.
      const enriched = await enrichLinkedChildrenMetrics(
        activeInstituteId,
        result.children,
      );
      if (cancelled) return;
      setLinkedChildren(enriched);
      if (userId) {
        writeLinkedChildrenCache(userId, activeInstituteId, enriched);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, role, activeInstituteId, refreshGeneration, user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(CONNECT_STORAGE_KEYS.theme, theme);
    // Sync native status-bar icon color to the in-app theme (the app's theme is a manual
    // toggle, independent of the system light/dark setting). No-op on web.
    if (Capacitor.isNativePlatform()) {
      void import("@capacitor/status-bar")
        .then(({ StatusBar, Style }) =>
          StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }),
        )
        .catch(() => {
          /* status-bar plugin unavailable — native theme fallback still applies */
        });
    }
  }, [theme, hydrated]);

  useEffect(() => {
    /* Shared typography: apply in-app text size (do not follow device font scale). */
    applyTextScale(loadTextScale());
  }, []);

  const institute = useMemo(() => resolveInstitute(activeInstituteId), [activeInstituteId]);

  const signIn = useCallback((_phone: string, _r: Role, _instituteId: string) => {
    throw new Error("Demo sign-in has been removed. Use signInApi with an API session.");
  }, []);

  const signInApi = useCallback((u: User, r: Role, instituteId: string) => {
    bumpConnectAuthSessionGeneration();
    let previousUserId: string | null = null;
    try {
      const raw = localStorage.getItem(CONNECT_STORAGE_KEYS.user);
      const prev = raw ? (JSON.parse(raw) as { id?: string }) : null;
      previousUserId = prev?.id?.trim() || null;
    } catch {
      previousUserId = null;
    }
    const apply = () => {
      setUser(u);
      setRoleState(r);
      setActiveInstituteIdState(instituteId);
      localStorage.setItem(CONNECT_STORAGE_KEYS.user, JSON.stringify(u));
      localStorage.setItem(CONNECT_STORAGE_KEYS.role, r);
      localStorage.setItem(CONNECT_STORAGE_KEYS.institute, instituteId);
    };
    void awaitConnectStoreReset()
      .then(() =>
        import("@/lib/connect-queries").then(
          ({ clearConnectQueryClient, clearPersistedConnectCache }) => {
            // Drop prior session in-memory cache; keep the new user's persisted warm cache.
            clearConnectQueryClient();
            clearPhotoSignedUrlCache();
            clearTeacherPortalApiCache();
            if (previousUserId && previousUserId !== u.id) {
              void clearPersistedConnectCache(previousUserId);
              clearLinkedChildrenCacheForUser(previousUserId);
            }
          },
        ),
      )
      .then(apply);
  }, []);

  const signOut = useCallback(() => {
    bumpConnectAuthSessionGeneration();
    appLockStore.lockSession();
    void apiSignOut();
    setUser(null);
    setRoleState(null);
    setActiveInstituteIdState(null);
    setActiveChildIdState(isApiAuthMode() ? "" : (demoLinkedChildren[0]?.id ?? "C1"));
    setLinkedChildren(isApiAuthMode() ? [] : demoLinkedChildren);
    setLinkedChildrenLoading(false);
    setLinkedChildrenError(null);
    setStudentIncludedModeState(false);
    clearAuthStorage();
    localStorage.removeItem(CONNECT_STORAGE_KEYS.child);
    localStorage.removeItem(CONNECT_STORAGE_KEYS.studentIncluded);
    try {
      sessionStorage.removeItem("lumenx_activity_workspace_banner_dismissed");
    } catch {
      /* ignore */
    }
    void resetAllConnectStores();
    clearPhotoSignedUrlCache();
    clearTeacherPortalApiCache();
    clearAllLinkedChildrenCaches();
    // Drop in-memory + persisted server-state so the next account cannot see prior data.
    void import("@/lib/connect-queries").then(
      ({ clearConnectQueryClient, clearAllPersistedConnectCaches }) => {
        clearConnectQueryClient();
        void clearAllPersistedConnectCaches();
      },
    );
  }, []);

  const setActiveChildId = useCallback(
    (id: string) => {
      const allowed = isApiAuthMode()
        ? linkedChildren.some((child) => child.id === id)
        : LINKED_CHILD_IDS.has(id);
      if (!allowed) return;
      setActiveChildIdState(id);
      localStorage.setItem(CONNECT_STORAGE_KEYS.child, id);
    },
    [linkedChildren],
  );

  const setStudentIncludedMode = useCallback((value: boolean) => {
    setStudentIncludedModeState(value);
    localStorage.setItem(CONNECT_STORAGE_KEYS.studentIncluded, value ? "1" : "0");
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "phone" | "email" | "address" | "avatar">>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        localStorage.setItem(CONNECT_STORAGE_KEYS.user, JSON.stringify(next));
        recordLocalChangeForSync({
          app: "connect",
          module: "Profile",
          label: "Update profile",
          op: "update",
        });
        return next;
      });
    },
    [],
  );

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  const value = useMemo<AppState>(
    () => ({
      user,
      role,
      hydrated,
      activeInstituteId,
      institute,
      theme,
      activeChildId,
      linkedChildren,
      linkedChildrenLoading,
      linkedChildrenError,
      studentIncludedMode,
      setActiveChildId,
      setStudentIncludedMode,
      signIn,
      signInApi,
      updateProfile,
      signOut,
      toggleTheme,
    }),
    [
      user,
      role,
      hydrated,
      activeInstituteId,
      institute,
      theme,
      activeChildId,
      linkedChildren,
      linkedChildrenLoading,
      linkedChildrenError,
      studentIncludedMode,
      setActiveChildId,
      setStudentIncludedMode,
      signIn,
      signInApi,
      updateProfile,
      signOut,
      toggleTheme,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
