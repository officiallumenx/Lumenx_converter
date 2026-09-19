/**
 * @deprecated Prefer `useDriverAssignmentQuery` from `@/lib/transport-queries`.
 * Thin re-export so existing imports keep working during migration.
 */
export {
  useDriverAssignmentQuery as useDriverAssignment,
  useEnsureDriverScope,
} from "@/lib/transport-queries";
