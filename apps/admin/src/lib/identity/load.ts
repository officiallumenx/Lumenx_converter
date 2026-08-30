/**
 * Dual-mode identity loaders — memberships and roles catalog.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listMemberships, listRoles } from "./api";
import { membershipDtosToListItems } from "./map";
import type { MembershipListItem, RoleCatalogItem } from "./types";

export type IdentityListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type MembershipsListState = {
  status: IdentityListStatus;
  items: MembershipListItem[];
  errorMessage: string | null;
};

export type RolesCatalogState = {
  status: Exclude<IdentityListStatus, "needs_institute">;
  items: RoleCatalogItem[];
  errorMessage: string | null;
};

export async function loadMembershipsList(
  activeInstituteId: string | null,
  opts?: { status?: import("./types").MembershipStatus },
): Promise<MembershipsListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }
  try {
    const dtos = await listMemberships({
      instituteId: activeInstituteId,
      status: opts?.status,
    });
    const items = membershipDtosToListItems(dtos);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load memberships";
    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}

export async function loadRolesCatalog(): Promise<RolesCatalogState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }
  try {
    const items = await listRoles();
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load roles";
    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}
