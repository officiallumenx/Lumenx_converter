import type { MembershipDto, MembershipListItem } from "./types";

/** Provisioned Connect / portal placeholders — never show in Admin UI. */
export function isInternalSystemEmail(email: string | null | undefined): boolean {
  const value = email?.trim().toLowerCase() ?? "";
  if (!value) return false;
  return (
    value.endsWith(".invalid") ||
    value.includes(".lumenx.invalid") ||
    value.endsWith("@portal.lumenx.local") ||
    value.includes("@portal.lumenx.local")
  );
}

/** Real contact email for display, or null when internal/synthetic. */
export function displayableContactEmail(
  email: string | null | undefined,
): string | null {
  const value = email?.trim() || null;
  if (!value || isInternalSystemEmail(value)) return null;
  return value;
}

/**
 * Public login identity lines for Admin UI — phone and real email only.
 * Never includes username or synthetic @*.invalid / portal addresses.
 */
export function publicLoginIdentityLines(input: {
  email?: string | null;
  phone?: string | null;
}): string[] {
  const lines: string[] = [];
  const email = displayableContactEmail(input.email);
  if (email) lines.push(email);
  const phone = input.phone?.trim();
  if (phone) lines.push(phone);
  return lines;
}

export function membershipIdentityLabel(dto: {
  displayName?: string | null;
  email?: string | null;
  userId: string;
}): string {
  const name = dto.displayName?.trim();
  if (name) return name;
  const email = dto.email?.trim();
  if (email && !isInternalSystemEmail(email)) return email;
  return "Member";
}

export function membershipDtoToListItem(dto: MembershipDto): MembershipListItem {
  const email = dto.email?.trim() || null;
  return {
    id: dto.id,
    userId: dto.userId,
    displayName: dto.displayName ?? null,
    email: email && !isInternalSystemEmail(email) ? email : null,
    identityLabel: membershipIdentityLabel(dto),
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

/** Toggle a role code in a multi-select set (catalog codes only). */
export function toggleRoleCode(selected: string[], code: string): string[] {
  const trimmed = code.trim();
  if (!trimmed) return selected;
  if (selected.includes(trimmed)) {
    return selected.filter((c) => c !== trimmed);
  }
  return [...selected, trimmed];
}
