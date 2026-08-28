import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import { loadStudentDetail, type StudentDetailItem, type StudentsListStatus } from "@/lib/students";

function detailHint(status: StudentsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading student profile…";
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
  const [student, setStudent] = useState<StudentDetailItem | null>(null);
  const [status, setStatus] = useState<StudentsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    void loadStudentDetail(studentId).then((next) => {
      if (cancelled) return;
      setStudent(next.student);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const hint = detailHint(status, errorMessage);

  return (
    <AppShell
      title={student?.name ?? "Student profile"}
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
        {status !== "ready" || !student ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={student.name}
                hint={`${student.grade} · ${student.admissionNumber ?? "No admission no."}`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={statusTone(student.status)}>{student.status}</Pill>
                    <Pill tone={student.accessStatus === "active" ? "success" : "warning"}>
                      {student.accessStatus}
                    </Pill>
                  </div>
                }
              />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                <DetailField label="Roll no." value={student.rollNo} />
                <DetailField label="Class" value={student.classLabel} />
                <DetailField label="Section" value={student.sectionLabel} />
                <DetailField label="Gender" value={student.gender.replace(/_/g, " ")} />
                <DetailField label="Date of birth" value={student.dateOfBirth} />
                <DetailField label="House" value={student.house} />
                <DetailField label="Blood group" value={student.bloodGroup} />
                <DetailField label="Emergency contact" value={student.emergencyContact} />
                <DetailField label="Legacy code" value={student.legacyCode} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Contact & address" hint={`Last updated ${new Date(student.updatedAt).toLocaleString()}`} />
              <div className="px-4 pb-5 sm:px-5">
                <DetailField label="Address" value={student.address} />
              </div>
            </Card>
          </>
        )}
      </PageStack>
    </AppShell>
  );
}
