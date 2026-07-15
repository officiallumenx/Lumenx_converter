/**
 * Activity Hub — timeline types for coordinator audit trails.
 */
import type { ActivityCategoryId } from "../categories";

export type ActivityTimelineCategory = ActivityCategoryId | "certificates" | "attendance";

export interface ActivityTimelineItem {
  id: string;
  action: string;
  detail: string;
  timeAgo: string;
  category: ActivityTimelineCategory;
  activityId?: string;
}
