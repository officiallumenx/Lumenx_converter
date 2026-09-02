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
  /** Human-readable linked children — populated when student roster is joined client-side. */
  linkedChildrenDisplay: string;
  /** True when parent.userProfileId is set (Connect login enabled). */
  hasPortalLogin: boolean;
  /** Demo-compat — not populated from API. */
  password: string;
  /** Short identity label for list rows (legacy code / prefix). */
  identityLabel: string;
};

export type ParentDetailItem = ParentListItem & {
  instituteId: string;
  legacyCode: string | null;
  updatedAt: string;
  links: GuardianLinkDto[];
  /** Populated when student roster is joined — keyed by studentId. */
  linkStudentLabels?: Record<string, string>;
};

export type ListParentsParams = {
  instituteId: string;
  inviteStatus?: PortalInviteStatus;
  accessStatus?: PortalAccessStatus;
  q?: string;
};

export type { PortalAccessStatus, PortalInviteStatus };
