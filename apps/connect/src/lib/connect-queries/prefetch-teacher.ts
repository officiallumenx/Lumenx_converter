import type { QueryClient } from "@tanstack/react-query";
import { listSubjects, listTeacherAssignments } from "@/lib/teacher-classes/api";
import { loadTeacherHomeworkList } from "@/lib/homework";
import { loadTeacherExamPapers } from "@/lib/exams";
import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import { runPrefetchTiers, type IdleCancel } from "./schedule-idle";

/**
 * Warm teacher module caches after roster is ready.
 * Timetable is already loaded by the Home bundle — do not prefetch it again as critical.
 * Subjects/assignments resolve from the roster catalog TTL cache (no duplicate network).
 * Homework warm runs idle so it does not compete with Home enrichment.
 */
export function prefetchTeacherModuleQueries(
  queryClient: QueryClient,
  userId: string,
  instituteId: string,
  teacherId: string,
): IdleCancel {
  return runPrefetchTiers({
    critical: [],
    deferred: [
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
            connectQueryKeys.examsTeacher(instituteId),
          ),
          queryFn: () => loadTeacherExamPapers({ instituteId, teacherId }),
        });
      },
    ],
  });
}
