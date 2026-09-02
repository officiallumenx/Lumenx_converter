import {
  ensureDemoPendingRegistration,
  listInstituteRegistrations,
  type InstituteRegistrationApplication,
  type InstituteRegistrationStatus,
} from "@lumenx/utils";
import { ApiClientError } from "@/lib/api";
import { isNexusApiMode } from "@/lib/auth-mode";
import { listRegistrations } from "./api";
import { mapRegistrationDtoToApplication } from "./map";

export type StatusFilter = "all" | InstituteRegistrationStatus;

export type RegistrationsQueueState =
  | { status: "loading" }
  | {
      status: "ready";
      source: "api" | "demo";
      applications: InstituteRegistrationApplication[];
    }
  | {
      status: "error";
      message: string;
      unauthorized: boolean;
      forbidden: boolean;
    };

/** Load registration queue — API mode never touches demo/localStorage. */
export async function loadRegistrationsQueue(): Promise<RegistrationsQueueState> {
  if (isNexusApiMode()) {
    try {
      const rows = await listRegistrations("all");
      return {
        status: "ready",
        source: "api",
        applications: rows.map(mapRegistrationDtoToApplication),
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
        message:
          err instanceof Error ? err.message : "Unable to load registrations.",
        unauthorized: false,
        forbidden: false,
      };
    }
  }

  ensureDemoPendingRegistration();
  return {
    status: "ready",
    source: "demo",
    applications: listInstituteRegistrations(),
  };
}

export function countApplications(
  applications: InstituteRegistrationApplication[],
): {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
} {
  return {
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    total: applications.length,
  };
}
