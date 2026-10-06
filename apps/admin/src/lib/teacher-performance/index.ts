export type {
  SubjectRanking,
  TeacherPerformanceDto,
  TeacherPerformanceListPayload,
  TeacherPerformanceMetrics,
  TeacherPerformanceSummary,
} from "./types";
export { assertApiMode, listTeacherPerformance } from "./api";
export {
  loadTeacherPerformanceList,
  type TeacherPerformanceLoadStatus,
  type TeacherPerformanceListState,
} from "./load";
export {
  resolveTeacherPerformanceListView,
  shouldCommitTeacherPerformanceLoad,
} from "./list-view";
export {
  computeSubjectRankings,
  computeInstituteAverage,
  findTopRatedTeacher,
  formatRating,
  formatSubjects,
  instituteTrendDelta,
  trendTone,
} from "./stats";
