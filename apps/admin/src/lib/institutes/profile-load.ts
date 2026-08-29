/**
 * Dual-mode institute profile loaders.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getInstitute, getInstituteSettings } from "./api";
import type { InstituteDto, InstituteSettingsDto } from "./types";

export type InstituteProfileStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";

export type InstituteProfileState = {
  status: InstituteProfileStatus;
  institute: InstituteDto | null;
  settings: InstituteSettingsDto | null;
  errorMessage: string | null;
};

export async function loadInstituteProfile(
  activeInstituteId: string | null,
): Promise<InstituteProfileState> {
  if (!isApiAuthMode()) {
    return { status: "demo", institute: null, settings: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      institute: null,
      settings: null,
      errorMessage: null,
    };
  }
  try {
    const [institute, settings] = await Promise.all([
      getInstitute(activeInstituteId),
      getInstituteSettings(activeInstituteId),
    ]);
    return {
      status: "ready",
      institute,
      settings,
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
    const message = err instanceof Error ? err.message : "Failed to load institute";
    if (status === 403) {
      return { status: "forbidden", institute: null, settings: null, errorMessage: message };
    }
    return { status: "error", institute: null, settings: null, errorMessage: message };
  }
}
