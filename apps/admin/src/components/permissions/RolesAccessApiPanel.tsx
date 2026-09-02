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
  EmptyState,
  Field,
  Modal,
  Pill,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { ClassSectionAudienceField } from "@/components/ClassSectionMultiPicker";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listTeachers } from "@/lib/teachers/api";
import { listStaffAccounts } from "@/lib/staff/api";
import { loadAttendanceCoordinatorSectionOptions } from "@/lib/access-roles/attendance-section-options";
import { isAttendanceCoordinatorRole } from "@/lib/access-roles/system-keys";
import {
  ACCESS_MODULES,
  createEmptyPermissions,
  type AccessPermission,
} from "@/lib/roles-access";
import {
  createAccessAssignee,
  createAccessRole,
  deleteAccessAssignee,
  deleteAccessRole,
  listAccessAssignees,
  listAccessRoles,
  updateAccessAssignee,
  updateAccessRole,
  type AccessAssigneeDto,
  type AccessRoleDto,
} from "@/lib/access-roles";

const groupedModules = Array.from(new Set(ACCESS_MODULES.map((m) => m.group))).map(
  (group) => ({
    group,
    modules: ACCESS_MODULES.filter((m) => m.group === group),
  }),
);

type TeacherOption = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
};

type StaffOption = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  department: string;
};

export function RolesAccessApiPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [roles, setRoles] = useState<AccessRoleDto[]>([]);
  const [assignees, setAssignees] = useState<AccessAssigneeDto[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessRoleDto | null>(null);
  const [assigneeEditorOpen, setAssigneeEditorOpen] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState<AccessAssigneeDto | null>(null);
  const [assignmentRoleId, setAssignmentRoleId] = useState<string | null>(null);
  const [managingRole, setManagingRole] = useState<AccessRoleDto | null>(null);

  const instituteId = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (!instituteId || instituteCtx.status === "loading") {
      setRoles([]);
      setAssignees([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      listAccessRoles(instituteId),
      listAccessAssignees(instituteId),
      listTeachers({ instituteId }).catch(() => []),
      listStaffAccounts({ instituteId }).catch(() => []),
    ])
      .then(([nextRoles, nextAssignees, nextTeachers, nextStaff]) => {
        if (cancelled) return;
        setRoles(nextRoles);
        setAssignees(nextAssignees);
        setTeachers(
          nextTeachers.map((t) => ({
            id: t.id,
            displayName: t.displayName,
            email: t.email,
            phone: t.phone,
          })),
        );
        setStaffAccounts(
          nextStaff.map((s) => ({
            id: s.id,
            displayName: s.displayName,
            email: s.email,
            phone: s.phone,
            department: s.department,
          })),
        );
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Failed to load access roles");
        setRoles([]);
        setAssignees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId, instituteCtx.status, reloadKey]);

  const assignedCount = (roleId: string) =>
    assignees.filter((a) => a.accessRoleId === roleId).length;

  if (!instituteId) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-5" />}
        title="Select an institute"
        hint="Choose an institute to manage custom roles and staff assignments."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {loading
            ? "Loading roles…"
            : error
              ? error
              : `${roles.length} roles · ${assignees.length} assigned users`}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!writesEnabled}
            onClick={() => {
              setEditingAssignee(null);
              setAssignmentRoleId(roles[0]?.id ?? null);
              setAssigneeEditorOpen(true);
            }}
          >
            <UserPlus className="size-3.5" /> Assign teacher / staff
          </Button>
          <Button
            variant="primary"
            disabled={!writesEnabled}
            onClick={() => {
              setEditingRole(null);
              setRoleEditorOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Create role
          </Button>
        </div>
      </div>

      <div className="lx-kpi-grid">
        {[
          { label: "Roles", value: roles.length },
          { label: "Assigned users", value: assignees.length },
          {
            label: "Active users",
            value: assignees.filter((a) => a.membershipStatus === "active").length,
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
          hint="Custom ACL (full / read / none) per Admin module. System roles are seeded and editable."
          action={<ShieldCheck className="size-4 text-muted-foreground" />}
        />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const selected = Object.values(role.permissions).filter((p) => p !== "none").length;
            return (
              <div key={role.id} className="rounded-xl border border-border bg-background/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{role.name}</h3>
                      {role.isSystem && <Pill tone="info">System</Pill>}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{role.scope || "—"}</p>
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
                      disabled={!writesEnabled}
                      onClick={async () => {
                        try {
                          await createAccessRole({
                            instituteId,
                            name: `${role.name} (copy)`,
                            scope: role.scope,
                            description: role.description,
                            permissions: role.permissions,
                          });
                          notify("Role duplicated");
                          setReloadKey((k) => k + 1);
                        } catch (reason) {
                          notify(
                            reason instanceof Error ? reason.message : "Unable to duplicate role",
                          );
                        }
                      }}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover disabled:opacity-40"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Edit role"
                      disabled={!writesEnabled}
                      onClick={() => {
                        setEditingRole(role);
                        setRoleEditorOpen(true);
                      }}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover disabled:opacity-40"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        title="Delete role"
                        disabled={!writesEnabled}
                        onClick={async () => {
                          try {
                            await deleteAccessRole(role.id);
                            notify("Role deleted");
                            setReloadKey((k) => k + 1);
                          } catch (reason) {
                            notify(
                              reason instanceof Error
                                ? reason.message
                                : "Unable to delete role",
                            );
                          }
                        }}
                        className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Manage assigned teachers"
                    disabled={!writesEnabled}
                    onClick={() => setManagingRole(role)}
                    className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40"
                  >
                    <UserPlus className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && roles.length === 0 && (
            <div className="col-span-full px-2 py-8 text-center text-xs text-muted-foreground">
              No roles yet.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Assigned teachers & staff"
          hint="Login every session: institute · email or mobile · OTP · password"
          action={<Users className="size-4 text-muted-foreground" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
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
                const role = roles.find((r) => r.id === assignee.accessRoleId);
                const linkedTeacher = teachers.find((t) => t.id === assignee.linkedTeacherId);
                const linkedStaff = staffAccounts.find((s) => s.id === assignee.linkedStaffId);
                const linked =
                  linkedTeacher?.displayName ??
                  linkedStaff?.displayName ??
                  (assignee.linkedPersonType === "staff" ? "Staff directory" : "Not linked");
                return (
                  <tr key={assignee.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium">{assignee.displayName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {assignee.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {assignee.email && <div>{assignee.email}</div>}
                      {assignee.phone && (
                        <div className="text-muted-foreground">{assignee.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ApiPasswordManagedHint
                        onEdit={() => {
                          setEditingAssignee(assignee);
                          setAssigneeEditorOpen(true);
                        }}
                        disabled={!writesEnabled}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>{assignee.accessRoleName}</div>
                      {role && isAttendanceCoordinatorRole(role) ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {assignee.assignedSectionKeys.length === 0
                            ? "No classes assigned"
                            : `${assignee.assignedSectionKeys.length} class · section assigned`}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{linked}</td>
                    <td className="px-4 py-3">
                      <Pill
                        tone={
                          assignee.membershipStatus === "active"
                            ? "success"
                            : assignee.membershipStatus === "suspended"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {assignee.membershipStatus}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          disabled={!writesEnabled}
                          onClick={async () => {
                            try {
                              await updateAccessAssignee(assignee.id, {
                                membershipStatus:
                                  assignee.membershipStatus === "active"
                                    ? "suspended"
                                    : "active",
                              });
                              notify(
                                assignee.membershipStatus === "active"
                                  ? "User suspended"
                                  : "User activated",
                              );
                              setReloadKey((k) => k + 1);
                            } catch (reason) {
                              notify(
                                reason instanceof Error
                                  ? reason.message
                                  : "Unable to update status",
                              );
                            }
                          }}
                        >
                          {assignee.membershipStatus === "active" ? "Suspend" : "Activate"}
                        </Button>
                        <button
                          type="button"
                          title="Edit login or role"
                          disabled={!writesEnabled}
                          onClick={() => {
                            setEditingAssignee(assignee);
                            setAssigneeEditorOpen(true);
                          }}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover disabled:opacity-40"
                        >
                          <KeyRound className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Remove assignment"
                          disabled={!writesEnabled}
                          onClick={async () => {
                            try {
                              await deleteAccessAssignee(assignee.id);
                              notify("Assignment removed");
                              setReloadKey((k) => k + 1);
                            } catch (reason) {
                              notify(
                                reason instanceof Error
                                  ? reason.message
                                  : "Unable to remove assignment",
                              );
                            }
                          }}
                          className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assignees.length === 0 && !loading && (
            <div className="px-5 py-10 text-center">
              <UserPlus className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No teachers or staff assigned yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign an existing teacher and set their Admin password.
              </p>
            </div>
          )}
        </div>
      </Card>

      <ApiRoleEditor
        open={roleEditorOpen}
        role={editingRole}
        onClose={() => setRoleEditorOpen(false)}
        onSave={async (draft) => {
          if (editingRole) {
            await updateAccessRole(editingRole.id, draft);
            notify("Role updated");
          } else {
            await createAccessRole({ instituteId, ...draft });
            notify("Role created");
          }
          setRoleEditorOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
      <ApiAssigneeEditor
        open={assigneeEditorOpen}
        assignee={editingAssignee}
        roles={roles}
        teachers={teachers}
        staffAccounts={staffAccounts}
        instituteId={instituteId}
        defaultRoleId={assignmentRoleId}
        onClose={() => setAssigneeEditorOpen(false)}
        onSave={async (draft) => {
          if (editingAssignee) {
            await updateAccessAssignee(editingAssignee.id, {
              accessRoleId: draft.accessRoleId,
              password: draft.password || undefined,
              displayName: draft.displayName,
              email: draft.email,
              phone: draft.phone,
              assignedSectionKeys: draft.assignedSectionKeys,
            });
            notify("Assignment updated");
          } else {
            await createAccessAssignee({
              instituteId,
              accessRoleId: draft.accessRoleId,
              password: draft.password,
              displayName: draft.displayName,
              email: draft.email,
              phone: draft.phone,
              linkedTeacherId: draft.linkedTeacherId,
              linkedStaffId: draft.linkedStaffId,
              assignedSectionKeys: draft.assignedSectionKeys,
            });
            notify("User assigned");
          }
          setAssigneeEditorOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
      <ApiRoleTeacherManager
        role={managingRole}
        assignees={assignees.filter((a) => a.accessRoleId === managingRole?.id)}
        teachers={teachers}
        staffAccounts={staffAccounts}
        onClose={() => setManagingRole(null)}
        onAdd={() => {
          if (!managingRole) return;
          setAssignmentRoleId(managingRole.id);
          setEditingAssignee(null);
          setManagingRole(null);
          setAssigneeEditorOpen(true);
        }}
        onEdit={(assignee) => {
          setAssignmentRoleId(assignee.accessRoleId);
          setEditingAssignee(assignee);
          setManagingRole(null);
          setAssigneeEditorOpen(true);
        }}
      />
    </div>
  );
}

function ApiPasswordManagedHint({
  onEdit,
  disabled,
}: {
  onEdit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1">
      <span className="truncate font-mono text-[11px] text-muted-foreground">••••••••</span>
      <button
        type="button"
        title="Change password"
        disabled={disabled}
        onClick={onEdit}
        className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
        aria-label="Change password"
      >
        <KeyRound className="size-3" />
      </button>
    </div>
  );
}

function ApiRoleEditor({
  open,
  role,
  onClose,
  onSave,
}: {
  open: boolean;
  role: AccessRoleDto | null;
  onClose: () => void;
  onSave: (draft: {
    name: string;
    scope: string;
    description: string | null;
    permissions: Record<string, AccessPermission>;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState(createEmptyPermissions());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setScope(role?.scope ?? "");
    setDescription(role?.description ?? "");
    setPermissions(role?.permissions ?? createEmptyPermissions());
    setError(null);
  }, [open, role]);

  const selectedCount = Object.values(permissions).filter((p) => p !== "none").length;

  const setPermission = (route: string, permission: AccessPermission) => {
    setPermissions((current) => ({ ...current, [route]: permission }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? "Edit role" : "Create role"}
      subtitle="Name the role and select Admin modules it can open"
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim() || selectedCount === 0 || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onSave({
                  name: name.trim(),
                  scope: scope.trim(),
                  description: description.trim() || null,
                  permissions,
                });
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "Unable to save role");
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save className="size-3.5" /> {role ? "Save changes" : "Create role"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role name" required>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Academics In-charge"
          />
        </Field>
        <Field label="Scope">
          <TextInput
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Institute, department…"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              setPermissions(
                Object.fromEntries(ACCESS_MODULES.map((m) => [m.route, "full" as const])),
              )
            }
          >
            Select all
          </Button>
          <Button onClick={() => setPermissions(createEmptyPermissions())}>Clear</Button>
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
                const permission = permissions[module.route] ?? "none";
                return (
                  <div key={module.route} className="flex items-center gap-3 px-4 py-2.5">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={permission !== "none"}
                        onChange={(e) =>
                          setPermission(module.route, e.target.checked ? "full" : "none")
                        }
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="text-xs font-medium">{module.label}</span>
                    </label>
                    {permission !== "none" && (
                      <Select
                        value={permission === "read" ? "read" : "full"}
                        onChange={(e) =>
                          setPermission(
                            module.route,
                            e.target.value === "read" ? "read" : "full",
                          )
                        }
                        fieldSize="compact"
                        className="h-7 w-auto min-w-[4.5rem] text-[10px] font-medium uppercase tracking-wider"
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
      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}
    </Modal>
  );
}

function ApiAssigneeEditor({
  open,
  assignee,
  roles,
  teachers,
  staffAccounts,
  instituteId,
  defaultRoleId,
  onClose,
  onSave,
}: {
  open: boolean;
  assignee: AccessAssigneeDto | null;
  roles: AccessRoleDto[];
  teachers: TeacherOption[];
  staffAccounts: StaffOption[];
  instituteId: string;
  defaultRoleId: string | null;
  onClose: () => void;
  onSave: (draft: {
    displayName: string;
    email: string | null;
    phone: string | null;
    password: string;
    accessRoleId: string;
    linkedTeacherId: string | null;
    linkedStaffId: string | null;
    assignedSectionKeys: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [linkedTeacherId, setLinkedTeacherId] = useState("");
  const [linkedStaffId, setLinkedStaffId] = useState("");
  const [assignedSectionKeys, setAssignedSectionKeys] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<
    Array<{ key: string; grade: string; section: string; label: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedRole = roles.find((role) => role.id === roleId);
  const isAttendanceCoordinatorRoleSelected = selectedRole
    ? isAttendanceCoordinatorRole(selectedRole)
    : false;

  useEffect(() => {
    if (!open) return;
    setName(assignee?.displayName ?? "");
    setEmail(assignee?.email ?? "");
    setMobile(assignee?.phone ?? "");
    setPassword("");
    setShowPassword(false);
    setRoleId(assignee?.accessRoleId ?? defaultRoleId ?? roles[0]?.id ?? "");
    setLinkedTeacherId(assignee?.linkedTeacherId ?? "");
    setLinkedStaffId(assignee?.linkedStaffId ?? "");
    setAssignedSectionKeys(assignee?.assignedSectionKeys ?? []);
    setError(null);
  }, [open, assignee, defaultRoleId, roles]);

  useEffect(() => {
    if (!open || !isAttendanceCoordinatorRoleSelected) {
      setSectionOptions([]);
      return;
    }
    let cancelled = false;
    void loadAttendanceCoordinatorSectionOptions(instituteId).then((rows) => {
      if (!cancelled) setSectionOptions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, instituteId, isAttendanceCoordinatorRoleSelected]);

  const teacherOptions = useMemo(() => teachers, [teachers]);
  const staffOptions = useMemo(() => staffAccounts, [staffAccounts]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignee ? "Update assignment" : "Assign teacher to role"}
      subtitle="Link an existing teacher or staff member, set email/mobile and Admin password"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving}
            onClick={async () => {
              const cleanEmail = email.trim().toLowerCase();
              const cleanMobile = mobile.trim();
              if (
                !name.trim() ||
                (!cleanEmail && !cleanMobile) ||
                !roleId ||
                (!assignee && password.length < 8) ||
                (!isAttendanceCoordinatorRoleSelected &&
                  !linkedTeacherId &&
                  !linkedStaffId)
              ) {
                setError(
                  isAttendanceCoordinatorRoleSelected
                    ? "Enter name, email and/or 10-digit mobile, role, and a password (min 8 characters for new users)."
                    : "Select a teacher or staff member and enter email and/or mobile. Password min 8 characters for new users.",
                );
                return;
              }
              if (
                isAttendanceCoordinatorRoleSelected &&
                assignedSectionKeys.length === 0
              ) {
                setError(
                  "Assign at least one class · section for the Attendance Coordinator.",
                );
                return;
              }
              setSaving(true);
              setError(null);
              try {
                await onSave({
                  displayName: name.trim(),
                  email: cleanEmail || null,
                  phone: cleanMobile || null,
                  password,
                  accessRoleId: roleId,
                  linkedTeacherId: linkedTeacherId || null,
                  linkedStaffId: linkedStaffId || null,
                  assignedSectionKeys: isAttendanceCoordinatorRoleSelected
                    ? assignedSectionKeys
                    : [],
                });
              } catch (reason) {
                setError(
                  reason instanceof Error ? reason.message : "Unable to save assignment",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <Check className="size-3.5" /> {assignee ? "Save changes" : "Assign"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Teacher"
          required={!isAttendanceCoordinatorRoleSelected}
          hint="Selecting fills name, email, and mobile"
        >
          <Select
            value={linkedTeacherId}
            onChange={(e) => {
              const id = e.target.value;
              const teacher = teacherOptions.find((t) => t.id === id);
              setLinkedTeacherId(id);
              if (teacher) {
                setLinkedStaffId("");
                setName(teacher.displayName);
                setEmail(teacher.email ?? "");
                setMobile(teacher.phone ?? "");
              }
            }}
            disabled={Boolean(assignee)}
          >
            <option value="">
              {isAttendanceCoordinatorRoleSelected
                ? "Optional · select teacher"
                : "Select teacher"}
            </option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.displayName}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Staff"
          required={!isAttendanceCoordinatorRoleSelected && !linkedTeacherId}
          hint="Non-teaching staff from directory"
        >
          <Select
            value={linkedStaffId}
            onChange={(e) => {
              const id = e.target.value;
              const staff = staffOptions.find((s) => s.id === id);
              setLinkedStaffId(id);
              if (staff) {
                setLinkedTeacherId("");
                setName(staff.displayName);
                setEmail(staff.email ?? "");
                setMobile(staff.phone ?? "");
              }
            }}
            disabled={Boolean(assignee)}
          >
            <option value="">
              {isAttendanceCoordinatorRoleSelected
                ? "Optional · select staff"
                : "Select staff"}
            </option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.displayName} · {staff.department}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Person name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role" required>
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email" hint="Optional if mobile is set">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@institute.edu"
          />
        </Field>
        <Field label="10-digit mobile" hint="Optional if email is set">
          <TextInput
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            inputMode="numeric"
            maxLength={10}
          />
        </Field>
        <Field
          label={assignee ? "New password (optional)" : "Admin-set password"}
          required={!assignee}
        >
          <div className="relative">
            <TextInput
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </Field>
      </div>
      {isAttendanceCoordinatorRoleSelected ? (
        <div className="mt-4">
          <ClassSectionAudienceField
            scope="selected"
            selectedKeys={assignedSectionKeys}
            onScopeChange={() => {
              /* Attendance Coordinator is always assigned-scope */
            }}
            onSelectedKeysChange={setAssignedSectionKeys}
            options={sectionOptions}
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
        If both email and mobile exist, the user may enter either one at login. OTP follows the
        identity used; passwords are stored securely in Auth (not shown after assignment).
      </div>
    </Modal>
  );
}

function ApiRoleTeacherManager({
  role,
  assignees,
  teachers,
  staffAccounts,
  onClose,
  onAdd,
  onEdit,
}: {
  role: AccessRoleDto | null;
  assignees: AccessAssigneeDto[];
  teachers: TeacherOption[];
  staffAccounts: StaffOption[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (assignee: AccessAssigneeDto) => void;
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
          const teacher = teachers.find((t) => t.id === assignee.linkedTeacherId);
          const staff = staffAccounts.find((s) => s.id === assignee.linkedStaffId);
          return (
            <div
              key={assignee.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {assignee.displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{assignee.displayName}</div>
                <div className="text-[10px] text-muted-foreground">
                  {assignee.email ?? assignee.phone ?? "No login identity"}
                  {teacher ? ` · ${teacher.displayName}` : staff ? ` · ${staff.department}` : ""}
                </div>
              </div>
              <Pill
                tone={
                  assignee.membershipStatus === "active"
                    ? "success"
                    : assignee.membershipStatus === "suspended"
                      ? "danger"
                      : "warning"
                }
              >
                {assignee.membershipStatus}
              </Pill>
              <Button onClick={() => onEdit(assignee)}>Edit</Button>
            </div>
          );
        })}
        {assignees.length === 0 && (
          <EmptyState
            icon={<UserPlus className="size-5" />}
            title="No users assigned"
            hint="Add a teacher or staff member to this role."
          />
        )}
      </div>
    </Modal>
  );
}
