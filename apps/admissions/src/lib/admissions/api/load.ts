import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  AdmissionApplication,
  AdmissionInquiry,
  AdmissionOpening,
  AdmissionProgram,
} from "../types";
import {
  getAdmissionApplication,
  getAdmissionProgram,
  listAdmissionApplications,
  listAdmissionInquiries,
  listAdmissionOpenings,
  listAdmissionPrograms,
} from "./api";
import {
  admissionApplicationDtosToPortal,
  admissionApplicationDtoToPortal,
  admissionInquiryDtosToPortal,
  admissionOpeningDtosToPortal,
  admissionProgramDtoToPortal,
  admissionProgramDtosToPortal,
} from "./map-portal";
import type {
  AdmissionApplicationDto,
  AdmissionInquiryDto,
  AdmissionOpeningDto,
  AdmissionProgramDto,
} from "./types";

export type AdmissionsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AdmissionsApplicationsLoadState = {
  status: AdmissionsLoadStatus;
  items: AdmissionApplication[];
  errorMessage: string | null;
};

export type AdmissionsProgramsLoadState = {
  status: AdmissionsLoadStatus;
  items: AdmissionProgram[];
  errorMessage: string | null;
};

export type AdmissionsOpeningsLoadState = {
  status: AdmissionsLoadStatus;
  items: AdmissionOpening[];
  errorMessage: string | null;
};

export type AdmissionsInquiriesLoadState = {
  status: AdmissionsLoadStatus;
  items: AdmissionInquiry[];
  errorMessage: string | null;
};

async function loadAdmissionsResource<T>(
  instituteId: string | null,
  fetchRows: (instituteId: string) => Promise<unknown[]>,
  mapRows: (rows: unknown[]) => T[],
  errorLabel: string,
): Promise<{ status: AdmissionsLoadStatus; items: T[]; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!instituteId || !isInstituteUuid(instituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const rows = await fetchRows(instituteId);
    const items = mapRows(rows);
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
    const message = err instanceof Error ? err.message : errorLabel;

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

export async function loadAdmissionsApplications(
  instituteId: string | null,
  context: {
    applicantId?: string;
    instituteAdmin?: boolean;
  } = {},
): Promise<AdmissionsApplicationsLoadState> {
  const [programsResult, openingsResult] = await Promise.all([
    loadAdmissionsPrograms(instituteId),
    loadAdmissionsOpenings(instituteId),
  ]);

  const programTitleById = new Map(programsResult.items.map((p) => [p.id, p.name]));
  const openingTitleById = new Map(openingsResult.items.map((o) => [o.id, o.name]));

  const base = await loadAdmissionsResource(
    instituteId,
    (id) => listAdmissionApplications({ instituteId: id }),
    (rows) =>
      admissionApplicationDtosToPortal(rows as AdmissionApplicationDto[], {
        applicantId: context.applicantId,
        programTitleById,
        openingTitleById,
      }),
    "Failed to load admissions applications",
  );

  if (!context.applicantId || context.instituteAdmin) {
    return base;
  }

  const items = base.items.filter((app) => app.applicantId === context.applicantId);
  return {
    ...base,
    items,
    status: items.length === 0 && base.status === "ready" ? "empty" : base.status,
  };
}

export async function loadAdmissionsApplicationById(
  applicationId: string,
  context: { applicantId?: string; programName?: string } = {},
): Promise<{
  status: AdmissionsLoadStatus;
  application: AdmissionApplication | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", application: null, errorMessage: null };
  }

  try {
    const dto = await getAdmissionApplication(applicationId);
    return {
      status: "ready",
      application: admissionApplicationDtoToPortal(dto, {
        applicantId: context.applicantId,
        programName: context.programName,
      }),
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load application";
    return { status: "error", application: null, errorMessage: message };
  }
}

export async function loadAdmissionsPrograms(
  instituteId: string | null,
): Promise<AdmissionsProgramsLoadState> {
  return loadAdmissionsResource(
    instituteId,
    (id) => listAdmissionPrograms({ instituteId: id }),
    (rows) => admissionProgramDtosToPortal(rows as AdmissionProgramDto[]),
    "Failed to load admission programs",
  );
}

export async function loadAdmissionsProgramById(
  programId: string,
): Promise<{
  status: AdmissionsLoadStatus;
  program: AdmissionProgram | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", program: null, errorMessage: null };
  }

  if (!isInstituteUuid(programId)) {
    return {
      status: "error",
      program: null,
      errorMessage: "Invalid program id",
    };
  }

  try {
    const dto = await getAdmissionProgram(programId);
    return {
      status: "ready",
      program: admissionProgramDtoToPortal(dto),
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load program";
    return { status: "error", program: null, errorMessage: message };
  }
}

export async function loadAdmissionsBrowsePrograms(
  instituteIds: string[],
): Promise<{
  status: AdmissionsLoadStatus;
  grouped: { instituteId: string; programs: AdmissionProgram[] }[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", grouped: [], errorMessage: null };
  }

  const validIds = instituteIds.filter(isInstituteUuid);
  if (validIds.length === 0) {
    return { status: "empty", grouped: [], errorMessage: null };
  }

  try {
    const results = await Promise.all(
      validIds.map(async (instituteId) => {
        const rows = await listAdmissionPrograms({ instituteId });
        const programs = admissionProgramDtosToPortal(rows).filter(
          (p) => p.id && p.name,
        );
        return { instituteId, programs };
      }),
    );
    const grouped = results.filter((g) => g.programs.length > 0);
    return {
      status: grouped.length === 0 ? "empty" : "ready",
      grouped,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load programs";
    return { status: "error", grouped: [], errorMessage: message };
  }
}

export async function loadAdmissionsOpenings(
  instituteId: string | null,
): Promise<AdmissionsOpeningsLoadState> {
  return loadAdmissionsResource(
    instituteId,
    (id) => listAdmissionOpenings({ instituteId: id }),
    (rows) => admissionOpeningDtosToPortal(rows as AdmissionOpeningDto[]),
    "Failed to load admission openings",
  );
}

export async function loadAdmissionsInquiries(
  instituteId: string | null,
  applicantId: string,
): Promise<AdmissionsInquiriesLoadState> {
  const base = await loadAdmissionsResource(
    instituteId,
    (id) => listAdmissionInquiries({ instituteId: id }),
    (rows) => admissionInquiryDtosToPortal(rows as AdmissionInquiryDto[], applicantId),
    "Failed to load admission inquiries",
  );

  const items = base.items.filter((inq) => inq.applicantId === applicantId);
  return {
    ...base,
    items,
    status: items.length === 0 && base.status === "ready" ? "empty" : base.status,
  };
}
