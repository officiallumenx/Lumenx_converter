import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  gradesDisplayLabel,
  loadSubjectDetail,
  resolveSubjectDetailView,
  shouldCommitSubjectsLoad,
  type SubjectDetailItem,
  type SubjectsListStatus,
} from "@/lib/subjects";

function detailHint(status: SubjectsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading subject…";
  if (status === "needs_institute") return "Select an institute to load this subject.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this subject.";
  }
  if (status === "error") return errorMessage ?? "Failed to load subject.";
  if (status === "empty") return errorMessage ?? "Subject not found.";
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

export function SubjectProfileApiPage({ subjectId }: { subjectId: string }) {
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [subject, setSubject] = useState<SubjectDetailItem | null>(null);
  const [status, setStatus] = useState<SubjectsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);

  const detailView = resolveSubjectDetailView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSubject: subject,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSubject(null);
      setStatus("loading");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSubject(null);
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
      setSubject(null);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setSubject(null);
    setStatus("loading");
    setErrorMessage(null);
    void loadSubjectDetail(subjectId).then((next) => {
      if (
        !shouldCommitSubjectsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSubject(next.subject);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage, subjectId]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displaySubject = detailView.detailValid ? detailView.subject : null;

  return (
    <AppShell
      title={displaySubject?.name ?? "Subject"}
      subtitle="API mode · read-only · subject catalog record"
      actions={
        <Link to="/subjects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" /> Back to subjects
          </Button>
        </Link>
      }
    >
      <PageStack>
        <Pill tone="neutral">Read-only · API mode</Pill>
        {detailView.status !== "ready" || !displaySubject ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <Card>
            <CardHeader
              title={displaySubject.name}
              hint={`${displaySubject.code} · ${displaySubject.category}`}
              action={
                <Pill tone={displaySubject.status === "active" ? "success" : "warning"}>
                  {displaySubject.status}
                </Pill>
              }
            />
            <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
              <DetailField label="Periods / week" value={String(displaySubject.periodsPerWeek)} />
              <DetailField
                label="Applicable classes"
                value={gradesDisplayLabel(displaySubject.grades, false)}
              />
              <DetailField
                label="Last updated"
                value={new Date(displaySubject.updatedAt).toLocaleString()}
              />
            </div>
          </Card>
        )}
      </PageStack>
    </AppShell>
  );
}
