import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listIssuedCertificates } from "./api";
import { issuedCertificateDtosToHistoryItems } from "./map";
import type { IssuedCertificateHistoryItem } from "./types";

export type CertificatesListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type IssuedCertificatesListState = {
  status: CertificatesListStatus;
  items: IssuedCertificateHistoryItem[];
  errorMessage: string | null;
};

export async function loadIssuedCertificatesList(
  activeInstituteId: string | null,
): Promise<IssuedCertificatesListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const rows = await listIssuedCertificates({ instituteId: activeInstituteId });
    const items = issuedCertificateDtosToHistoryItems(rows);
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
    const message =
      err instanceof Error ? err.message : "Failed to load issued certificates";

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}
