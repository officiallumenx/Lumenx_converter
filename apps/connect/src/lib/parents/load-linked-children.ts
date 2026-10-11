import { isApiAuthMode } from "@/auth/auth-mode";
import type { Child } from "@lumenx/types";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { isInstituteUuid } from "@/lib/institute-id";
import { loadLearnerAttendancePortal } from "@/lib/attendance/load";
import { loadStudentReportCards } from "@/lib/marks";
import { getPhotoSignedUrl } from "@/lib/photos/api";
import { getStudent } from "@/lib/students/api";
import { getParent } from "./api";
import { reportCardsToChildMetrics, studentDtoToChild } from "./map";
import type { GuardianLinkDto } from "./types";

export type LinkedChildrenLoadStatus =
  | "demo"
  | "ready"
  | "empty"
  | "needs_institute"
  | "error";

function activeLinks(links: GuardianLinkDto[] | undefined): GuardianLinkDto[] {
  if (!Array.isArray(links)) return [];
  return links.filter((link) => link.status === "active" || !link.status);
}

async function resolveChildPhotoUrl(studentId: string): Promise<string | null> {
  try {
    const signed = await getPhotoSignedUrl("student", studentId);
    return signed.photoSignedUrl;
  } catch {
    return null;
  }
}

/**
 * Fast path: student identity + photo only.
 * Marks/attendance enrich Home metrics but must not block ChildSwitcher / warm reopen.
 */
async function childFromLinkFast(
  link: GuardianLinkDto,
  index: number,
  prior?: Child | null,
): Promise<Child | null> {
  try {
    const dto = await getStudent(link.studentId);
    const photoUrl = await resolveChildPhotoUrl(dto.id);
    return studentDtoToChild(dto, index, {
      attendancePct: prior?.attendance ?? 0,
      avgScore: prior?.avgScore ?? 0,
      trend: prior?.trend ?? "flat",
      photoUrl: photoUrl ?? prior?.photoUrl ?? null,
    });
  } catch {
    return null;
  }
}

async function enrichChildMetrics(
  instituteId: string,
  child: Child,
): Promise<Child> {
  try {
    const [cardsResult, attendanceResult] = await Promise.all([
      loadStudentReportCards({
        instituteId,
        studentId: child.id,
      }),
      loadLearnerAttendancePortal({
        instituteId,
        studentId: child.id,
      }),
    ]);
    const cardMetrics = reportCardsToChildMetrics(cardsResult.reportCards);
    const attendancePct = attendanceResult.portal?.summary.attendancePct ?? 0;
    return {
      ...child,
      attendance: Math.round(attendancePct),
      avgScore: Math.round(cardMetrics.avgScore),
      trend: cardMetrics.trend,
    };
  } catch {
    return child;
  }
}

export async function loadLinkedChildrenFromApi(input: {
  instituteId: string | null;
  /** Prior warm-cache rows — preserve metrics until enrichment finishes. */
  priorChildren?: Child[];
  /**
   * When true (default), return after student+photo then optionally caller can
   * call enrichLinkedChildrenMetrics. When false, wait for full enrichment.
   */
  fastIdentityOnly?: boolean;
}): Promise<{
  status: LinkedChildrenLoadStatus;
  children: Child[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", children: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", children: [], errorMessage: null };
  }

  const priorById = new Map(
    (input.priorChildren ?? []).map((c) => [c.id, c] as const),
  );
  const fastOnly = input.fastIdentityOnly !== false;

  try {
    const me = await getConnectApiClient().get<MeResponse>("/api/v1/me");
    const parentIdentity =
      me.identities.parents.find((p) => p.instituteId === input.instituteId) ??
      me.identities.parents[0] ??
      null;
    if (!parentIdentity?.parentId) {
      return { status: "empty", children: [], errorMessage: null };
    }

    const parent = await getParent(parentIdentity.parentId);
    const links = activeLinks(parent.links);
    if (links.length === 0) {
      return { status: "empty", children: [], errorMessage: null };
    }

    const rows = (
      await Promise.all(
        links.map((link, index) =>
          childFromLinkFast(link, index, priorById.get(link.studentId) ?? null),
        ),
      )
    ).filter((row): row is Child => row != null);

    if (rows.length === 0) {
      return {
        status: "empty",
        children: [],
        errorMessage:
          links.length > 0 ? "Linked students could not be loaded" : null,
      };
    }

    if (fastOnly) {
      return { status: "ready", children: rows, errorMessage: null };
    }

    const enriched = await Promise.all(
      rows.map((row) => enrichChildMetrics(input.instituteId!, row)),
    );
    return { status: "ready", children: enriched, errorMessage: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load linked children";
    return { status: "error", children: [], errorMessage: message };
  }
}

/** Background enrichment of attendance/avg after fast identity load. */
export async function enrichLinkedChildrenMetrics(
  instituteId: string,
  children: Child[],
): Promise<Child[]> {
  if (!isInstituteUuid(instituteId) || children.length === 0) return children;
  return Promise.all(children.map((c) => enrichChildMetrics(instituteId, c)));
}
