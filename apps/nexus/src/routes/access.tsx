import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Kpi,
  Modal,
  PageToolbar,
  Pill,
  SegmentedControl,
  Select,
  TextInput,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { KeyRound, Plus, Shield, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  NEXUS_ACCESS_AREAS,
  assignOperatorRole,
  cyclePerm,
  formatAccessDate,
  getActiveNexusOperatorId,
  getNexusRole,
  inviteNexusOperator,
  labelOperatorStatus,
  labelPerm,
  listNexusOperators,
  listNexusRoles,
  operatorStatusTone,
  permTone,
  platformAccessStats,
  setActiveNexusOperatorId,
  setOperatorStatus,
  setRolePerm,
  subscribePlatformAccess,
  type NexusAccessArea,
  type NexusOperator,
  type NexusPermLevel,
  type NexusRoleDef,
  type NexusRoleId,
} from "@/lib/platform-access-store";

export const Route = createFileRoute("/access")({
  head: () => ({ meta: [{ title: "Platform Access — LumenX Nexus" }] }),
  component: PlatformAccessPage,
});

type Tab = "matrix" | "operators";

const PERM_DOT: Record<NexusPermLevel, string> = {
  full: "bg-success",
  read: "bg-warning",
  none: "bg-muted border border-border",
};

function PlatformAccessPage() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>("matrix");
  const [selectedRoleId, setSelectedRoleId] = useState<NexusRoleId>("operations");
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => subscribePlatformAccess(() => setTick((t) => t + 1)), []);

  const roles = useMemo(() => listNexusRoles(), [tick]);
  const operators = useMemo(() => listNexusOperators(), [tick]);
  const stats = useMemo(() => platformAccessStats(roles, operators), [roles, operators]);
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0]!;

  return (
    <AppShell
      title="Platform Access"
      subtitle="Nexus operator roles & permissions · not institute Admin roles"
      actions={
        <Button variant="primary" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-3.5" /> Invite operator
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Roles" value={String(stats.roles)} icon={<Shield className="size-3.5" />} />
        <Kpi label="Operators" value={String(stats.operators)} icon={<KeyRound className="size-3.5" />} />
        <Kpi label="Active" value={String(stats.active)} tone="up" />
        <Kpi label="Invited" value={String(stats.invited)} />
        <Kpi label="Access areas" value={String(stats.areas)} />
      </div>

      <Card className="mb-4">
        <PageToolbar>
          <ToolbarGroup>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: "matrix", label: "Role matrix" },
                { value: "operators", label: "Operators" },
              ]}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>Demo permissions only · no backend auth</ToolbarMeta>
        </PageToolbar>
      </Card>

      {tab === "matrix" ? (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader title="Nexus roles" hint="Platform-level only" />
            <div className="px-2 pb-3 space-y-1">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`w-full text-left rounded-md px-3 py-2.5 transition-colors ${
                    selectedRole.id === r.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-surface-hover border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{r.name}</span>
                    <Pill tone="neutral">
                      {operators.filter((o) => o.roleId === r.id).length}
                    </Pill>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{r.description}</p>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <p className="text-[10px] text-muted-foreground leading-relaxed rounded-md border border-border bg-muted/20 px-3 py-2">
                Not included: Principal, Vice Principal, Front Office, teachers — those are Admin
                institute roles.
              </p>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-8">
            <CardHeader
              title={`${selectedRole.name} permissions`}
              hint="Click a cell to cycle Full → None → Read (Root is locked)"
              action={
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <i className={`size-2 rounded-full ${PERM_DOT.full}`} /> Full
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className={`size-2 rounded-full ${PERM_DOT.read}`} /> Read
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className={`size-2 rounded-full ${PERM_DOT.none}`} /> None
                  </span>
                </div>
              }
            />
            <RolePermEditor
              role={selectedRole}
              onChange={(area, level) => {
                setRolePerm(selectedRole.id, area, level);
                setTick((t) => t + 1);
              }}
            />
          </Card>

          <Card className="col-span-12">
            <CardHeader title="Full matrix" hint="All Nexus roles × platform areas" />
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold sticky left-0 bg-background/40">Role</th>
                    {NEXUS_ACCESS_AREAS.map((a) => (
                      <th key={a.id} className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-hover">
                      <td className="px-5 py-3 text-xs font-medium sticky left-0 bg-card">{r.name}</td>
                      {NEXUS_ACCESS_AREAS.map((a) => {
                        const level = r.perms[a.id];
                        return (
                          <td key={a.id} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              disabled={r.id === "nexus_root"}
                              title={`${a.label}: ${labelPerm(level)}`}
                              onClick={() => {
                                setRolePerm(r.id, a.id, cyclePerm(level));
                                setTick((t) => t + 1);
                              }}
                              className="inline-flex flex-col items-center gap-1 disabled:cursor-default"
                            >
                              <i className={`size-2.5 rounded-full ${PERM_DOT[level]}`} />
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {labelPerm(level)}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <OperatorsPanel
          operators={operators}
          roles={roles}
          sessionOperatorId={getActiveNexusOperatorId()}
          onAssign={(opId, roleId) => {
            assignOperatorRole(opId, roleId);
            setTick((t) => t + 1);
          }}
          onStatus={(opId, status) => {
            setOperatorStatus(opId, status);
            setTick((t) => t + 1);
          }}
          onUseSession={(opId) => {
            setActiveNexusOperatorId(opId);
            setTick((t) => t + 1);
          }}
        />
      )}

      <InviteOperatorModal
        open={inviteOpen}
        roles={roles}
        onClose={() => setInviteOpen(false)}
        onInvite={(input) => {
          const op = inviteNexusOperator(input);
          if (op) {
            setInviteOpen(false);
            setTab("operators");
            setTick((t) => t + 1);
          }
        }}
      />
    </AppShell>
  );
}

function RolePermEditor({
  role,
  onChange,
}: {
  role: NexusRoleDef;
  onChange: (area: NexusAccessArea, level: NexusPermLevel) => void;
}) {
  const locked = role.id === "nexus_root";
  return (
    <div className="px-5 pb-5 space-y-2">
      {NEXUS_ACCESS_AREAS.map((a) => {
        const level = role.perms[a.id];
        return (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium">{a.label}</div>
              <div className="text-[10px] text-muted-foreground">{a.hint}</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={permTone(level)}>{labelPerm(level)}</Pill>
              {(["full", "read", "none"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={locked}
                  onClick={() => onChange(a.id, opt)}
                  className={`h-7 px-2.5 rounded text-[10px] font-medium border transition-colors disabled:opacity-50 ${
                    level === opt
                      ? "bg-primary/15 border-primary/40 text-foreground"
                      : "border-border text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {labelPerm(opt)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {locked && (
        <p className="text-[10px] text-muted-foreground pt-1">
          Nexus Root always has full access to every platform area.
        </p>
      )}
    </div>
  );
}

function OperatorsPanel({
  operators,
  roles,
  sessionOperatorId,
  onAssign,
  onStatus,
  onUseSession,
}: {
  operators: NexusOperator[];
  roles: NexusRoleDef[];
  sessionOperatorId: string;
  onAssign: (opId: string, roleId: NexusRoleId) => void;
  onStatus: (opId: string, status: NexusOperator["status"]) => void;
  onUseSession: (opId: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Nexus operators"
        hint="Platform accounts only · Use session applies permissions to global search"
        action={<Pill tone="info">{operators.length}</Pill>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
              <th className="px-5 py-3 font-semibold">Operator</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Last active</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {operators.map((op) => {
              const role = getNexusRole(op.roleId);
              const isSession = op.id === sessionOperatorId;
              return (
                <tr key={op.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium">{op.displayName}</div>
                      {isSession ? <Pill tone="info">Session</Pill> : null}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">{op.handle}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Select
                      value={op.roleId}
                      onChange={(e) => onAssign(op.id, e.target.value as NexusRoleId)}
                      className="min-w-[150px]"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                    <div className="text-[10px] text-muted-foreground mt-1">{role?.name}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Pill tone={operatorStatusTone(op.status)}>{labelOperatorStatus(op.status)}</Pill>
                  </td>
                  <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground">
                    {formatAccessDate(op.lastActiveAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {!isSession && op.status === "active" && (
                        <Button onClick={() => onUseSession(op.id)}>Use session</Button>
                      )}
                      {op.status !== "active" && (
                        <Button onClick={() => onStatus(op.id, "active")}>Activate</Button>
                      )}
                      {op.status !== "disabled" && (
                        <Button onClick={() => onStatus(op.id, "disabled")}>Disable</Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function InviteOperatorModal({
  open,
  roles,
  onClose,
  onInvite,
}: {
  open: boolean;
  roles: NexusRoleDef[];
  onClose: () => void;
  onInvite: (input: { handle: string; displayName: string; roleId: NexusRoleId }) => void;
}) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleId, setRoleId] = useState<NexusRoleId>("support");

  useEffect(() => {
    if (open) {
      setHandle("");
      setDisplayName("");
      setRoleId("support");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Invite Nexus operator" size="md">
      <p className="text-[11px] text-muted-foreground mb-4">
        Creates a platform operator account with a Nexus role. This is not an institute Admin user.
      </p>
      <FormGrid>
        <Field label="Display name" className="sm:col-span-2">
          <TextInput
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sam · Support"
          />
        </Field>
        <Field label="Handle">
          <TextInput
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="e.g. support.sam"
          />
        </Field>
        <Field label="Role">
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value as NexusRoleId)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
      <div className="flex justify-end gap-2 mt-5">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => onInvite({ handle, displayName, roleId })}
          disabled={!handle.trim() || !displayName.trim()}
        >
          <Plus className="size-3.5" /> Invite
        </Button>
      </div>
    </Modal>
  );
}
