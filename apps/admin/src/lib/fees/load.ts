import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClasses } from "@/lib/classes/api";
import { listStudents } from "@/lib/students/api";
import type { FeesSnapshot } from "@lumenx/module-fees";
import {
  listFeeComponents,
  listFeeConcessions,
  listFeePayments,
  listFeePlans,
} from "./api";
import { feeBundleToFeesSnapshot, pickActiveFeePlan } from "./map";
import type { ClassLabelDto } from "./types";

export type FeesLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type FeesLoadState = {
  status: FeesLoadStatus;
  snapshot: FeesSnapshot | null;
  planId: string | null;
  classIdByLabel: Record<string, string>;
  errorMessage: string | null;
};

function classLabelFromDto(cls: { id: string; name: string; code: string }): ClassLabelDto {
  const label = cls.name?.trim() || cls.code?.trim() || cls.id;
  return { id: cls.id, label };
}

export async function loadFeesSnapshot(
  activeInstituteId: string | null,
): Promise<FeesLoadState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      snapshot: null,
      planId: null,
      classIdByLabel: {},
      errorMessage: null,
    };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      snapshot: null,
      planId: null,
      classIdByLabel: {},
      errorMessage: null,
    };
  }

  try {
    const [plans, classes, students] = await Promise.all([
      listFeePlans({ instituteId: activeInstituteId }),
      listClasses({ instituteId: activeInstituteId }),
      listStudents({ instituteId: activeInstituteId }),
    ]);
    const plan = pickActiveFeePlan(plans);
    if (!plan) {
      return {
        status: "empty",
        snapshot: null,
        planId: null,
        classIdByLabel: {},
        errorMessage: null,
      };
    }

    const classIdByLabel: Record<string, string> = {};
    for (const cls of classes) {
      const label = cls.name?.trim() || cls.code?.trim() || cls.id;
      classIdByLabel[label] = cls.id;
    }

    const [components, concessions, payments] = await Promise.all([
      listFeeComponents({ planId: plan.id }),
      listFeeConcessions({ planId: plan.id }),
      listFeePayments({ planId: plan.id }),
    ]);

    const classLabels = classes.map(classLabelFromDto);
    const studentLookup = new Map(
      students.map((s) => [
        s.id,
        {
          name: s.displayName?.trim() || `${s.firstName} ${s.surname}`.trim() || "Student",
          classKey: s.classLabel?.trim() || "—",
        },
      ]),
    );
    const snapshot = feeBundleToFeesSnapshot({
      plan,
      components,
      concessions,
      payments,
      classLabels,
      studentLookup,
    });

    return {
      status: "ready",
      snapshot,
      planId: plan.id,
      classIdByLabel,
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
    const message = err instanceof Error ? err.message : "Failed to load fees";

    if (status === 403) {
      return {
        status: "forbidden",
        snapshot: null,
        planId: null,
        classIdByLabel: {},
        errorMessage: message,
      };
    }
    return {
      status: "error",
      snapshot: null,
      planId: null,
      classIdByLabel: {},
      errorMessage: message,
    };
  }
}
