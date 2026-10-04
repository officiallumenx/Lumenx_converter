import { useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { setActivityApiContext, clearActivityApiContext } from "@/lib/activity/context";
import { activityHierarchyRepository } from "@/lib/activity/hierarchy/repository";
import { workspaceAchievementsRepository } from "@/lib/activity/workspace-achievements";
import { workspaceCalendarRepository } from "@/lib/activity/workspace-calendar";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import { sportsV2ApiStore } from "@/lib/activity/sports-v2-api-store";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";

/** Survives layout remount so Activity does not re-bootstrap /me + preload every open. */
let configuredInstituteId: string | null = null;
let warmPromise: Promise<void> | null = null;
let warmingInstituteId: string | null = null;

async function preloadActivityStores(): Promise<void> {
  await activityHierarchyRepository.preload();
  await Promise.all([
    workspaceAchievementsRepository.preload(),
    workspaceCalendarRepository.preload(),
    workspaceCommunicationRepository.preload(),
    sportsV2ApiStore.preload(),
  ]);
}

/**
 * Prefetch entry: set activity API context and warm repositories for an institute
 * without requiring the /activity layout to be mounted.
 */
export function warmActivityApiSession(instituteId: string): Promise<void> {
  if (!isApiAuthMode()) return Promise.resolve();
  if (configuredInstituteId === instituteId) return Promise.resolve();
  if (warmPromise && warmingInstituteId === instituteId) return warmPromise;

  setActivityApiContext({ instituteId });
  warmingInstituteId = instituteId;
  warmPromise = preloadActivityStores()
    .then(() => {
      configuredInstituteId = instituteId;
    })
    .finally(() => {
      warmPromise = null;
      warmingInstituteId = null;
    });
  return warmPromise;
}

/**
 * Activity workspace API bootstrap.
 * Reuses portal.teacherId when available and keeps the session warm across revisits
 * for the same institute (no full-page skeleton flash).
 */
export function useActivityApiSession() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const teacherId = portal.isTeacher ? portal.teacherId : null;
  const apiMode = isApiAuthMode();
  const [ready, setReady] = useState(
    !apiMode || (Boolean(activeInstituteId) && configuredInstituteId === activeInstituteId),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiMode || !activeInstituteId) {
      clearActivityApiContext();
      configuredInstituteId = null;
      setReady(true);
      setError(null);
      return;
    }

    if (configuredInstituteId === activeInstituteId) {
      setReady(true);
      setError(null);
      return;
    }

    // Wait for teacher identity from portal when possible (avoids remount /me).
    if (portal.isLoading && !teacherId) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);
    setError(null);

    void (async () => {
      try {
        if (!teacherId) {
          const me = await getConnectApiClient().get<MeResponse>("/api/v1/me");
          if (cancelled) return;
          const teacher = me.identities.teachers.find(
            (t) => t.instituteId === activeInstituteId && t.status === "active",
          );
          if (!teacher) {
            throw new Error("No active teacher profile for this institute");
          }
        }

        await warmActivityApiSession(activeInstituteId);
        if (!cancelled) {
          setReady(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Activity workspace unavailable");
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Keep context warm for revisit — clear only when institute/mode changes above.
    };
  }, [apiMode, activeInstituteId, teacherId, portal.isLoading]);

  return { ready, apiMode, error };
}
