import type { QueryClient } from "@tanstack/react-query";
import { listSubjects, listTeacherAssignments } from "@/lib/teacher-classes/api";
import { loadTeacherHomeworkList } from "@/lib/homework";
import { loadTeacherTimetable } from "@/lib/timetable";
import { loadTeacherExamPapers } from "@/lib/exams";
import { connectQueryKeys } from "./keys";

/**
 * Warm common teacher module caches after roster/bundle is ready so navigating
 * between modules hits React Query instead of a cold skeleton.
 */
export function prefetchTeacherModuleQueries(
  queryClient: QueryClient,
  instituteId: string,
  teacherId: string,
): void {
  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.homeworkTeacher(instituteId, teacherId),
    queryFn: async () => {
      const [subjects, assignments, list] = await Promise.all([
        listSubjects(instituteId),
        listTeacherAssignments({ instituteId, teacherId }),
        loadTeacherHomeworkList({ instituteId, teacherId }),
      ]);
      return { subjects, assignments, list };
    },
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.timetableTeacher(instituteId, "mine"),
    queryFn: () => loadTeacherTimetable({ instituteId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.examsTeacher(instituteId),
    queryFn: () => loadTeacherExamPapers({ instituteId }),
  });
}
