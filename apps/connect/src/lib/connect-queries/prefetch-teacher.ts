import type { QueryClient } from "@tanstack/react-query";
import { listSubjects, listTeacherAssignments } from "@/lib/teacher-classes/api";
import { loadTeacherHomeworkList } from "@/lib/homework";
import { loadTeacherTimetable } from "@/lib/timetable";
import { loadTeacherExamPapers } from "@/lib/exams";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import { runPrefetchTiers, type IdleCancel } from "./schedule-idle";

/**
 * Warm common teacher module caches after roster/bundle is ready.
 * Homework + timetable are critical; exams defer to idle.
 */
export function prefetchTeacherModuleQueries(
  queryClient: QueryClient,
  userId: string,
  instituteId: string,
  teacherId: string,
): IdleCancel {
  return runPrefetchTiers({
    critical: [
      () => {
        void queryClient.prefetchQuery({
          queryKey: scopedConnectKey(
            userId,
            connectQueryKeys.homeworkTeacher(instituteId, teacherId),
          ),
          queryFn: async () => {
            const [subjects, assignments, list] = await Promise.all([
              listSubjects(instituteId),
              listTeacherAssignments({ instituteId, teacherId }),
              loadTeacherHomeworkList({ instituteId, teacherId }),
            ]);
            return { subjects, assignments, list };
          },
        });
      },
      () => {
        void queryClient.prefetchQuery({
          queryKey: scopedConnectKey(
            userId,
            connectQueryKeys.timetableTeacher(instituteId, "mine"),
          ),
          queryFn: async () => {
            const token = await getSupabaseAccessToken();
            if (!token) {
              throw new Error("Authentication required");
            }
            return loadTeacherTimetable({ instituteId });
          },
        });
      },
    ],
    deferred: [
      () => {
        void queryClient.prefetchQuery({
          queryKey: scopedConnectKey(
            userId,
            connectQueryKeys.examsTeacher(instituteId),
          ),
          queryFn: () => loadTeacherExamPapers({ instituteId }),
        });
      },
    ],
  });
}
