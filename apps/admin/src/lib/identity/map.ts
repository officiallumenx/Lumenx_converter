import type { MembershipDto, MembershipListItem } from "./types";

export function membershipDtoToListItem(dto: MembershipDto): MembershipListItem {
  return {
    id: dto.id,
    userId: dto.userId,
    status: dto.status,
    roles: dto.roles,
    rolesLabel: dto.roles.map((r) => r.replace(/_/g, " ")).join(", "),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function membershipDtosToListItems(dtos: MembershipDto[]): MembershipListItem[] {
  return dtos.map(membershipDtoToListItem);
}
