/** Mirrors backend ParentDto — keep in sync with domains/parents/types.ts. */

import type { PortalAccessStatus, PortalInviteStatus } from "@lumenx/types";

export type GuardianRelationship = "mother" | "father" | "guardian";
export type GuardianLinkStatus = "active" | "inactive";

export type GuardianLinkDto = {
  id: string;
  studentId: string;
  parentId: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  status: GuardianLinkStatus;
  createdAt: string;
  updatedAt: string;
};

export type ParentDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  legacyCode: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  inviteStatus: PortalInviteStatus;
  accessStatus: PortalAccessStatus;
  createdAt: string;
  updatedAt: string;
  links?: GuardianLinkDto[];
};

/** Demo-compat relationship label for shared UI helpers. */
export type ParentRelationshipLabel = "Mother" | "Father" | "Guardian";

/**
 * Presentation-only row consumed by the Parents directory list.
 * Never used as tenant/auth authority.
 */
export type ParentListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  relationship: ParentRelationshipLabel;
  inviteStatus: PortalInviteStatus;
  accessStatus: PortalAccessStatus;
  /** Internal link targets — not displayed as full UUIDs. */
  linkedStudentIds: string[];
  linkedChildrenCount: number;
  linkedChildrenLabel: string;
  /** Demo-compat — not populated from API. */
  password: string;
  /** Short identity label for list rows (legacy code / prefix). */
  identityLabel: string;
};

export type ListParentsParams = {
  instituteId: string;
};

export type { PortalAccessStatus, PortalInviteStatus };
