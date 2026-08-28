import type {
  GuardianLinkDto,
  GuardianRelationship,
  ParentDto,
  ParentListItem,
  ParentRelationshipLabel,
} from "./types";

export function relationshipToLabel(
  relationship: GuardianRelationship,
): ParentRelationshipLabel {
  if (relationship === "mother") return "Mother";
  if (relationship === "father") return "Father";
  return "Guardian";
}

export function activeLinks(links: GuardianLinkDto[] | undefined): GuardianLinkDto[] {
  if (!Array.isArray(links)) return [];
  return links.filter((link) => link.status === "active");
}

export function primaryRelationshipLabel(
  links: GuardianLinkDto[] | undefined,
): ParentRelationshipLabel {
  const active = activeLinks(links);
  const primary = active.find((link) => link.isPrimary);
  if (primary) return relationshipToLabel(primary.relationship);
  if (active[0]) return relationshipToLabel(active[0].relationship);
  return "Guardian";
}

export function linkedChildrenLabel(count: number): string {
  if (count <= 0) return "No linked children";
  if (count === 1) return "1 linked child";
  return `${count} linked children`;
}

export function parentIdentityLabel(dto: ParentDto): string {
  const legacyCode = dto.legacyCode?.trim();
  if (legacyCode) return legacyCode;
  return dto.id.slice(0, 8);
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function parentDtoToListItem(dto: ParentDto): ParentListItem {
  const active = activeLinks(dto.links);
  const linkedStudentIds = active.map((link) => link.studentId);
  const count = linkedStudentIds.length;

  return {
    id: dto.id,
    name: dto.name?.trim() || "Guardian",
    email: dto.email?.trim() || "",
    phone: dto.phone?.trim() || "",
    address: dto.address?.trim() || "",
    relationship: primaryRelationshipLabel(dto.links),
    inviteStatus: dto.inviteStatus ?? "pending",
    accessStatus: dto.accessStatus ?? "active",
    linkedStudentIds,
    linkedChildrenCount: count,
    linkedChildrenLabel: linkedChildrenLabel(count),
    password: "",
    identityLabel: parentIdentityLabel(dto),
  };
}

export function parentDtosToListItems(dtos: ParentDto[]): ParentListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Parents API response must be an array");
  }
  return dtos.map(parentDtoToListItem);
}
