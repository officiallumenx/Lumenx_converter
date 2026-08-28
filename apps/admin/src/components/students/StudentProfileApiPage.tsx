import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadStudentDetail,
  resolveStudentsDetailView,
  shouldCommitStudentsLoad,
  type StudentDetailItem,
  type StudentsListStatus,
} from "@/lib/students";

function detailHint(status: StudentsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading student profile…";
  if (status === "needs_institute") return "Select an institute to load this student profile.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this student.";
  }
  if (status === "error") return errorMessage ?? "Failed to load student profile.";
  if (status === "empty") return errorMessage ?? "Student not found.";
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

function statusTone(status: StudentDetailItem["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "at-risk") return "danger";
  if (status === "watch") return "warning";
  return "neutral";
}

export function StudentProfileApiPage({ studentId }: { studentId: string }) {
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [student, setStudent] = useState<StudentDetailItem | null>(null);
  const [status, setStatus] = useState<StudentsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);

  const detailView = resolveStudentsDetailView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedStudent: student,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setStudent(null);
      setStatus("loading");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setStudent(null);
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
      setStudent(null);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setStudent(null);
    setStatus("loading");
    setErrorMessage(null);
    void loadStudentDetail(studentId).then((next) => {
      if (
        !shouldCommitStudentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setStudent(next.student);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage, studentId]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displayStudent = detailView.detailValid ? detailView.student : null;

  return (
    <AppShell
      title={displayStudent?.name ?? "Student profile"}
      subtitle="API mode · read-only · student directory record"
      actions={
        <Link to="/students">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" /> Back to students
          </Button>
        </Link>
      }
    >
      <PageStack>
        <Pill tone="neutral">Read-only · API mode</Pill>
        {detailView.status !== "ready" || !displayStudent ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={displayStudent.name}
                hint={`${displayStudent.grade} · ${displayStudent.admissionNumber ?? "No admission no."}`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={statusTone(displayStudent.status)}>{displayStudent.status}</Pill>
                    <Pill tone={displayStudent.accessStatus === "active" ? "success" : "warning"}>
                      {displayStudent.accessStatus}
                    </Pill>
                  </div>
                }
              />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                <DetailField label="Roll no." value={displayStudent.rollNo} />
                <DetailField label="Class" value={displayStudent.classLabel} />
                <DetailField label="Section" value={displayStudent.sectionLabel} />
                <DetailField label="Gender" value={displayStudent.gender.replace(/_/g, " ")} />
                <DetailField label="Date of birth" value={displayStudent.dateOfBirth} />
                <DetailField label="House" value={displayStudent.house} />
                <DetailField label="Blood group" value={displayStudent.bloodGroup} />
                <DetailField label="Emergency contact" value={displayStudent.emergencyContact} />
                <DetailField label="Legacy code" value={displayStudent.legacyCode} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Contact & address" hint={`Last updated ${new Date(displayStudent.updatedAt).toLocaleString()}`} />
              <div className="px-4 pb-5 sm:px-5">
                <DetailField label="Address" value={displayStudent.address} />
              </div>
            </Card>
          </>
        )}
      </PageStack>
    </AppShell>
  );
}
