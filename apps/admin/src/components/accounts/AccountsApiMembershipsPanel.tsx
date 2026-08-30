import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  Modal,
  Pill,
  Select,
  TextInput,
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  collectMembershipCandidates,
  createMembership,
  deleteMembership,
  loadMembershipsList,
  loadRolesCatalog,
  resolveMembershipsListView,
  shouldCommitIdentityLoad,
  toggleRoleCode,
  updateMembership,
  type IdentityListStatus,
  type MembershipCandidate,
  type MembershipListItem,
  type MembershipStatus,
  type RoleCatalogItem,
} from "@/lib/identity";
import { listStudents } from "@/lib/students/api";
import { listTeachers } from "@/lib/teachers/api";
import { KeyRound, Plus, ShieldOff, Users } from "lucide-react";

function listHint(status: IdentityListStatus, error: string | null): string {
  if (status === "loading") return "Loading memberships…";
  if (status === "needs_institute") return "Select an institute to load memberships.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load memberships.";
  if (status === "empty") return "No memberships found for this institute.";
  return "";
}

const STATUS_OPTIONS: MembershipStatus[] = [
  "active",
  "invited",
  "suspended",
  "ended",
];

function statusTone(status: MembershipStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "invited") return "warning";
  if (status === "suspended") return "danger";
  return "neutral";
}

function RoleChecklist({
  catalog,
  selected,
  onChange,
}: {
  catalog: RoleCatalogItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (catalog.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Role catalog unavailable — cannot assign roles safely.
      </p>
    );
  }
  return (
    <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
      {catalog.map((role) => {
        const checked = selected.includes(role.code);
        return (
          <li key={role.code}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                onChange={() => onChange(toggleRoleCode(selected, role.code))}
              />
              <span className="min-w-0">
                <span className="block font-medium">{role.label}</span>
                <span className="block text-[11px] text-muted-foreground font-mono">
                  {role.code}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function AccountsApiMembershipsPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [items, setItems] = useState<MembershipListItem[]>([]);
  const [listStatus, setListStatus] = useState<IdentityListStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "">("");
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogItem[]>([]);
  const [candidates, setCandidates] = useState<MembershipCandidate[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["institute_admin"]);
  const [inviteStatus, setInviteStatus] = useState<MembershipStatus>("invited");
  const [inviteError, setInviteError] = useState("");
  const [editTarget, setEditTarget] = useState<MembershipListItem | null>(null);
  const [editStatus, setEditStatus] = useState<MembershipStatus>("active");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<MembershipListItem | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    void loadRolesCatalog().then((next) => {
      if (next.status === "ready" || next.status === "empty") {
        setRoleCatalog(next.items);
      }
    });
  }, []);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      setCandidates([]);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      setCandidates([]);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      setCandidates([]);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadMembershipsList(
      requestInstituteId,
      statusFilter ? { status: statusFilter } : undefined,
    ).then((next) => {
      if (
        !shouldCommitIdentityLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });

    void Promise.all([
      listTeachers({ instituteId: requestInstituteId }).catch(() => []),
      listStudents({ instituteId: requestInstituteId }).catch(() => []),
    ]).then(([teachers, students]) => {
      if (
        !shouldCommitIdentityLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setCandidates(
        collectMembershipCandidates({
          teachers,
          students,
          existingUserIds: undefined,
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
    statusFilter,
  ]);

  useEffect(() => {
    setInviteOpen(false);
    setEditTarget(null);
    setPendingDelete(null);
  }, [instituteCtx.activeInstituteId]);

  const view = resolveMembershipsListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: items,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = listHint(view.status, view.errorMessage);
  const displayItems = view.rowsValid ? view.items : [];
  const existingUserIds = new Set(displayItems.map((r) => r.userId));
  const inviteCandidates = candidates.filter((c) => !existingUserIds.has(c.userId));

  const submitInvite = () => {
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before attaching a member");
      return;
    }
    if (!userId.trim()) {
      setInviteError("User profile ID is required.");
      return;
    }
    if (selectedRoles.length === 0) {
      setInviteError("Select at least one catalog role.");
      return;
    }
    setInviteError("");
    void createMembership({
      instituteId,
      userId: userId.trim(),
      roles: selectedRoles,
      status: inviteStatus,
    })
      .then(() => {
        setInviteOpen(false);
        setUserId("");
        setSelectedRoles(["institute_admin"]);
        setInviteStatus("invited");
        setReloadKey((k) => k + 1);
        notify("Membership created");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create membership");
      });
  };

  const submitUpdate = () => {
    if (!editTarget) return;
    if (editRoles.length === 0) {
      notify("Select at least one catalog role");
      return;
    }
    void updateMembership(editTarget.id, {
      status: editStatus,
      roles: editRoles,
    })
      .then(() => {
        setEditTarget(null);
        setReloadKey((k) => k + 1);
        notify("Membership updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update membership");
      });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    void deleteMembership(pendingDelete.id)
      .then(() => {
        setPendingDelete(null);
        setReloadKey((k) => k + 1);
        notify("Membership removed");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete membership");
      });
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card>
          <EmptyState
            icon={<KeyRound className="size-5" />}
            title="Auth account provisioning"
            hint="Creating login identities / temp passwords requires Supabase Auth admin APIs not exposed here. Attach an existing user_profile UUID only."
          />
        </Card>
        <Card>
          <EmptyState
            icon={<ShieldOff className="size-5" />}
            title="Email invite tokens"
            hint="No invitation table or email delivery API. Status invited only marks membership state — it does not send mail."
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Institute memberships"
          hint="GET/POST/PATCH/DELETE /memberships · roles from frozen catalog"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter((e.target.value || "") as MembershipStatus | "")
                }
                className="h-8 min-w-[8rem] text-xs"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              {writesEnabled ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setInviteError("");
                    setInviteOpen(true);
                  }}
                >
                  <Plus className="size-3.5" /> Attach member
                </Button>
              ) : null}
            </div>
          }
        />
        {hint && view.status !== "ready" ? (
          <EmptyState icon={<Users className="size-5" />} title="Memberships" hint={hint} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Status</Th>
                <Th>Roles</Th>
                <Th>Joined</Th>
                {writesEnabled ? (
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <Td>
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No memberships{statusFilter ? ` with status ${statusFilter}` : ""}.
                    </p>
                  </Td>
                </tr>
              ) : (
                displayItems.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <span className="block text-sm font-medium">{row.identityLabel}</span>
                      <span className="block text-[11px] text-muted-foreground font-mono">
                        {row.userId}
                      </span>
                      {row.email && row.identityLabel !== row.email ? (
                        <span className="block text-[11px] text-muted-foreground">{row.email}</span>
                      ) : null}
                    </Td>
                    <Td>
                      <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                    </Td>
                    <Td>{row.rolesLabel || "—"}</Td>
                    <Td mono>{new Date(row.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      {writesEnabled ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                            onClick={() => {
                              setEditTarget(row);
                              setEditStatus(row.status);
                              setEditRoles([...row.roles]);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                            onClick={() => setPendingDelete(row)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={writesEnabled && inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Attach existing user"
        subtitle="Requires an existing user_profile (Auth user). Does not create logins."
        footer={
          <>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitInvite}>
              Create membership
            </Button>
          </>
        }
      >
        {inviteError ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {inviteError}
          </div>
        ) : null}
        <div className="grid gap-4">
          {inviteCandidates.length > 0 ? (
            <Field
              label="Linked people"
              hint="Teachers/students that already have a user_profile_id"
            >
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) setUserId(e.target.value);
                }}
              >
                <option value="">Select a linked profile…</option>
                {inviteCandidates.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="User profile ID" required hint="UUID of an existing user_profile">
            <TextInput
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </Field>
          <Field label="Roles" required hint="Assignable codes from GET /roles">
            <RoleChecklist
              catalog={roleCatalog}
              selected={selectedRoles}
              onChange={setSelectedRoles}
            />
          </Field>
          <Field label="Status">
            <Select
              value={inviteStatus}
              onChange={(e) => setInviteStatus(e.target.value as MembershipStatus)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={writesEnabled && editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Update membership"
        subtitle={editTarget ? editTarget.identityLabel : undefined}
        footer={
          <>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitUpdate}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Status">
            <Select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as MembershipStatus)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Roles" required>
            <RoleChecklist
              catalog={roleCatalog}
              selected={editRoles}
              onChange={setEditRoles}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={writesEnabled && pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Remove membership?"
        subtitle={
          pendingDelete
            ? `Remove ${pendingDelete.identityLabel} from this institute?`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          Soft-deletes the membership (status ended). Does not delete the Auth user or profile.
        </p>
      </Modal>
    </>
  );
}
