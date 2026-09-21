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

async function childFromLink(
  instituteId: string,
  link: GuardianLinkDto,
  index: number,
): Promise<Child | null> {
  try {
    const dto = await getStudent(link.studentId);
    const [cardsResult, attendanceResult, photoUrl] = await Promise.all([
      loadStudentReportCards({
        instituteId,
        studentId: link.studentId,
      }),
      loadLearnerAttendancePortal({
        instituteId,
        studentId: link.studentId,
      }),
      resolveChildPhotoUrl(dto.id),
    ]);
    const cardMetrics = reportCardsToChildMetrics(cardsResult.reportCards);
    const attendancePct = attendanceResult.portal?.summary.attendancePct ?? 0;
    return studentDtoToChild(dto, index, {
      attendancePct,
      avgScore: cardMetrics.avgScore,
      trend: cardMetrics.trend,
      photoUrl,
    });
  } catch {
    return null;
  }
}

export async function loadLinkedChildrenFromApi(input: {
  instituteId: string | null;
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
          childFromLink(input.instituteId!, link, index),
        ),
      )
    ).filter((row): row is Child => row != null);

    return {
      status: rows.length === 0 ? "empty" : "ready",
      children: rows,
      errorMessage:
        rows.length === 0 && links.length > 0
          ? "Linked students could not be loaded"
          : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load linked children";
    return { status: "error", children: [], errorMessage: message };
  }
}
