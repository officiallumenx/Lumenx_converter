import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type { DemoInstituteProfile } from "@lumenx/types";
import { getInstitute, getInstituteSettings } from "./api";
import { settingsToDemoProfile } from "./map";
import type { InstituteProfileLoadStatus, InstituteSettingsDto } from "./types";

export type InstituteProfileLoadState = {
  status: InstituteProfileLoadStatus;
  instituteName: string | null;
  settings: InstituteSettingsDto | null;
  profile: DemoInstituteProfile | null;
  errorMessage: string | null;
};

function mapError(err: unknown, label: string): { status: InstituteProfileLoadStatus; message: string } {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : `Failed to load ${label}`;
  if (status === 403) return { status: "forbidden", message };
  if (status === 404) return { status: "error", message: "Institute not found." };
  return { status: "error", message };
}

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
    const profile = settingsToDemoProfile(institute, settings);
    return {
      status: "ready",
      instituteName: institute.name,
      settings,
      profile,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "institute profile");
    return {
      status: mapped.status,
      instituteName: null,
      settings: null,
      profile: null,
      errorMessage: mapped.message,
    };
  }
}

export async function loadInstitutePublicProfile(input: {
  instituteId: string | null;
}): Promise<{
  status: InstituteProfileLoadStatus;
  profile: DemoInstituteProfile | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", profile: null, errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", profile: null, errorMessage: null };
  }
  try {
    const { getInstitutePublicProfile } = await import("./api");
    const row = await getInstitutePublicProfile(input.instituteId);
    const { normalizeInstituteProfile } = await import("@lumenx/utils");
    return {
      status: "ready",
      profile: normalizeInstituteProfile(row.profile as DemoInstituteProfile),
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "public institute profile");
    return { status: mapped.status, profile: null, errorMessage: mapped.message };
  }
}
