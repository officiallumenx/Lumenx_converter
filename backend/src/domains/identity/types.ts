/** Identity tenancy: institute, profile, membership. */

export type InstituteKind =
  | "school"
  | "junior_college"
  | "degree_college"
  | "engineering"
  | "university";

export type InstituteStatus = "active" | "inactive" | "suspended" | "archived";
export type ProfileStatus = "active" | "disabled";
export type MembershipStatus = "active" | "invited" | "suspended" | "ended";

export type InstituteRow = {
  id: string;
  code: string;
  name: string;
  kind: InstituteKind;
  status: InstituteStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type InstituteSettingsRow = {
  institute_id: string;
  timezone: string;
  locale: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MembershipRow = {
  id: string;
  user_id: string;
  institute_id: string;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MembershipRoleRow = {
  membership_id: string;
  role_code: string;
  created_at: string;
};

export type RoleCatalogRow = {
  code: string;
  label: string;
  description: string | null;
  is_assignable: boolean;
};

export type InstituteDto = {
  id: string;
  code: string;
  name: string;
  kind: InstituteKind;
  status: InstituteStatus;
  createdAt: string;
  updatedAt: string;
};

export type InstituteSettingsDto = {
  instituteId: string;
  timezone: string;
  locale: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ProfileDto = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
};

export type MembershipDto = {
  id: string;
  userId: string;
  instituteId: string;
  status: MembershipStatus;
  roles: string[];
  /** Present when profile row exists for the membership user. */
  displayName: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInstituteInput = {
  code: string;
  name: string;
  kind: InstituteKind;
  status?: InstituteStatus;
  timezone?: string;
  locale?: string;
};

export type UpdateInstituteInput = {
  name?: string;
  kind?: InstituteKind;
  status?: InstituteStatus;
  code?: string;
};

export type UpdateInstituteSettingsInput = {
  timezone?: string;
  locale?: string;
  settings?: Record<string, unknown>;
};

export type UpdateProfileInput = {
  displayName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type ListMembershipsFilter = {
  instituteId: string;
  status?: MembershipStatus;
  userId?: string;
};

export type CreateMembershipInput = {
  instituteId: string;
  userId: string;
  status?: MembershipStatus;
  roles: string[];
};

export type UpdateMembershipInput = {
  status?: MembershipStatus;
  roles?: string[];
};
