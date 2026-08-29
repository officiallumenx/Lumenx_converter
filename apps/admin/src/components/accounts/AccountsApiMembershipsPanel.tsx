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
  createMembership,
  deleteMembership,
  loadMembershipsList,
  resolveMembershipsListView,
  shouldCommitIdentityLoad,
  updateMembership,
  type IdentityListStatus,
  type MembershipListItem,
  type MembershipStatus,
} from "@/lib/identity";
import { Plus, Users } from "lucide-react";

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
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [rolesText, setRolesText] = useState("admin");
  const [inviteStatus, setInviteStatus] = useState<MembershipStatus>("invited");
  const [inviteError, setInviteError] = useState("");
  const [editTarget, setEditTarget] = useState<MembershipListItem | null>(null);
  const [editStatus, setEditStatus] = useState<MembershipStatus>("active");
  const [editRolesText, setEditRolesText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MembershipListItem | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
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
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadMembershipsList(requestInstituteId).then((next) => {
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
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
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

  const submitInvite = () => {
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before inviting a member");
      return;
    }
    const roles = rolesText
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
    if (!userId.trim()) {
      setInviteError("User ID is required.");
      return;
    }
    if (roles.length === 0) {
      setInviteError("At least one role is required.");
      return;
    }
    setInviteError("");
    void createMembership({
      instituteId,
      userId: userId.trim(),
      roles,
      status: inviteStatus,
    })
      .then(() => {
        setInviteOpen(false);
        setUserId("");
        setRolesText("admin");
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
    const roles = editRolesText
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
    if (roles.length === 0) {
      notify("At least one role is required");
      return;
    }
    void updateMembership(editTarget.id, {
      status: editStatus,
      roles,
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
        notify("Membership deleted");
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
          hint="From /memberships · invite, update, or remove members"
          action={
            writesEnabled ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setInviteError("");
                  setInviteOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Invite
              </Button>
            ) : undefined
          }
        />
        {hint && view.status !== "ready" ? (
          <EmptyState icon={<Users className="size-5" />} title="Memberships" hint={hint} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>User ID</Th>
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
                    <p className="py-6 text-center text-sm text-muted-foreground col-span-4">
                      No memberships.
                    </p>
                  </Td>
                </tr>
              ) : (
                displayItems.map((row) => (
                  <Tr key={row.id}>
                    <Td mono>{row.userId}</Td>
                    <Td>
                      <Pill tone={row.status === "active" ? "success" : "neutral"}>
                        {row.status}
                      </Pill>
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
                              setEditRolesText(row.roles.join(", "));
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                            onClick={() => setPendingDelete(row)}
                          >
                            Delete
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
        title="Invite membership"
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
          <Field label="User ID" required hint="Existing auth user UUID">
            <TextInput
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </Field>
          <Field label="Roles" required hint="Comma-separated role codes">
            <TextInput
              value={rolesText}
              onChange={(e) => setRolesText(e.target.value)}
              placeholder="admin, teacher"
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
        subtitle={editTarget ? editTarget.userId : undefined}
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
          <Field label="Roles" required hint="Comma-separated role codes">
            <TextInput
              value={editRolesText}
              onChange={(e) => setEditRolesText(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={writesEnabled && pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete membership?"
        subtitle={
          pendingDelete
            ? `Remove membership for ${pendingDelete.userId}?`
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
              Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          The user will lose access to this institute until re-invited.
        </p>
      </Modal>
    </>
  );
}
