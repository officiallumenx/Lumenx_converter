import { useEffect, useState } from "react";
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

export function useDiaryApiSession(scope: DiaryScope) {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const [ready, setReady] = useState(!apiMode);
  const [sectionOptions, setSectionOptions] = useState<DiarySectionOption[]>([]);

  useEffect(() => {
    if (!apiMode || !activeInstituteId) {
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
          if (!cancelled) setSectionOptions(options);
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

  return { ready, apiMode, sectionOptions };
}
