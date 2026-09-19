import { useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { loadDiaryApiDay } from "@/lib/diary/api-store";
import { loadDiarySectionOptions } from "@/lib/diary/sections";
import type { DiarySectionOption } from "@/lib/diary/types";
import { diaryRepository } from "@/lib/teacher/diary/repository";
import type { DiaryScope } from "@/lib/teacher/diary/types";
import { yesterdayIso } from "@/lib/teacher/diary/dates";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";

export function useDiaryApiSession(scope: DiaryScope) {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const portal = useTeacherPortal();
  const [ready, setReady] = useState(!apiMode);
  const [apiSectionOptions, setApiSectionOptions] = useState<DiarySectionOption[]>([]);

  useEffect(() => {
    if (!apiMode || !activeInstituteId) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    void getConnectApiClient()
      .get<MeResponse>("/api/v1/me")
      .then(async (me) => {
        if (cancelled) return;
        const teacher = me.identities.teachers.find(
          (t) => t.instituteId === activeInstituteId && t.status === "active",
        );
        if (!teacher) throw new Error("No active teacher profile for this institute");
        diaryRepository.configureApiContext({
          instituteId: activeInstituteId,
          teacherId: teacher.teacherId,
        });
        await loadDiaryApiDay(scope, yesterdayIso());
        if (scope === "subject") {
          const options = await loadDiarySectionOptions({
            instituteId: activeInstituteId,
            teacherId: teacher.teacherId,
          });
          if (!cancelled) setApiSectionOptions(options);
        } else if (!cancelled) {
          setApiSectionOptions([]);
        }
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, activeInstituteId, scope]);

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
