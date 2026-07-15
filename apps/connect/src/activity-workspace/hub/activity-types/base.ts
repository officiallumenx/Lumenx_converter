/**
 * Activity Hub — shared activity types used across all workspace modules.
 * Every creatable activity supports these core fields.
 */
import type { ActivityCategoryId } from "../categories";
import type { ActivityAttachment } from "../attachments";
import type { ActivityAudienceSelection } from "../audience";

export type ActivityLifecycleStatus = "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";

/** Display status for dashboard and list views. */
export type ActivityDisplayStatus = "ongoing" | "upcoming" | "completed";

/** Canonical activity record shared by Sports, Events, Clubs, Workshops, Competitions. */
export interface BaseActivity {
  id: string;
  title: string;
  category: ActivityCategoryId;
  description: string;
  venue: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  time: string;
  attachments: ActivityAttachment[];
  audience: ActivityAudienceSelection;
  lifecycleStatus: ActivityLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

/** Input shape for the activity creation workflow (all modules). */
export interface ActivityCreateInput {
  title: string;
  category: ActivityCategoryId;
  description: string;
  venue: string;
  date: string;
  time: string;
  attachments: ActivityAttachment[];
  audience: ActivityAudienceSelection;
}

export function toDisplayStatus(
  lifecycle: ActivityLifecycleStatus,
  dateIso: string,
): ActivityDisplayStatus {
  if (lifecycle === "ongoing") return "ongoing";
  if (lifecycle === "completed" || lifecycle === "cancelled") return "completed";
  const today = new Date().toISOString().slice(0, 10);
  return dateIso <= today ? "ongoing" : "upcoming";
}
