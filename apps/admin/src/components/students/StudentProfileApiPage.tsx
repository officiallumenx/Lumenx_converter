import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  PageStack,
  Pill,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  deleteStudent,
  loadStudentDetail,
  resolveStudentsDetailView,
  shouldCommitStudentsLoad,
  updateStudent,
  type StudentAccessStatus,
  type StudentDetailItem,
  type StudentGender,
  type StudentStatus,
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

type EditDraft = {
  firstName: string;
  surname: string;
  classLabel: string;
  sectionLabel: string;
  rollNo: string;
  address: string;
  gender: StudentGender;
  dateOfBirth: string;
  house: string;
  bloodGroup: string;
  emergencyContact: string;
  admissionNumber: string;
  status: StudentStatus;
  accessStatus: StudentAccessStatus;
};

const STATUS_OPTIONS: StudentStatus[] = [
  "active",
  "at-risk",
  "watch",
  "inactive",
  "graduated",
];

const ACCESS_OPTIONS: StudentAccessStatus[] = ["active", "hold", "suspended"];

const GENDER_OPTIONS: StudentGender[] = [
  "female",
  "male",
  "other",
  "prefer_not_to_say",
];

export function StudentProfileApiPage({ studentId }: { studentId: string }) {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [student, setStudent] = useState<StudentDetailItem | null>(null);
  const [status, setStatus] = useState<StudentsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saveError, setSaveError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);

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
    setEditing(false);
    setDraft(null);
    setPendingDelete(false);
    setSaveError("");
  }, [instituteCtx.activeInstituteId, studentId]);

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
    void loadStudentDetail(studentId, requestInstituteId).then((next) => {
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
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    studentId,
    reloadKey,
  ]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displayStudent = detailView.detailValid ? detailView.student : null;

  const startEdit = () => {
    if (!writesEnabled || !displayStudent) return;
    setDraft({
      firstName: displayStudent.firstName,
      surname: displayStudent.surname,
      classLabel: displayStudent.classLabel ?? "",
      sectionLabel: displayStudent.sectionLabel ?? "",
      rollNo: displayStudent.rollNo ?? "",
      address: displayStudent.address === "—" ? "" : displayStudent.address,
      gender: displayStudent.gender,
      dateOfBirth: displayStudent.dateOfBirth ?? "",
      house: displayStudent.house ?? "",
      bloodGroup: displayStudent.bloodGroup ?? "",
      emergencyContact: displayStudent.emergencyContact ?? "",
      admissionNumber: displayStudent.admissionNumber ?? "",
      status: displayStudent.status,
      accessStatus: displayStudent.accessStatus,
    });
    setSaveError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setSaveError("");
    setEditing(false);
  };

  const saveEdit = () => {
    if (!writesEnabled || !draft) return;
    if (!draft.firstName.trim() || !draft.surname.trim()) {
      setSaveError("First name and surname are required.");
      return;
    }
    if (!draft.address.trim()) {
      setSaveError("Address is required.");
      return;
    }
    void updateStudent(studentId, {
      firstName: draft.firstName.trim(),
      surname: draft.surname.trim(),
      classLabel: draft.classLabel.trim() || null,
      sectionLabel: draft.sectionLabel.trim() || null,
      rollNo: draft.rollNo.trim() || null,
      address: draft.address.trim(),
      gender: draft.gender,
      dateOfBirth: draft.dateOfBirth.trim() || null,
      house: draft.house.trim() || null,
      bloodGroup: draft.bloodGroup.trim() || null,
      emergencyContact: draft.emergencyContact.trim() || null,
      admissionNumber: draft.admissionNumber.trim() || null,
      status: draft.status,
      accessStatus: draft.accessStatus,
    })
      .then(() => {
        setEditing(false);
        setDraft(null);
        setSaveError("");
        setReloadKey((k) => k + 1);
        notify("Student updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update student");
      });
  };

  const confirmDelete = () => {
    if (!writesEnabled) return;
    void deleteStudent(studentId)
      .then(() => {
        setPendingDelete(false);
        notify("Student deleted");
        void navigate({ to: "/students" });
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete student");
      });
  };

  return (
    <AppShell
      title={displayStudent?.name ?? "Student profile"}
      subtitle="API mode · student directory record"
      actions={
        <>
          {displayStudent && editing ? (
            <>
              <Button onClick={cancelEdit}>
                <X className="size-3.5" /> Cancel
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                <Save className="size-3.5" /> Save
              </Button>
            </>
          ) : displayStudent && writesEnabled ? (
            <>
              <Button
                variant="outline"
                onClick={() => setPendingDelete(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
              <Button variant="primary" onClick={startEdit}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </>
          ) : null}
          <Link to="/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-3.5" /> Back to students
            </Button>
          </Link>
        </>
      }
    >
      <PageStack>
        {saveError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {saveError}
          </div>
        ) : null}
        {detailView.status !== "ready" || !displayStudent ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {hint ?? "Loading…"}
          </Card>
        ) : editing && draft ? (
          <Card>
            <CardHeader title={displayStudent.name} hint="PATCH /api/v1/students/:id" />
            <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5">
              <Field label="First name" required>
                <TextInput
                  value={draft.firstName}
                  onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                />
              </Field>
              <Field label="Surname" required>
                <TextInput
                  value={draft.surname}
                  onChange={(e) => setDraft({ ...draft, surname: e.target.value })}
                />
              </Field>
              <Field label="Class">
                <TextInput
                  value={draft.classLabel}
                  onChange={(e) => setDraft({ ...draft, classLabel: e.target.value })}
                />
              </Field>
              <Field label="Section">
                <TextInput
                  value={draft.sectionLabel}
                  onChange={(e) => setDraft({ ...draft, sectionLabel: e.target.value })}
                />
              </Field>
              <Field label="Roll no.">
                <TextInput
                  value={draft.rollNo}
                  onChange={(e) => setDraft({ ...draft, rollNo: e.target.value })}
                />
              </Field>
              <Field label="Admission number">
                <TextInput
                  value={draft.admissionNumber}
                  onChange={(e) => setDraft({ ...draft, admissionNumber: e.target.value })}
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={draft.gender}
                  onChange={(e) =>
                    setDraft({ ...draft, gender: e.target.value as StudentGender })
                  }
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date of birth">
                <TextInput
                  type="date"
                  value={draft.dateOfBirth}
                  onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })}
                />
              </Field>
              <Field label="Enrollment status">
                <Select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as StudentStatus })
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Access status">
                <Select
                  value={draft.accessStatus}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      accessStatus: e.target.value as StudentAccessStatus,
                    })
                  }
                >
                  {ACCESS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="House">
                <TextInput
                  value={draft.house}
                  onChange={(e) => setDraft({ ...draft, house: e.target.value })}
                />
              </Field>
              <Field label="Blood group">
                <TextInput
                  value={draft.bloodGroup}
                  onChange={(e) => setDraft({ ...draft, bloodGroup: e.target.value })}
                />
              </Field>
              <Field label="Emergency contact">
                <TextInput
                  value={draft.emergencyContact}
                  onChange={(e) =>
                    setDraft({ ...draft, emergencyContact: e.target.value })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" required>
                  <TextArea
                    value={draft.address}
                    onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>
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
              <CardHeader
                title="Contact & address"
                hint={`Last updated ${new Date(displayStudent.updatedAt).toLocaleString()}`}
              />
              <div className="px-4 pb-5 sm:px-5">
                <DetailField label="Address" value={displayStudent.address} />
              </div>
            </Card>
          </>
        )}
      </PageStack>

      <Modal
        open={pendingDelete}
        onClose={() => setPendingDelete(false)}
        title="Delete student?"
        subtitle={
          displayStudent
            ? `This will permanently remove ${displayStudent.name}.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete student
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Soft-delete via DELETE /api/v1/students/:id. Related academic history remains
          according to backend retention rules.
        </p>
      </Modal>
    </AppShell>
  );
}
