/** Mirrors backend ParentDto — keep in sync with admin parents types. */

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
