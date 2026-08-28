import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Copy,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Pill,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  findStudentRecord,
  getStudentConnectPassword,
  getStudentRollNo,
  loadStudentDirectory,
  normalizePhone,
  provisionStudentConnectAccount,
  saveStudentDirectory,
  STUDENTS_CHANGED_EVENT,
  type StudentDirectoryRecord,
  type StudentGender,
} from "@/lib/student-directory-store";
import { formatStudentGradeDisplay } from "@/lib/class-section-filter";
import { StudentAcademicTimelineCard } from "@/components/students/StudentAcademicTimelineCard";
import { StudentIssuedCertificatesCard } from "@/components/students/StudentIssuedCertificatesCard";
import { StudentProfileApiPage } from "@/components/students/StudentProfileApiPage";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isIdCardReady } from "@/lib/student-id-card-sync";

export const Route = createFileRoute("/students/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — LumenX Admin` }] }),
  component: StudentProfile,
});

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium leading-relaxed">{value || "—"}</div>
    </div>
  );
}

function StudentProfile() {
  const { id } = Route.useParams();
  if (isApiAuthMode()) {
    return <StudentProfileApiPage studentId={id} />;
  }
  return <StudentProfileDemo id={id} />;
}

function StudentProfileDemo({ id }: { id: string }) {
  const notify = useAdminToast();
  const [showPassword, setShowPassword] = useState(false);
  const [student, setStudent] = useState<StudentDirectoryRecord | null>(() =>
    findStudentRecord(id),
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StudentDirectoryRecord | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setStudent(findStudentRecord(id));
    setEditing(false);
    setDraft(null);
    setErrors([]);
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      if (editing) return;
      const next = findStudentRecord(id);
      setStudent((current) => {
        if (current?.id === next?.id && current?.photoDataUrl === next?.photoDataUrl) {
          return current;
        }
        return next;
      });
    };
    window.addEventListener(STUDENTS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(STUDENTS_CHANGED_EVENT, sync);
  }, [id, editing]);

  const siblings = useMemo(
    () =>
      student
        ? loadStudentDirectory().filter(
            (record) =>
              record.id !== student.id &&
              record.parentPhone &&
              record.parentPhone === student.parentPhone,
          )
        : [],
    [student],
  );

  const startEdit = () => {
    if (!student) return;
    setDraft({ ...student, rollNo: getStudentRollNo(student) });
    setErrors([]);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setErrors([]);
  };

  const saveEdit = () => {
    if (!student || !draft) return;
    const nextErrors: string[] = [];
    if (!draft.firstName.trim()) nextErrors.push("First name is required.");
    if (!draft.surname.trim()) nextErrors.push("Surname is required.");
    if (!draft.grade.trim()) nextErrors.push("Class and section are required.");
    if (!draft.parentName.trim()) nextErrors.push("Parent name is required.");
    if (!/^\d{10}$/.test(draft.parentPhone)) {
      nextErrors.push("Parent phone must contain exactly 10 digits.");
    }
    if (!draft.address.trim()) nextErrors.push("Address is required.");
    if (draft.connectAccount) {
      const accountPhone = draft.connectAccount.phone ?? "";
      const accountEmail = draft.connectAccount.email?.trim() ?? "";
      if (!accountPhone && !accountEmail) {
        nextErrors.push("Enter a student phone, email, or both for the Connect account.");
      }
      if (accountPhone && !/^\d{10}$/.test(accountPhone)) {
        nextErrors.push("Student account phone must contain exactly 10 digits.");
      }
      if (accountEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
        nextErrors.push("Enter a valid student account email.");
      }
      if (draft.connectAccount.temporaryPassword.length < 8) {
        nextErrors.push("Student account password must contain at least 8 characters.");
      }
    }
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    const updated: StudentDirectoryRecord = {
      ...draft,
      firstName: draft.firstName.trim(),
      surname: draft.surname.trim(),
      name: `${draft.firstName.trim()} ${draft.surname.trim()}`,
      grade: draft.grade.trim(),
      parent: draft.parentName.trim(),
      parentName: draft.parentName.trim(),
      parentPhone: normalizePhone(draft.parentPhone),
      address: draft.address.trim(),
      admissionNumber: draft.admissionNumber?.trim() || undefined,
      rollNo: draft.rollNo?.trim() || undefined,
      dateOfBirth: draft.dateOfBirth || undefined,
      photoDataUrl: draft.photoDataUrl?.trim() || undefined,
      photoAssetId: draft.photoDataUrl?.trim() ? draft.photoAssetId : undefined,
      bloodGroup: draft.bloodGroup?.trim() || undefined,
      emergencyContact: draft.emergencyContact?.trim() || undefined,
      house: draft.house?.trim() || undefined,
      idCardIssuedOn: draft.idCardIssuedOn?.trim() || undefined,
      idCardValidTill: draft.idCardValidTill?.trim() || undefined,
      connectAccount: draft.connectAccount
        ? {
            ...draft.connectAccount,
            phone: draft.connectAccount.phone || undefined,
            email: draft.connectAccount.email?.trim().toLowerCase() || undefined,
          }
        : undefined,
    };
    const records = loadStudentDirectory();
    saveStudentDirectory(
      records.map((record) => (record.id === updated.id ? updated : record)),
    );
    if (updated.connectAccount) {
      provisionStudentConnectAccount(updated);
    }
    setStudent(updated);
    setEditing(false);
    setDraft(null);
    setErrors([]);
    notify(`${updated.name}'s details updated`);
  };

  if (!student) {
    return (
      <AppShell title="Student not found" subtitle={id}>
        <Card className="p-8 text-center">
          <p className="text-sm">This student record is not available.</p>
          <Link
            to="/students"
            className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Return to Student Directory
          </Link>
        </Card>
      </AppShell>
    );
  }

  const password = getStudentConnectPassword(student);
  const view = editing && draft ? draft : student;
  const initials = `${view.firstName[0] ?? ""}${view.surname[0] ?? ""}`.toUpperCase();
  const admissionDocs = student.admissionDocuments ?? [];
  const verifyPath = `/verify/${encodeURIComponent(view.id)}`;
  const idCardReady = isIdCardReady(view);

  const copyVerifyLink = async () => {
    const origin =
      typeof window !== "undefined"
        ? (import.meta.env.VITE_CONNECT_PUBLIC_URL as string | undefined)?.replace(/\/$/, "") ||
          "http://localhost:5173"
        : "http://localhost:5173";
    const url = `${origin}${verifyPath}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Verify link copied");
    } catch {
      notify(url);
    }
  };

  return (
    <AppShell
      title="Student Profile"
      subtitle={`${view.name} · ${view.id}`}
      actions={
        <>
          {editing ? (
            <>
              <Button onClick={cancelEdit}>
                <X className="size-3.5" /> Cancel
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                <Save className="size-3.5" /> Save
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={startEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
          <Link
            to="/students"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-xs font-medium hover:bg-surface-hover"
          >
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          {errors.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <StudentPhotoBlock
              name={view.name}
              initials={initials}
              photoDataUrl={view.photoDataUrl}
              editing={editing && Boolean(draft)}
              onPhotoChange={(url) =>
                draft && setDraft({ ...draft, photoDataUrl: url })
              }
              onPhotoRemove={() =>
                draft && setDraft({ ...draft, photoDataUrl: undefined, photoAssetId: undefined })
              }
            />
            <h2 className="mt-4 text-base font-semibold">{view.name}</h2>
            <div className="font-mono text-[11px] text-muted-foreground">
              {view.id} · {formatStudentGradeDisplay(view.grade)}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <Pill tone={student.status === "active" ? "success" : "warning"}>
                {student.status}
              </Pill>
              <Pill tone={idCardReady ? "success" : "neutral"}>
                {idCardReady ? "ID ready" : "ID incomplete"}
              </Pill>
              {student.accessStatus === "hold" && <Pill tone="warning">Hold</Pill>}
              {student.accessStatus === "suspended" && <Pill tone="danger">Suspended</Pill>}
            </div>
          </div>
          <div className="mt-6 space-y-3 text-xs">
            <div className="flex items-start gap-2 text-muted-foreground">
              <Users className="mt-0.5 size-3.5 shrink-0" />
              Parent: {view.parentName}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Phone className="mt-0.5 size-3.5 shrink-0" />
              {view.parentPhone}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {view.address}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Student details"
              hint={editing ? "Edit fields below, then Save" : "Official institute record"}
            />
            {editing && draft ? (
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Field label="First name" required>
                  <TextInput
                    value={draft.firstName}
                    onChange={(event) =>
                      setDraft({ ...draft, firstName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Surname" required>
                  <TextInput
                    value={draft.surname}
                    onChange={(event) =>
                      setDraft({ ...draft, surname: event.target.value })
                    }
                  />
                </Field>
                <Field label="Class & section" required>
                  <TextInput
                    value={draft.grade}
                    onChange={(event) =>
                      setDraft({ ...draft, grade: event.target.value })
                    }
                    placeholder="10-A"
                  />
                </Field>
                <Field label="Gender" required>
                  <Select
                    value={draft.gender}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        gender: event.target.value as StudentGender,
                      })
                    }
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </Select>
                </Field>
                <Field label="Date of birth" hint="Optional">
                  <TextInput
                    type="date"
                    value={draft.dateOfBirth ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, dateOfBirth: event.target.value })
                    }
                  />
                </Field>
                <Field label="Admission number" hint="Optional">
                  <TextInput
                    value={draft.admissionNumber ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, admissionNumber: event.target.value })
                    }
                  />
                </Field>
                <Field label="Roll number" hint="Used in class & section roster">
                  <TextInput
                    value={draft.rollNo ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, rollNo: event.target.value })
                    }
                    placeholder="12"
                  />
                </Field>
                <Field label="Blood group" hint="Optional — shown on ID card">
                  <TextInput
                    value={draft.bloodGroup ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, bloodGroup: event.target.value })
                    }
                    placeholder="O+"
                  />
                </Field>
                <Field label="House" hint="Optional">
                  <TextInput
                    value={draft.house ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, house: event.target.value })
                    }
                    placeholder="Sapphire"
                  />
                </Field>
                <Field label="Emergency contact" hint="Optional — 10-digit phone">
                  <TextInput
                    value={draft.emergencyContact ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        emergencyContact: normalizePhone(event.target.value),
                      })
                    }
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Parent or guardian phone"
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 pb-5 pt-5 sm:grid-cols-3 sm:px-6 sm:pb-6">
                <Detail label="First name" value={student.firstName} />
                <Detail label="Surname" value={student.surname} />
                <Detail label="Gender" value={student.gender} />
                <Detail label="Class & section" value={formatStudentGradeDisplay(student.grade)} />
                <Detail label="Date of birth" value={student.dateOfBirth} />
                <Detail label="Admission number" value={student.admissionNumber} />
                <Detail label="Roll number" value={getStudentRollNo(student)} />
                <Detail label="Blood group" value={student.bloodGroup} />
                <Detail label="House" value={student.house} />
                <Detail label="Emergency contact" value={student.emergencyContact} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Parent details"
              hint={editing ? "Changing parent phone updates sibling links" : "Guardian contact and sibling link"}
            />
            {editing && draft ? (
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Field label="Parent name" required>
                  <TextInput
                    value={draft.parentName}
                    onChange={(event) =>
                      setDraft({ ...draft, parentName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Parent phone" required hint="Exactly 10 digits">
                  <TextInput
                    value={draft.parentPhone}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        parentPhone: normalizePhone(event.target.value),
                      })
                    }
                    inputMode="numeric"
                    maxLength={10}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address" required>
                    <TextArea
                      value={draft.address}
                      onChange={(event) =>
                        setDraft({ ...draft, address: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid gap-x-6 gap-y-5 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Detail label="Parent name" value={student.parentName} />
                <Detail label="Parent phone" value={student.parentPhone} />
                <div className="sm:col-span-2">
                  <Detail label="Address" value={student.address} />
                </div>
                {siblings.length > 0 && (
                  <div className="sm:col-span-2 space-y-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Linked siblings ({siblings.length})
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {siblings.map((sibling) => (
                        <Link
                          key={sibling.id}
                          to="/students/$id"
                          params={{ id: sibling.id }}
                          className="rounded-md border border-border bg-background/40 px-3.5 py-2.5 text-xs hover:border-primary/40"
                        >
                          {sibling.name} · {formatStudentGradeDisplay(sibling.grade)}
                        </Link>
            ))}
          </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Student Connect account"
              hint={
                editing
                  ? draft?.connectAccount
                    ? "Edit login credentials and account status"
                    : "Create a Connect account for this student"
                  : "Phone/email → password → OTP; password changes after first login"
              }
              action={
                view.connectAccount ? (
                  <Pill
                    tone={
                      view.connectAccount.status === "active" ? "success" : "warning"
                    }
                  >
                    {view.connectAccount.status === "first-login-pending"
                      ? "First login pending"
                      : view.connectAccount.status}
                  </Pill>
                ) : (
                  <Pill tone="neutral">No account</Pill>
                )
              }
            />
            {editing && draft?.connectAccount ? (
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Field label="Student phone" hint="Optional if email is entered">
                  <TextInput
                    value={draft.connectAccount.phone ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        connectAccount: {
                          ...draft.connectAccount!,
                          phone: normalizePhone(event.target.value),
                        },
                      })
                    }
                    inputMode="numeric"
                    maxLength={10}
                  />
                </Field>
                <Field label="Student email" hint="Optional if phone is entered">
                  <TextInput
                    type="email"
                    value={draft.connectAccount.email ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        connectAccount: {
                          ...draft.connectAccount!,
                          email: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Account password" required hint="At least 8 characters">
                  <TextInput
                    value={draft.connectAccount.temporaryPassword}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        connectAccount: {
                          ...draft.connectAccount!,
                          temporaryPassword: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Account status" required>
                  <Select
                    value={draft.connectAccount.status}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        connectAccount: {
                          ...draft.connectAccount!,
                          status: event.target.value as
                            | "first-login-pending"
                            | "active"
                            | "suspended",
                        },
                      })
                    }
                  >
                    <option value="first-login-pending">First login pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </Field>
              </div>
            ) : editing && draft && !draft.connectAccount ? (
              <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This student has no Connect login yet. Add account details to create one.
                </p>
                <Button
                  onClick={() =>
                    setDraft({
                      ...draft,
                      connectAccount: {
                        phone: "",
                        email: "",
                        temporaryPassword: "Student@123",
                        status: "first-login-pending",
                      },
                    })
                  }
                >
                  <KeyRound className="size-3.5" /> Add Connect account
                </Button>
              </div>
            ) : student.connectAccount ? (
              <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2.5 text-xs">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    {student.connectAccount.phone || "No mobile"}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                    {student.connectAccount.email || "No email"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Current plain-text password
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
                    <KeyRound className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 font-mono text-xs">
                      {showPassword ? password : "••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  On first login the student uses the Admin demo password, completes OTP, and
                  chooses a new password. The updated password appears here when both apps share
                  the same browser origin.
                </p>
              </div>
            ) : (
              <div className="px-5 pb-5 pt-5 text-xs leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
                This student has an institute record but no Student Connect login account.
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Digital ID card"
              hint="QR is created with the student. Photo and optional fields update Connect automatically."
              action={
                <Pill tone={idCardReady ? "success" : "neutral"}>
                  {idCardReady ? "Ready" : "Incomplete"}
                </Pill>
              }
            />
            {editing && draft ? (
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Field label="Issued on" hint="Set when the student was created">
                  <TextInput
                    value={draft.idCardIssuedOn ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, idCardIssuedOn: event.target.value })
                    }
                    placeholder="03 Aug 2026"
                  />
                </Field>
                <Field label="Valid till" hint="Optional">
                  <TextInput
                    value={draft.idCardValidTill ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, idCardValidTill: event.target.value })
                    }
                    placeholder="31 Mar 2027"
                  />
                </Field>
                <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                  Verify URL: <span className="font-mono text-foreground">{verifyPath}</span>
                  <span className="mt-1 block">
                    Empty photo / blood group / house appear blank on the Connect ID card until filled.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <Detail label="Student ID (QR)" value={student.id} />
                  <Detail label="Verify path" value={verifyPath} />
                  <Detail label="Issued on" value={student.idCardIssuedOn} />
                  <Detail label="Valid till" value={student.idCardValidTill} />
                  <Detail
                    label="Photo"
                    value={student.photoDataUrl || student.photoAssetId ? "Uploaded" : undefined}
                  />
                  <Detail
                    label="Status"
                    value={idCardReady ? "Ready to print / share" : "Add photo to mark ready"}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void copyVerifyLink()}>
                    <Copy className="size-3.5" /> Copy verify link
                  </Button>
                  <Button onClick={() => window.print()}>
                    <IdCard className="size-3.5" /> Print profile
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Admission documents"
              hint="Moved from Admissions at conversion time"
              action={
                <Pill tone={admissionDocs.length > 0 ? "info" : "neutral"}>
                  {admissionDocs.length} file{admissionDocs.length === 1 ? "" : "s"}
                </Pill>
              }
            />
            {admissionDocs.length > 0 ? (
              <div className="space-y-2 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                {admissionDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2"
                  >
                    <div className="text-xs">
                      <div className="font-medium">
                        {doc.label} · {doc.fileName}
                      </div>
                      <div className="text-muted-foreground">
                        {doc.status} · moved {new Date(doc.movedAt).toLocaleDateString("en-IN")} ·
                        admission copy purge{" "}
                        {new Date(doc.purgeAdmissionCopyAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (doc.previewDataUrl) {
                          window.open(doc.previewDataUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      Preview
                    </Button>
                </div>
              ))}
            </div>
            ) : (
              <div className="px-5 pb-5 pt-5 text-xs leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
                No admission documents have been linked to this student profile yet.
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Academic details" hint="Current performance snapshot" />
            <div className="grid grid-cols-2 gap-3.5 px-5 pb-5 pt-5 sm:grid-cols-4 sm:gap-4 sm:px-6 sm:pb-6">
              {[
                { label: "Attendance", value: `${student.attendance}%` },
                { label: "GPA", value: student.gpa.toFixed(1) },
                { label: "Class", value: formatStudentGradeDisplay(view.grade) },
                { label: "Academic status", value: student.status },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold capitalize leading-snug">
                    {item.label === "Class" && <BookOpen className="size-3.5 shrink-0" />}
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <StudentIssuedCertificatesCard studentId={student.id} />

          <StudentAcademicTimelineCard studentId={student.id} />
        </div>
      </div>
    </AppShell>
  );
}

function StudentPhotoBlock({
  name,
  initials,
  photoDataUrl,
  editing,
  onPhotoChange,
  onPhotoRemove,
}: {
  name: string;
  initials: string;
  photoDataUrl?: string;
  editing: boolean;
  onPhotoChange: (dataUrl: string) => void;
  onPhotoRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPhotoChange(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-20 overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 text-lg font-semibold ring-4 ring-border">
        {photoDataUrl ? (
          <img src={photoDataUrl} alt={`${name} photo`} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">{initials || "—"}</div>
        )}
      </div>
      {editing ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-3" /> {photoDataUrl ? "Change photo" : "Upload photo"}
          </Button>
          {photoDataUrl ? (
            <Button size="sm" onClick={onPhotoRemove}>
              <Trash2 className="size-3" /> Remove
            </Button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : null}
    </div>
  );
}
