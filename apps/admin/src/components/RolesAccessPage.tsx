import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Pill,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";

import { AppShell } from "@/components/AppShell";
import { ClassSectionAudienceField } from "@/components/ClassSectionMultiPicker";
import { getAttendanceClassSectionOptions } from "@/lib/attendance-coordinator-access";
import { SEARCH_TEACHERS } from "@/lib/admin-search-data";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import {
  ACCESS_MODULES,
  ATTENDANCE_COORDINATOR_ROLE_ID,
  createEmptyPermissions,
  deleteAccessAssignee,
  deleteAccessRole,
  saveAccessAssignee,
  saveAccessRole,
  setAccessAssigneeStatus,
  useRolesAccess,
  type AccessAssignee,
  type AccessPermission,
  type AccessRole,
} from "@/lib/roles-access";

const groupedModules = Array.from(new Set(ACCESS_MODULES.map((module) => module.group))).map(
  (group) => ({
    group,
    modules: ACCESS_MODULES.filter((module) => module.group === group),
  }),
);

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function RolesAccessPage() {
  const { roles, assignees } = useRolesAccess();
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessRole | null>(null);
  const [assigneeEditorOpen, setAssigneeEditorOpen] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState<AccessAssignee | null>(null);
  const [assignmentRoleId, setAssignmentRoleId] = useState<string | null>(null);
  const [managingRole, setManagingRole] = useState<AccessRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const assignedCount = (roleId: string) =>
    assignees.filter((assignee) => assignee.roleId === roleId).length;

  const handleDeleteRole = (roleId: string) => {
    setMessage(
      deleteAccessRole(roleId)
        ? "Role deleted."
        : "System roles and roles with assigned users cannot be deleted.",
    );
  };

  const handleDuplicateRole = (role: AccessRole) => {
    saveAccessRole({
      ...role,
      id: nextId("ROL"),
      name: `${role.name} (copy)`,
      system: false,
    });
    setMessage("Role duplicated. You can now edit its name and module access.");
  };

  return (
    <AppShell
      title={M.roles}
      subtitle="Create institute roles, assign users, and control which Admin modules they can open"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setEditingAssignee(null);
              setAssignmentRoleId(roles[0]?.id ?? null);
              setAssigneeEditorOpen(true);
            }}
          >
            <UserPlus className="size-3.5" /> Assign Teacher
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingRole(null);
              setRoleEditorOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Create Role
          </Button>
        </div>
      }
    >
      {message && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      <div className="lx-kpi-grid mb-3">
        {[
          { label: "Roles", value: roles.length },
          { label: "Assigned users", value: assignees.length },
          {
            label: "Active users",
            value: assignees.filter((assignee) => assignee.status === "active").length,
          },
          { label: "Available modules", value: ACCESS_MODULES.length },
        ].map((item) => (
          <Card key={item.label}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {item.label}
            </div>
            <div className="lx-kpi-stat__value tracking-tight">{item.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Role module access"
          hint="Selected modules are visible after login. Unselected modules are hidden and blocked."
          action={
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Frontend access control
            </div>
          }
        />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const selected = Object.values(role.permissions).filter(
              (permission) => permission !== "none",
            ).length;
            return (
              <div key={role.id} className="rounded-xl border border-border bg-background/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{role.name}</h3>
                      {role.system && <Pill tone="info">System</Pill>}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{role.scope}</p>
                  </div>
                  <Pill tone="info">{assignedCount(role.id)} users</Pill>
                </div>
                <p className="mt-3 min-h-8 text-xs text-muted-foreground">
                  {role.description || "No role description provided."}
                </p>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/25 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">Visible modules</span>
                  <span className="text-xs font-semibold">
                    {selected} / {ACCESS_MODULES.length}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      title="Duplicate role"
                      onClick={() => handleDuplicateRole(role)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Edit role"
                      onClick={() => {
                        setEditingRole(role);
                        setRoleEditorOpen(true);
                      }}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    {!role.system && (
                      <button
                        type="button"
                        title="Delete role"
                        onClick={() => handleDeleteRole(role.id)}
                        className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Manage assigned teachers"
                    onClick={() => setManagingRole(role)}
                    className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    <UserPlus className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Assigned teachers"
          hint="Teachers sign in with either their registered email or 10-digit mobile, then password and OTP"
          action={<Users className="size-4 text-muted-foreground" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-border bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">Login identity</th>
                <th className="px-4 py-3">Password</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Linked person</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignees.map((assignee) => {
                const role = roles.find((item) => item.id === assignee.roleId);
                const linkedTeacher = SEARCH_TEACHERS.find(
                  (teacher) => teacher.id === assignee.linkedPersonId,
                );
                return (
                  <tr key={assignee.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium">{assignee.name}</div>
                      <div className="text-[10px] text-muted-foreground">{assignee.id}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {assignee.email && <div>{assignee.email}</div>}
                      {assignee.phone && (
                        <div className="text-muted-foreground">{assignee.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AdminPasswordReveal password={assignee.password} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>{role?.name ?? "Role removed"}</div>
                      {assignee.roleId === ATTENDANCE_COORDINATOR_ROLE_ID ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {(assignee.assignedSectionKeys?.length ?? 0) === 0
                            ? "No classes assigned"
                            : `${assignee.assignedSectionKeys!.length} class · section assigned`}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {linkedTeacher?.name ?? "Not linked"}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={assignee.status === "active" ? "success" : "danger"}>
                        {assignee.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          onClick={() =>
                            setAccessAssigneeStatus(
                              assignee.id,
                              assignee.status === "active" ? "suspended" : "active",
                            )
                          }
                        >
                          {assignee.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                        <button
                          type="button"
                          title="Edit user or change password"
                          onClick={() => {
                            setEditingAssignee(assignee);
                            setAssigneeEditorOpen(true);
                          }}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                        >
                          <KeyRound className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assignees.length === 0 && (
            <div className="px-5 py-10 text-center">
              <UserPlus className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No teachers assigned yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the teacher icon on a role card to assign one or more teachers.
              </p>
            </div>
          )}
        </div>
      </Card>

      <AccessRoleEditor
        open={roleEditorOpen}
        role={editingRole}
        onClose={() => setRoleEditorOpen(false)}
        onSaved={() => {
          setRoleEditorOpen(false);
          setMessage(editingRole ? "Role access updated." : "Role created.");
        }}
      />
      <AccessAssigneeEditor
        open={assigneeEditorOpen}
        assignee={editingAssignee}
        roles={roles}
        defaultRoleId={assignmentRoleId}
        onClose={() => setAssigneeEditorOpen(false)}
        onSaved={() => {
          setAssigneeEditorOpen(false);
          setMessage(editingAssignee ? "User access and password updated." : "User assigned.");
        }}
      />
      <RoleTeacherManager
        role={managingRole}
        assignees={assignees.filter(
          (assignee) => assignee.roleId === managingRole?.id,
        )}
        onClose={() => setManagingRole(null)}
        onAdd={() => {
          if (!managingRole) return;
          setAssignmentRoleId(managingRole.id);
          setEditingAssignee(null);
          setManagingRole(null);
          setAssigneeEditorOpen(true);
        }}
        onEdit={(assignee) => {
          setAssignmentRoleId(assignee.roleId);
          setEditingAssignee(assignee);
          setManagingRole(null);
          setAssigneeEditorOpen(true);
        }}
      />
    </AppShell>
  );
}

function RoleTeacherManager({
  role,
  assignees,
  onClose,
  onAdd,
  onEdit,
}: {
  role: AccessRole | null;
  assignees: AccessAssignee[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (assignee: AccessAssignee) => void;
}) {
  return (
    <Modal
      open={role !== null}
      onClose={onClose}
      title={`Teachers · ${role?.name ?? ""}`}
      subtitle="Add, change, or remove teachers assigned to this role"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={onAdd}>
            <UserPlus className="size-3.5" /> Add teacher
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {assignees.map((assignee) => {
          const teacher = SEARCH_TEACHERS.find(
            (item) => item.id === assignee.linkedPersonId,
          );
          return (
            <div
              key={assignee.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {assignee.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  {teacher?.name ?? assignee.name}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {[assignee.email, assignee.phone].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1">
                  <AdminPasswordReveal password={assignee.password} />
                </div>
              </div>
              <button
                type="button"
                title="Change teacher or login details"
                onClick={() => onEdit(assignee)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
              >
                <Edit3 className="size-3.5" />
              </button>
              <button
                type="button"
                title="Delete teacher assignment"
                onClick={() => deleteAccessAssignee(assignee.id)}
                className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
        {assignees.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No teachers in this role</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add one teacher now, then repeat to assign multiple teachers.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AccessRoleEditor({
  open,
  role,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: AccessRole | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AccessRole>(() => makeRoleDraft(role));

  useEffect(() => {
    if (open) setDraft(makeRoleDraft(role));
  }, [open, role]);

  const selectedCount = Object.values(draft.permissions).filter(
    (permission) => permission !== "none",
  ).length;

  const setPermission = (route: string, permission: AccessPermission) => {
    setDraft((current) => ({
      ...current,
      permissions: { ...current.permissions, [route]: permission },
    }));
  };

  const handleSave = () => {
    if (!draft.name.trim() || selectedCount === 0) return;
    saveAccessRole({ ...draft, name: draft.name.trim(), scope: draft.scope.trim() });
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? "Edit role" : "Create role"}
      subtitle="Name the role and select only the Admin modules it can see and handle"
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!draft.name.trim() || selectedCount === 0}>
            <Save className="size-3.5" /> {role ? "Save changes" : "Create role"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role name" required hint="Admin chooses this name">
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Financial, Books & Fees, Front Office…"
          />
        </Field>
        <Field label="Scope" hint="Optional operational description">
          <TextInput
            value={draft.scope}
            onChange={(event) => setDraft({ ...draft, scope: event.target.value })}
            placeholder="Institute, department, assigned grades…"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <TextArea
              value={draft.description ?? ""}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="What this role handles"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold">Module access</div>
          <div className="text-[11px] text-muted-foreground">
            {selectedCount} selected · unselected modules stay hidden
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              setDraft({
                ...draft,
                permissions: Object.fromEntries(
                  ACCESS_MODULES.map((module) => [module.route, "full"]),
                ),
              })
            }
          >
            Select all
          </Button>
          <Button
            onClick={() => setDraft({ ...draft, permissions: createEmptyPermissions() })}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-3 max-h-[46vh] space-y-4 overflow-y-auto pr-1">
        {groupedModules.map(({ group, modules }) => (
          <div key={group} className="rounded-lg border border-border">
            <div className="border-b border-border bg-muted/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </div>
            <div className="divide-y divide-border">
              {modules.map((module) => {
                const permission = draft.permissions[module.route] ?? "none";
                return (
                  <div key={module.route} className="flex items-center gap-3 px-4 py-2.5">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={permission !== "none"}
                        onChange={(event) =>
                          setPermission(module.route, event.target.checked ? "full" : "none")
                        }
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="text-xs font-medium">{module.label}</span>
                    </label>
                    {permission !== "none" && (
                      <Select
                        value={permission === "read" ? "read" : "full"}
                        onChange={(event) =>
                          setPermission(
                            module.route,
                            event.target.value === "read" ? "read" : "full",
                          )
                        }
                        fieldSize="compact"
                        className="h-7 w-auto min-w-[4.5rem] text-[10px] font-medium uppercase tracking-wider"
                        aria-label={`${module.label} access level`}
                      >
                        <option value="full">Full</option>
                        <option value="read">Read</option>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function makeRoleDraft(role: AccessRole | null): AccessRole {
  return (
    role ?? {
      id: nextId("ROL"),
      name: "",
      scope: "",
      description: "",
      permissions: createEmptyPermissions(),
    }
  );
}

function AccessAssigneeEditor({
  open,
  assignee,
  roles,
  defaultRoleId,
  onClose,
  onSaved,
}: {
  open: boolean;
  assignee: AccessAssignee | null;
  roles: AccessRole[];
  defaultRoleId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [linkedTeacherId, setLinkedTeacherId] = useState("");
  const [assignedSectionKeys, setAssignedSectionKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(assignee?.name ?? "");
    setEmail(assignee?.email ?? "");
    setMobile(assignee?.phone ?? "");
    setPassword(assignee?.password ?? "");
    setShowPassword(false);
    setRoleId(assignee?.roleId ?? defaultRoleId ?? roles[0]?.id ?? "");
    setLinkedTeacherId(assignee?.linkedPersonId ?? "");
    setAssignedSectionKeys(assignee?.assignedSectionKeys ?? []);
    setError(null);
  }, [open, assignee, defaultRoleId, roles]);

  const isAttendanceCoordinatorRole = roleId === ATTENDANCE_COORDINATOR_ROLE_ID;

  const handleSave = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const validEmail = !cleanEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    const validMobile = !cleanMobile || /^\d{10}$/.test(cleanMobile);
    if (
      !name.trim() ||
      (!cleanEmail && !cleanMobile) ||
      !validEmail ||
      !validMobile ||
      password.length < 8 ||
      !roleId ||
      (!isAttendanceCoordinatorRole && !linkedTeacherId)
    ) {
      setError(
        isAttendanceCoordinatorRole
          ? "Enter a name plus email and/or 10-digit mobile. Password must be at least 8 characters."
          : "Select a teacher and enter an email, an exact 10-digit mobile number, or both. Password must be at least 8 characters.",
      );
      return;
    }
    if (isAttendanceCoordinatorRole && assignedSectionKeys.length === 0) {
      setError("Assign at least one class · section for the Attendance Coordinator.");
      return;
    }
    const now = new Date().toISOString();
    try {
      saveAccessAssignee({
        id: assignee?.id ?? nextId("ADM"),
        name: name.trim(),
        email: cleanEmail || undefined,
        phone: cleanMobile || undefined,
        password,
        roleId,
        linkedPersonId: linkedTeacherId || undefined,
        linkedPersonType: linkedTeacherId ? "teacher" : undefined,
        status: assignee?.status ?? "active",
        createdAt: assignee?.createdAt ?? now,
        updatedAt: now,
        assignedSectionKeys: isAttendanceCoordinatorRole ? assignedSectionKeys : [],
      });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save user access.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignee ? "Change teacher assignment" : "Assign teacher to role"}
      subtitle="Add email, 10-digit mobile, or both; OTP follows the identity used at login"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <Check className="size-3.5" /> {assignee ? "Save changes" : "Assign teacher"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teacher" required={!isAttendanceCoordinatorRole} hint="Selecting a teacher fills name, email, and mobile">
          <Select
            value={linkedTeacherId}
            onChange={(event) => {
              const teacherId = event.target.value;
              const teacher = SEARCH_TEACHERS.find((item) => item.id === teacherId);
              setLinkedTeacherId(teacherId);
              if (teacher) {
                setName(teacher.name);
                setEmail(teacher.email);
                setMobile(teacher.phone);
              }
            }}
          >
            <option value="">
              {isAttendanceCoordinatorRole ? "Optional · select teacher" : "Select teacher"}
            </option>
            {SEARCH_TEACHERS.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} · {teacher.dept}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Person name" required hint="Auto-filled · editable">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Role" required>
          <Select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email address" hint="Auto-filled · editable · optional if mobile is set">
          <TextInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teacher@institute.edu"
          />
        </Field>
        <Field
          label="10-digit mobile number"
          hint="Auto-filled · editable · optional if email is set"
        >
          <TextInput
            value={mobile}
            onChange={(event) =>
              setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="9876543210"
            inputMode="numeric"
            maxLength={10}
          />
        </Field>
        <Field
          label={assignee ? "Password" : "Admin-set password"}
          hint="Admin can always view and change this password"
          required
        >
          <div className="relative">
            <TextInput
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </Field>
      </div>
      {isAttendanceCoordinatorRole ? (
        <div className="mt-4">
          <ClassSectionAudienceField
            scope="selected"
            selectedKeys={assignedSectionKeys}
            onScopeChange={() => {
              /* Attendance Coordinator is always assigned-scope */
            }}
            onSelectedKeysChange={setAssignedSectionKeys}
            options={getAttendanceClassSectionOptions()}
            required
            hint="Coordinator can open Student Attendance only for these class · sections"
          />
        </div>
      ) : null}
      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="mt-5 rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
        If both email and mobile exist, the teacher may enter either one. The OTP is sent to the
        email or mobile they entered, then only the selected role modules become available.
      </div>
    </Modal>
  );
}

function AdminPasswordReveal({ password }: { password: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1">
      <span className="truncate font-mono text-[11px]">
        {visible ? password || "—" : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      </button>
    </div>
  );
}
