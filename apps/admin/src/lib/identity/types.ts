/** Mirrors backend identity DTOs — keep in sync with domains/identity/types.ts. */

export type MembershipStatus = "active" | "invited" | "suspended" | "ended";

export type ProfileStatus = "active" | "disabled";

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
  displayName: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleCatalogItem = {
  code: string;
  label: string;
  description: string | null;
};

export type ListMembershipsParams = {
  instituteId: string;
  status?: MembershipStatus;
  userId?: string;
};

export type MembershipListItem = {
  id: string;
  userId: string;
  displayName: string | null;
  email: string | null;
  /** Prefer display name, then email, then user id. */
  identityLabel: string;
  status: MembershipStatus;
  roles: string[];
  rolesLabel: string;
  createdAt: string;
  updatedAt: string;
};
