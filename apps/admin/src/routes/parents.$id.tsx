import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  UserRound,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
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
import { formatStudentGradeDisplay } from "@/lib/class-section-filter";
import {
  findParentRecord,
  loadParentDirectory,
  normalizeParentPhone,
  resolveParentChildren,
  saveParentDirectory,
  syncParentToLinkedStudents,
  type ParentDirectoryRecord,
  type ParentRelationship,
} from "@/lib/parent-directory-store";
import { loadStudentDirectory } from "@/lib/student-directory-store";
import { ParentProfileApiPage } from "@/components/parents/ParentProfileApiPage";
import { isApiAuthMode } from "@/auth/auth-mode";

export const Route = createFileRoute("/parents/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — LumenX Admin` }] }),
  component: ParentProfile,
});

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium leading-relaxed">{value || "—"}</div>
    </div>
  );
}

function ParentProfile() {
  const { id } = Route.useParams();
  if (isApiAuthMode()) {
    return <ParentProfileApiPage parentId={id} />;
  }
  return <ParentProfileDemo id={id} />;
}

function ParentProfileDemo({ id }: { id: string }) {
  const notify = useAdminToast();
  const [parent, setParent] = useState<ParentDirectoryRecord | null>(() => findParentRecord(id));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ParentDirectoryRecord | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setParent(findParentRecord(id));
    setEditing(false);
    setDraft(null);
    setErrors([]);
    setShowPassword(false);
  }, [id]);

  const children = useMemo(
    () => (parent ? resolveParentChildren(parent, loadStudentDirectory()) : []),
    [parent],
  );

  const startEdit = () => {
    if (!parent) return;
    setDraft({ ...parent, linkedStudentIds: [...parent.linkedStudentIds] });
    setErrors([]);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setErrors([]);
    setEditing(false);
  };

  const saveEdit = () => {
    if (!parent || !draft) return;
    const nextErrors: string[] = [];
    const email = draft.email.trim().toLowerCase();
    const phone = normalizeParentPhone(draft.phone);
    const linkedStudentIds = [...new Set(draft.linkedStudentIds.map((studentId) => studentId.trim().toUpperCase()).filter(Boolean))];
    const knownStudentIds = new Set(loadStudentDirectory().map((student) => student.id));
    const unknown = linkedStudentIds.filter((studentId) => !knownStudentIds.has(studentId));
    if (!draft.name.trim()) nextErrors.push("Parent name is required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.push("Enter a valid email address.");
    }
    if (!/^\d{10}$/.test(phone)) nextErrors.push("Phone must contain exactly 10 digits.");
    if (draft.password.length < 8) nextErrors.push("Password must contain at least 8 characters.");
    if (!draft.address.trim()) nextErrors.push("Address is required.");
    if (unknown.length > 0) nextErrors.push(`Student not found: ${unknown.join(", ")}`);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    const updated: ParentDirectoryRecord = {
      ...draft,
      name: draft.name.trim(),
      email,
      phone,
      address: draft.address.trim(),
      linkedStudentIds,
    };
    saveParentDirectory(
      loadParentDirectory().map((record) => (record.id === updated.id ? updated : record)),
    );
    syncParentToLinkedStudents(updated);
    setParent(updated);
    setDraft(null);
    setErrors([]);
    setEditing(false);
    notify(`${updated.name}'s details updated`);
  };

  if (!parent) {
    return (
      <AppShell title="Parent not found" subtitle={id}>
        <Card className="p-8 text-center">
          <p className="text-sm">This parent record is not available.</p>
          <Link
            to="/parents"
            className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Return to Parent Directory
          </Link>
        </Card>
      </AppShell>
    );
  }

  const view = editing && draft ? draft : parent;
  const initials = view.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppShell
      title="Parent Profile"
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
            to="/parents"
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
            <p key={error} className="text-xs text-destructive">{error}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 text-lg font-semibold ring-4 ring-border">
              {initials}
            </div>
            <h2 className="mt-4 text-base font-semibold">{view.name}</h2>
            <div className="font-mono text-[11px] text-muted-foreground">
              {view.id} · {view.relationship}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {parent.accessStatus === "hold" && <Pill tone="warning">Hold</Pill>}
              {parent.accessStatus === "suspended" && <Pill tone="danger">Suspended</Pill>}
              {parent.accessStatus === "active" && parent.inviteStatus === "pending" && (
                <Pill tone="warning">Pending invite</Pill>
              )}
              {parent.accessStatus === "active" && parent.inviteStatus === "active" && (
                <Pill tone="success">Active</Pill>
              )}
            </div>
          </div>
          <div className="mt-6 space-y-3 text-xs">
            <div className="flex items-start gap-2 text-muted-foreground">
              <Mail className="mt-0.5 size-3.5 shrink-0" /> {view.email || "No email"}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Phone className="mt-0.5 size-3.5 shrink-0" /> {view.phone}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" /> {view.address}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Parent details"
              hint={editing ? "Edit fields below, then Save" : "Guardian contact and relationship"}
            />
            {editing && draft ? (
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Field label="Full name" required>
                  <TextInput
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </Field>
                <Field label="Relationship">
                  <Select
                    value={draft.relationship}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        relationship: event.target.value as ParentRelationship,
                      })
                    }
                  >
                    <option>Mother</option>
                    <option>Father</option>
                    <option>Guardian</option>
                  </Select>
                </Field>
                <Field label="Email" hint="Optional · not used for Connect login">
                  <TextInput
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  />
                </Field>
                <Field label="Phone" required hint="Exactly 10 digits · Connect login (mobile only)">
                  <TextInput
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft({ ...draft, phone: normalizeParentPhone(event.target.value) })
                    }
                    inputMode="numeric"
                    maxLength={10}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address" required>
                    <TextArea
                      value={draft.address}
                      onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid gap-x-6 gap-y-5 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Detail label="Full name" value={parent.name} />
                <Detail label="Relationship" value={parent.relationship} />
                <Detail label="Email" value={parent.email} />
                <Detail label="Phone" value={parent.phone} />
                <div className="sm:col-span-2">
                  <Detail label="Address" value={parent.address} />
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Parent Connect account"
              hint={
                editing
                  ? "Login is mobile number + password only"
                  : "Parents sign in with this mobile number"
              }
              action={
                parent.accessStatus === "suspended" ? (
                  <Pill tone="danger">Suspended</Pill>
                ) : parent.accessStatus === "hold" ? (
                  <Pill tone="warning">Hold</Pill>
                ) : (
                  <Pill tone="success">Active</Pill>
                )
              }
            />
            {editing && draft ? (
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                <Field label="Account password" required hint="At least 8 characters">
                  <TextInput
                    value={draft.password}
                    onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                  />
                </Field>
                <Field label="Account status">
                  <Select
                    value={draft.accessStatus}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        accessStatus: event.target.value as ParentDirectoryRecord["accessStatus"],
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="hold">Hold</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </Field>
              </div>
            ) : (
              <div className="space-y-2 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Current plain-text password
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 font-mono text-xs">
                    {showPassword ? parent.password : "••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title={`Linked children (${children.length})`}
              hint={
                editing
                  ? "Edit comma-separated student IDs to change links"
                  : "Student academic details from the current institute directory"
              }
              action={<UserRound className="size-4 text-muted-foreground" />}
            />
            {editing && draft ? (
              <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                <Field label="Linked student IDs" hint="Comma-separated">
                  <TextInput
                    value={draft.linkedStudentIds.join(", ")}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        linkedStudentIds: event.target.value.split(",").map((value) => value.trim()),
                      })
                    }
                    placeholder="STU-1042, STU-1099"
                  />
                </Field>
              </div>
            ) : children.length > 0 ? (
              <div className="grid gap-4 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                {children.map((student) => (
                  <Link
                    key={student.id}
                    to="/students/$id"
                    params={{ id: student.id }}
                    className="rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-surface-hover"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{student.name}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {student.id}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {student.status === "at-risk" ? (
                          <Pill tone="danger">At risk</Pill>
                        ) : student.status === "watch" ? (
                          <Pill tone="warning">Needs attention</Pill>
                        ) : (
                          <Pill tone="success">{student.status}</Pill>
                        )}
                        {student.accessStatus !== "active" && (
                          <Pill tone={student.accessStatus === "hold" ? "warning" : "danger"}>
                            {student.accessStatus}
                          </Pill>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <AcademicMetric
                        icon={<BookOpen className="size-3.5" />}
                        label="Class"
                        value={formatStudentGradeDisplay(student.grade)}
                      />
                      <AcademicMetric
                        label="Attendance"
                        value={`${student.attendance}%`}
                      />
                      <AcademicMetric label="GPA" value={student.gpa.toFixed(1)} />
                      <AcademicMetric
                        icon={<GraduationCap className="size-3.5" />}
                        label="Academic status"
                        value={student.status}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 pb-6 pt-5 text-xs text-muted-foreground sm:px-6">
                No children are linked to this parent account.
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function AcademicMetric({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold capitalize">
        {icon}
        {value}
      </div>
    </div>
  );
}
