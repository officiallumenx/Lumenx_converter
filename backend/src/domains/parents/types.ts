/** Parents domain types aligned to parent / guardian_link. */

export type ParentInviteStatus = "pending" | "active";
export type ParentAccessStatus = "active" | "hold" | "suspended";
export type GuardianRelationship = "mother" | "father" | "guardian";
export type GuardianLinkStatus = "active" | "inactive";

export type ParentRow = {
  id: string;
  institute_id: string;
  user_profile_id: string | null;
  legacy_code: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  invite_status: ParentInviteStatus;
  access_status: ParentAccessStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GuardianLinkRow = {
  id: string;
  institute_id: string;
  student_id: string;
  parent_id: string;
  relationship: GuardianRelationship;
  is_primary: boolean;
  is_emergency_contact: boolean;
  status: GuardianLinkStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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
  inviteStatus: ParentInviteStatus;
  accessStatus: ParentAccessStatus;
  createdAt: string;
  updatedAt: string;
  links?: GuardianLinkDto[];
};

export type CreateParentInput = {
  instituteId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  inviteStatus?: ParentInviteStatus;
  accessStatus?: ParentAccessStatus;
  legacyCode?: string | null;
  /** Ignored — never trust client. */
  userProfileId?: string | null;
};

export type UpdateParentInput = {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  inviteStatus?: ParentInviteStatus;
  accessStatus?: ParentAccessStatus;
  legacyCode?: string | null;
};

export type CreateGuardianLinkInput = {
  studentId: string;
  relationship: GuardianRelationship;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  status?: GuardianLinkStatus;
};

export type UpdateGuardianLinkInput = {
  relationship?: GuardianRelationship;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  status?: GuardianLinkStatus;
};

export type ListParentsFilter = {
  instituteId: string;
  inviteStatus?: ParentInviteStatus;
  accessStatus?: ParentAccessStatus;
  q?: string;
};
