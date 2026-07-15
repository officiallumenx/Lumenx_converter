/**
 * Activity Hub — category registry shared across workspace modules.
 */
export type ActivityCategoryId =
  | "sports"
  | "events"
  | "competitions"
  | "clubs"
  | "workshops";

export type ActivityCategoryMeta = {
  id: ActivityCategoryId;
  label: string;
  pluralLabel: string;
  moduleId: ActivityCategoryId;
};

export const ACTIVITY_CATEGORIES: readonly ActivityCategoryMeta[] = [
  { id: "sports", label: "Sport", pluralLabel: "Sports", moduleId: "sports" },
  { id: "events", label: "Event", pluralLabel: "Events", moduleId: "events" },
  {
    id: "competitions",
    label: "Competition",
    pluralLabel: "Competitions",
    moduleId: "competitions",
  },
  { id: "clubs", label: "Club", pluralLabel: "Clubs", moduleId: "clubs" },
  { id: "workshops", label: "Workshop", pluralLabel: "Workshops", moduleId: "workshops" },
] as const;

export function getActivityCategory(id: ActivityCategoryId): ActivityCategoryMeta {
  const found = ACTIVITY_CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown activity category: ${id}`);
  return found;
}

export function getActivityCategoryLabel(id: ActivityCategoryId): string {
  return getActivityCategory(id).label;
}
