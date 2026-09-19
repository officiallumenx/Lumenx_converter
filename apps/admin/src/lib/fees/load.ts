import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClasses } from "@/lib/classes/api";
import { normalizeSchoolClassName } from "@/lib/classes/name-format";
import { listStudents } from "@/lib/students/api";
import type { FeesSnapshot } from "@lumenx/module-fees";
import {
  listFeeComponents,
  listFeeConcessions,
  listFeePayments,
  listFeePlans,
} from "./api";
import { firstClassIdByLabel, type ClassIdsByLabel } from "./class-ids";
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
  /** First UUID per label (compat for single-id lookups). */
  classIdByLabel: Record<string, string>;
  /** Every class UUID that shares a normalized label (Grade 8 / Class 8). */
  classIdsByLabel: ClassIdsByLabel;
  errorMessage: string | null;
};

function emptyClassMaps(): Pick<FeesLoadState, "classIdByLabel" | "classIdsByLabel"> {
  return { classIdByLabel: {}, classIdsByLabel: {} };
}

function classLabelFromDto(cls: { id: string; name: string; code: string }): ClassLabelDto {
  const raw = cls.name?.trim() || cls.code?.trim() || cls.id;
  const label = normalizeSchoolClassName(raw) || raw;
  return { id: cls.id, label };
}

export async function loadFeesSnapshot(
  activeInstituteId: string | null,
  academicYearId?: string | null,
): Promise<FeesLoadState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      snapshot: null,
      planId: null,
      ...emptyClassMaps(),
      errorMessage: null,
    };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      snapshot: null,
      planId: null,
      ...emptyClassMaps(),
      errorMessage: null,
    };
  }

  try {
    const yearId = academicYearId?.trim() || null;
    const [plans, yearClasses, students] = await Promise.all([
      listFeePlans({ instituteId: activeInstituteId }),
      listClasses({
        instituteId: activeInstituteId,
        ...(yearId ? { academicYearId: yearId } : {}),
      }),
      listStudents({ instituteId: activeInstituteId }),
    ]);

    // Prefer active-year classes; if the year filter returns none, fall back to all.
    let classes = yearClasses;
    if (yearId && classes.length === 0) {
      classes = await listClasses({ instituteId: activeInstituteId });
    }

    const plan = pickActiveFeePlan(plans, academicYearId);
    if (!plan) {
      return {
        status: "empty",
        snapshot: null,
        planId: null,
        ...emptyClassMaps(),
        errorMessage: null,
      };
    }

    const classIdsByLabel: ClassIdsByLabel = {};
    for (const cls of classes) {
      const { label } = classLabelFromDto(cls);
      const bucket = classIdsByLabel[label] ?? [];
      if (!bucket.includes(cls.id)) bucket.push(cls.id);
      classIdsByLabel[label] = bucket;
    }
    const classIdByLabel = firstClassIdByLabel(classIdsByLabel);

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
          classKey:
            normalizeSchoolClassName(s.classLabel ?? "") ||
            s.classLabel?.trim() ||
            "—",
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
      classIdsByLabel,
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
        ...emptyClassMaps(),
        errorMessage: message,
      };
    }
    return {
      status: "error",
      snapshot: null,
      planId: null,
      ...emptyClassMaps(),
      errorMessage: message,
    };
  }
}
