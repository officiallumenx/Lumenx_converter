export type {
  DepartmentRanking,
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
  computeDepartmentRankings,
  computeInstituteAverage,
  findTopRatedTeacher,
  formatRating,
  instituteTrendDelta,
  trendTone,
} from "./stats";
