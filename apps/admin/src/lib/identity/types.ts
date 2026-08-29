/** Mirrors backend identity DTOs — keep in sync with domains/identity/types.ts. */

export type MembershipStatus = "active" | "invited" | "suspended" | "ended";

export type MembershipDto = {
  id: string;
  userId: string;
  instituteId: string;
  status: MembershipStatus;
  roles: string[];
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
  status: MembershipStatus;
  roles: string[];
  rolesLabel: string;
  createdAt: string;
  updatedAt: string;
};
