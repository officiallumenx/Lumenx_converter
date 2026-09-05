import { ApiClientError } from "@/lib/api";
import { isNexusApiMode } from "@/lib/auth-mode";
import { listPlatformInstitutes, type PlatformInstitute } from "@/lib/institute-directory-store";
import { listLicenses } from "@/lib/licenses/api";
import { listSubscriptions } from "@/lib/subscriptions/api";
import { listInstitutes } from "./api";
import { mapInstituteDtoToPlatform } from "./map";

export type InstitutesDirectoryState =
  | { status: "loading" }
  | {
      status: "ready";
      source: "api" | "demo";
      institutes: PlatformInstitute[];
    }
  | {
      status: "error";
      message: string;
      unauthorized: boolean;
      forbidden: boolean;
    };

/** Load platform institute directory — API mode never touches demo localStorage. */
export async function loadInstitutesDirectory(): Promise<InstitutesDirectoryState> {
  if (isNexusApiMode()) {
    try {
      const [rows, licenses, subscriptions] = await Promise.all([
        listInstitutes(),
        listLicenses().catch(() => []),
        listSubscriptions().catch(() => []),
      ]);
      const licenseByInst = new Map(licenses.map((l) => [l.instituteId, l]));
      const subByInst = new Map(subscriptions.map((s) => [s.instituteId, s]));
      return {
        status: "ready",
        source: "api",
        institutes: rows.map((row) =>
          mapInstituteDtoToPlatform(
            row,
            licenseByInst.get(row.id),
            subByInst.get(row.id),
          ),
        ),
      };
    } catch (err) {
      if (err instanceof ApiClientError) {
        return {
          status: "error",
          message: err.message,
          unauthorized: err.status === 401 || err.code === "UNAUTHENTICATED",
          forbidden: err.status === 403 || err.code === "FORBIDDEN",
        };
      }
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load institutes.",
        unauthorized: false,
        forbidden: false,
      };
    }
  }

  return {
    status: "ready",
    source: "demo",
    institutes: listPlatformInstitutes(),
  };
}
