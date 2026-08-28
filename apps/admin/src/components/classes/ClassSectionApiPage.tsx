import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadSectionDetail,
  resolveSectionDetailView,
  shouldCommitClassesLoad,
  type ClassesListStatus,
  type SectionDetailItem,
} from "@/lib/classes";

function detailHint(status: ClassesListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading class section…";
  if (status === "needs_institute") return "Select an institute to load this class section.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this section.";
  }
  if (status === "error") return errorMessage ?? "Failed to load class section.";
  if (status === "empty") return errorMessage ?? "Section not found.";
  return null;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium leading-relaxed">{value?.trim() || "—"}</div>
    </div>
  );
}

export function ClassSectionApiPage({ sectionId }: { sectionId: string }) {
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [section, setSection] = useState<SectionDetailItem | null>(null);
  const [status, setStatus] = useState<ClassesListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);

  const detailView = resolveSectionDetailView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSection: section,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSection(null);
      setStatus("loading");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSection(null);
      setStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setErrorMessage(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setSection(null);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setSection(null);
    setStatus("loading");
    setErrorMessage(null);
    void loadSectionDetail(sectionId).then((next) => {
      if (
        !shouldCommitClassesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSection(next.section);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage, sectionId]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displaySection = detailView.detailValid ? detailView.section : null;

  return (
    <AppShell
      title={displaySection?.name ?? "Class section"}
      subtitle="API mode · read-only · section catalog record"
      actions={
        <Link to="/classes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" /> Back to classes
          </Button>
        </Link>
      }
    >
      <PageStack>
        <Pill tone="neutral">Read-only · API mode</Pill>
        {detailView.status !== "ready" || !displaySection ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <Card>
            <CardHeader
              title={displaySection.name}
              hint={`Class ${displaySection.classCode} · Section ${displaySection.section}`}
              action={
                <div className="flex flex-wrap gap-2">
                  <Pill tone={displaySection.sectionStatus === "active" ? "success" : "neutral"}>
                    {displaySection.sectionStatus}
                  </Pill>
                  <Pill tone={displaySection.classStatus === "active" ? "success" : "neutral"}>
                    class {displaySection.classStatus}
                  </Pill>
                </div>
              }
            />
            <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
              <DetailField label="Timetable grade" value={displaySection.timetableGrade} />
              <DetailField label="Room" value={displaySection.room} />
              <DetailField label="Capacity" value={String(displaySection.capacity)} />
              <DetailField label="Academic year id" value={displaySection.academicYearId.slice(0, 8) + "…"} />
              <DetailField
                label="Last updated"
                value={new Date(displaySection.updatedAt).toLocaleString()}
              />
            </div>
          </Card>
        )}
      </PageStack>
    </AppShell>
  );
}
