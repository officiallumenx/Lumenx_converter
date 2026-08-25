/**
 * Thin re-exports for Admin Home attention counts.
 * Keeps the home route free of deep store coupling.
 */

export { loadAttendancePendingFromRegisters as loadAttendancePending } from "@/lib/attendance-pending";
export { loadDiarySubmissionLogs } from "@lumenx/utils";
export {
  loadMarkEntries,
  teachersWithPendingMarks,
} from "@/lib/marks-entry-store";
export { loadBirthdayBoard } from "@/lib/birthday-workflow";
export {
  loadPendingReviews,
  subscribePendingReviews,
  type PendingReviewItem,
} from "@/lib/pending-reviews";
