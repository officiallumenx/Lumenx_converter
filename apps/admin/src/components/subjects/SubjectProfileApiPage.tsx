import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import {
  gradesDisplayLabel,
  loadSubjectDetail,
  type SubjectDetailItem,
  type SubjectsListStatus,
} from "@/lib/subjects";

function detailHint(status: SubjectsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading subject…";
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
  const [subject, setSubject] = useState<SubjectDetailItem | null>(null);
  const [status, setStatus] = useState<SubjectsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    void loadSubjectDetail(subjectId).then((next) => {
      if (cancelled) return;
      setSubject(next.subject);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const hint = detailHint(status, errorMessage);

  return (
    <AppShell
      title={subject?.name ?? "Subject"}
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
        {status !== "ready" || !subject ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <Card>
            <CardHeader
              title={subject.name}
              hint={`${subject.code} · ${subject.category}`}
              action={
                <Pill tone={subject.status === "active" ? "success" : "warning"}>
                  {subject.status}
                </Pill>
              }
            />
            <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
              <DetailField label="Periods / week" value={String(subject.periodsPerWeek)} />
              <DetailField
                label="Applicable classes"
                value={gradesDisplayLabel(subject.grades, false)}
              />
              <DetailField
                label="Last updated"
                value={new Date(subject.updatedAt).toLocaleString()}
              />
            </div>
          </Card>
        )}
      </PageStack>
    </AppShell>
  );
}
