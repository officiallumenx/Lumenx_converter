import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getCurrentSubscription } from "./api";
import type { InstituteSubscriptionCurrentDto } from "./types";

export type SubscriptionLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";

export type SubscriptionCurrentState = {
  status: SubscriptionLoadStatus;
  subscription: InstituteSubscriptionCurrentDto | null;
  errorMessage: string | null;
};

export async function loadCurrentSubscription(
  activeInstituteId: string | null,
): Promise<SubscriptionCurrentState> {
  if (!isApiAuthMode()) {
    return { status: "demo", subscription: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", subscription: null, errorMessage: null };
  }
  try {
    const subscription = await getCurrentSubscription(activeInstituteId);
    return { status: "ready", subscription, errorMessage: null };
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
      return { status: "forbidden", subscription: null, errorMessage: message };
    }
    return { status: "error", subscription: null, errorMessage: message };
  }
}
