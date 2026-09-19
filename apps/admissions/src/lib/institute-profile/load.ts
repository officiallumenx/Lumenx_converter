import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type { DemoInstituteProfile } from "@lumenx/types";
import { normalizeInstituteProfile } from "@lumenx/utils";
import {
  getInstitute,
  getInstitutePublicProfile,
  getInstituteSettings,
} from "./api";
import { settingsToDemoProfile } from "./map";
import type { InstituteProfileLoadStatus, InstituteSettingsDto } from "./types";

export type InstituteProfileLoadState = {
  status: InstituteProfileLoadStatus;
  instituteName: string | null;
  settings: InstituteSettingsDto | null;
  profile: DemoInstituteProfile | null;
  errorMessage: string | null;
};

export async function loadInstituteProfileForAdmin(input: {
  instituteId: string | null;
}): Promise<InstituteProfileLoadState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      instituteName: null,
      settings: null,
      profile: null,
      errorMessage: null,
    };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return {
      status: "needs_institute",
      instituteName: null,
      settings: null,
      profile: null,
      errorMessage: null,
    };
  }
  try {
    const [institute, settings] = await Promise.all([
      getInstitute(input.instituteId),
      getInstituteSettings(input.instituteId),
    ]);
    return {
      status: "ready",
      instituteName: institute.name,
      settings,
      profile: settingsToDemoProfile(institute, settings),
      errorMessage: null,
    };
  } catch (error) {
    const status =
      error instanceof ApiClientError && error.status === 403
        ? "forbidden"
        : "error";
    return {
      status,
      instituteName: null,
      settings: null,
      profile: null,
      errorMessage:
        error instanceof Error ? error.message : "Failed to load institute profile",
    };
  }
}

export async function loadInstitutePublicProfile(
  instituteId: string,
): Promise<DemoInstituteProfile | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) return null;
  try {
    const row = await getInstitutePublicProfile(instituteId);
    return normalizeInstituteProfile(row.profile);
  } catch {
    return null;
  }
}
