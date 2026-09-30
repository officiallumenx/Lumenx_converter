import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  deleteMembership,
  loadRolesCatalog,
  resolveMembershipsListView,
  toggleRoleCode,
  updateMembership,
  type IdentityListStatus,
  type MembershipListItem,
  type MembershipStatus,
  type RoleCatalogItem,
} from "@/lib/identity";
import { Users } from "lucide-react";
import {
  useAccountsMembershipsQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";

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
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "">("");
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogItem[]>([]);
  const [editTarget, setEditTarget] = useState<MembershipListItem | null>(null);
  const [editStatus, setEditStatus] = useState<MembershipStatus>("active");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<MembershipListItem | null>(null);

  const listEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const membershipsQuery = useAccountsMembershipsQuery(
    instituteCtx.activeInstituteId,
    statusFilter,
    listEnabled,
  );

  const items = membershipsQuery.data?.items ?? [];
  const listStatus: IdentityListStatus =
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
            : membershipsQuery.isLoading && !membershipsQuery.data
              ? "loading"
              : (membershipsQuery.data?.status ?? "loading");
  const listError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (membershipsQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    membershipsQuery.data && listEnabled ? instituteCtx.activeInstituteId : null;

  useEffect(() => {
    void loadRolesCatalog().then((next) => {
      if (next.status === "ready" || next.status === "empty") {
        setRoleCatalog(next.items);
      }
    });
  }, []);

  useEffect(() => {
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

  const invalidateAccounts = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.accounts),
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
        invalidateAccounts();
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
        invalidateAccounts();
        notify("Membership removed");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete membership");
      });
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Institute memberships"
          hint="Institute memberships and roles"
          action={
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
                      {row.email ? (
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
