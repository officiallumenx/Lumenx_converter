import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadDiaryApiDay } from "@/lib/diary/api-store";
import { loadDiarySectionOptions } from "@/lib/diary/sections";
import type { DiarySectionOption } from "@/lib/diary/types";
import { diaryRepository } from "@/lib/teacher/diary/repository";
import type { DiaryScope } from "@/lib/teacher/diary/types";
import { yesterdayIso } from "@/lib/teacher/diary/dates";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";

/**
 * Diary session bootstrap for API mode.
 * Reuses portal.teacherId (no remount /me) and keeps ready=true across revisits
 * once the institute/scope session has been configured.
 */
export function useDiaryApiSession(scope: DiaryScope) {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const portal = useTeacherPortal();
  const teacherId = portal.isTeacher ? portal.teacherId : null;
  const configuredKeyRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!apiMode);
  const [apiSectionOptions, setApiSectionOptions] = useState<DiarySectionOption[]>([]);

  useEffect(() => {
    if (!apiMode || !activeInstituteId) {
      setReady(true);
      return;
    }

    if (portal.isLoading && !teacherId) {
      // Wait for portal roster — do not flash "not ready" if we already configured.
      if (!configuredKeyRef.current?.startsWith(`${activeInstituteId}:`)) {
        setReady(false);
      }
      return;
    }

    if (!teacherId) {
      setReady(true);
      return;
    }

    const configKey = `${activeInstituteId}:${teacherId}:${scope}`;
    if (configuredKeyRef.current === configKey) {
      setReady(true);
      return;
    }

    let cancelled = false;
    // Only block UI on first configure for this institute/teacher/scope.
    if (configuredKeyRef.current !== configKey) {
      setReady(false);
    }

    diaryRepository.configureApiContext({
      instituteId: activeInstituteId,
      teacherId,
    });

    void (async () => {
      try {
        await loadDiaryApiDay(scope, yesterdayIso());
        if (scope === "subject") {
          const options = await loadDiarySectionOptions({
            instituteId: activeInstituteId,
            teacherId,
          });
          if (!cancelled) setApiSectionOptions(options);
        } else if (!cancelled) {
          setApiSectionOptions([]);
        }
        if (!cancelled) {
          configuredKeyRef.current = configKey;
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiMode, activeInstituteId, scope, teacherId, portal.isLoading]);

  /** Prefer timetable assignments; fall back to teacher portal roster sections. */
  const sectionOptions = useMemo(() => {
    if (scope !== "subject") return [];
    if (apiSectionOptions.length > 0) return apiSectionOptions;
    const seen = new Set<string>();
    const fromPortal: DiarySectionOption[] = [];
    for (const cls of portal.classes) {
      if (!cls.id || seen.has(cls.id)) continue;
      seen.add(cls.id);
      fromPortal.push({
        sectionId: cls.id,
        classId: cls.id,
        label: `${cls.className}-${cls.section}`,
      });
    }
    return fromPortal;
  }, [scope, apiSectionOptions, portal.classes]);

  return { ready, apiMode, sectionOptions };
}
