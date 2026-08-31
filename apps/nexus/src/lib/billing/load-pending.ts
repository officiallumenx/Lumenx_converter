import { isNexusApiMode } from "@/lib/auth-mode";
import { ApiClientError } from "@/lib/api";
import { listPendingOfflinePayments } from "./api";
import type { OfflinePaymentSubmissionDto } from "./api-types";

export type PendingPaymentsLoadState = {
  status: "demo" | "loading" | "ready" | "error";
  pending: OfflinePaymentSubmissionDto[];
  errorMessage: string | null;
};

export async function loadPendingOfflinePayments(): Promise<PendingPaymentsLoadState> {
  if (!isNexusApiMode()) {
    return { status: "demo", pending: [], errorMessage: null };
  }
  try {
    const pending = await listPendingOfflinePayments();
    return { status: "ready", pending, errorMessage: null };
  } catch (err) {
    return {
      status: "error",
      pending: [],
      errorMessage:
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load pending payments",
    };
  }
}
