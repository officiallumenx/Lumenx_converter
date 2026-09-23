import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardHeader,
  Field,
  PageStack,
  Pill,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  gradesDisplayLabel,
  resolveSubjectDetailView,
  updateSubject,
  type SubjectStatus,
  type SubjectsListStatus,
} from "@/lib/subjects";
import {
  useSubjectDetailQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";

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
  const notify = useAdminToast();
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();

  const detailEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const detailQuery = useSubjectDetailQuery(
    instituteCtx.activeInstituteId,
    subjectId,
    detailEnabled,
  );

  const subject = detailQuery.data?.subject ?? null;
  const status: SubjectsListStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : detailQuery.isLoading && !detailQuery.data
              ? "loading"
              : (detailQuery.data?.status ?? "loading");
  const errorMessage =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (detailQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    detailQuery.data && detailEnabled ? instituteCtx.activeInstituteId : null;

  const [saving, setSaving] = useState(false);
  const [periods, setPeriods] = useState("5");
  const [subjectStatus, setSubjectStatus] = useState<SubjectStatus>("active");

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
    if (!subject) return;
    setPeriods(String(subject.periodsPerWeek));
    setSubjectStatus(subject.status);
  }, [subject]);

  const invalidateSubjectCaches = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.subject),
    });
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.subjects),
    });
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.catalog),
    });
  };

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displaySubject = detailView.detailValid ? detailView.subject : null;

  const saveSubject = () => {
    if (!displaySubject) return;
    setSaving(true);
    void updateSubject(subjectId, {
      periodsPerWeek: Number(periods) || 1,
      status: subjectStatus,
    })
      .then(() => {
        invalidateSubjectCaches();
        notify("Subject updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update subject");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <AppShell
      title={displaySubject?.name ?? "Subject"}
      subtitle="Subject catalog record"
      actions={
        <Link to="/subjects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" /> Back to subjects
          </Button>
        </Link>
      }
    >
      <PageStack>
        {detailView.status !== "ready" || !displaySubject ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <>
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
            <Card>
              <CardHeader title="Edit subject" hint="Update subject details" />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5">
                <Field label="Periods per week">
                  <TextInput
                    type="number"
                    min={1}
                    max={40}
                    value={periods}
                    onChange={(e) => setPeriods(e.target.value)}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={subjectStatus}
                    onChange={(e) => setSubjectStatus(e.target.value as SubjectStatus)}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Button variant="primary" onClick={saveSubject} disabled={saving}>
                    {saving ? "Saving…" : "Save subject"}
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </PageStack>
    </AppShell>
  );
}
