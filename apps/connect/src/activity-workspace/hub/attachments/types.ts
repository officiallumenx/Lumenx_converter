/**
 * Activity Hub — mock attachment model for activity creation workflow.
 */
export type ActivityAttachmentKind = "document" | "image" | "schedule" | "rules" | "other";

export interface ActivityAttachment {
  id: string;
  name: string;
  kind: ActivityAttachmentKind;
  sizeLabel: string;
  /** Mock URL — no real upload backend. */
  url?: string;
  uploadedAt: string;
}
