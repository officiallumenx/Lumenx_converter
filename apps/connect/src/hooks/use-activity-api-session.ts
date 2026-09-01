import { useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { setActivityApiContext, clearActivityApiContext } from "@/lib/activity/context";
import { activityHierarchyRepository } from "@/lib/activity/hierarchy/repository";
import { workspaceAchievementsRepository } from "@/lib/activity/workspace-achievements";
import { useApp } from "@/lib/app-state";

export function useActivityApiSession() {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const [ready, setReady] = useState(!apiMode);

  useEffect(() => {
    if (!apiMode || !activeInstituteId) {
      clearActivityApiContext();
      setReady(true);
      return;
    }

    let cancelled = false;
    void getConnectApiClient()
      .get<MeResponse>("/api/v1/me")
      .then(async (me) => {
        if (cancelled) return;
        const teacher = me.identities.teachers.find(
          (t) => t.instituteId === activeInstituteId && t.status === "active",
        );
        if (!teacher) throw new Error("No active teacher profile for this institute");
        setActivityApiContext({ instituteId: activeInstituteId });
        await activityHierarchyRepository.preload();
        await workspaceAchievementsRepository.preload();
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      clearActivityApiContext();
    };
  }, [apiMode, activeInstituteId]);

  return { ready, apiMode };
}
