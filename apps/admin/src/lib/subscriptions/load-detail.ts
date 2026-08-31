import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getSubscriptionDetail, getSubscriptionHistory } from "./api";
import type {
  InstituteSubscriptionDetailDto,
  InstituteSubscriptionHistoryDto,
} from "./types";

export type SubscriptionDetailLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";

export type SubscriptionDetailState = {
  status: SubscriptionDetailLoadStatus;
  detail: InstituteSubscriptionDetailDto | null;
  history: InstituteSubscriptionHistoryDto | null;
  errorMessage: string | null;
};

export async function loadSubscriptionDetail(
  activeInstituteId: string | null,
): Promise<SubscriptionDetailState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      detail: null,
      history: null,
      errorMessage: null,
    };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      detail: null,
      history: null,
      errorMessage: null,
    };
  }
  try {
    const [detail, history] = await Promise.all([
      getSubscriptionDetail(activeInstituteId),
      getSubscriptionHistory(activeInstituteId),
    ]);
    return {
      status: "ready",
      detail,
      history,
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
      err instanceof Error ? err.message : "Failed to load subscription";
    if (status === 403) {
      return {
        status: "forbidden",
        detail: null,
        history: null,
        errorMessage: message,
      };
    }
    return {
      status: "error",
      detail: null,
      history: null,
      errorMessage: message,
    };
  }
}
