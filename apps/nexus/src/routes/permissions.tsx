import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, TextInput, TextArea } from "@lumenx/ui-admin";
import { Plus, Shield, Edit3, Trash2, Copy, Save, Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/permissions")({
  head: () => ({ meta: [{ title: "Permissions — LumenX Nexus" }] }),
  component: PermissionsPage,
});

const MODULES = [
  "Students", "Teachers", "Parents", "Attendance", "Timetable",
  "Exams", "Complaints", "Notifications", "Events", "Storage", "Analytics",
] as const;
type Module = typeof MODULES[number];
type Perm = "full" | "read" | "none";

type Role = {
  id: string;
  name: string;
  scope: string;
  description?: string;
  users: number;
  perms: Record<Module, Perm>;
  system?: boolean;
};

const mkPerms = (preset: Partial<Record<Module, Perm>> = {}, fallback: Perm = "none"): Record<Module, Perm> =>
  Object.fromEntries(MODULES.map((m) => [m, preset[m] ?? fallback])) as Record<Module, Perm>;

const initial: Role[] = [
  { id: "ROL-001", name: "Principal · Root", scope: "All branches", users: 1, system: true,
    description: "Unrestricted operational access across all modules and branches.",
    perms: mkPerms({}, "full") },
  { id: "ROL-002", name: "Vice Principal", scope: "Branch Alpha", users: 2,
    description: "Branch-level operational override with analytics read.",
    perms: mkPerms({ Storage: "read", Analytics: "full" }, "full") },
  { id: "ROL-003", name: "Coordinator (Senior)", scope: "Grades 9–12", users: 4,
    perms: mkPerms({ Students: "full", Teachers: "read", Attendance: "full", Timetable: "full", Exams: "full", Complaints: "none", Notifications: "full", Events: "full", Storage: "none", Analytics: "read" }) },
  { id: "ROL-004", name: "Department Head", scope: "Mathematics", users: 6,
    perms: mkPerms({ Students: "read", Teachers: "full", Attendance: "read", Timetable: "full", Exams: "full", Analytics: "read" }) },
  { id: "ROL-005", name: "Front Office", scope: "Reception", users: 3,
    perms: mkPerms({ Students: "read", Teachers: "read", Parents: "read", Attendance: "read", Timetable: "read" }) },
];

const dot = {
  full: "bg-success",
  read: "bg-warning",
  none: "bg-muted border border-border",
} as const;

function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(() => roles.find((r) => r.id === editingId) ?? null, [roles, editingId]);

  const handleSave = (role: Role) => {
    setRoles((prev) => {
      const exists = prev.some((r) => r.id === role.id);
      return exists ? prev.map((r) => (r.id === role.id ? role : r)) : [...prev, role];
    });
    setOpenCreate(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDuplicate = (r: Role) => {
    const copy: Role = { ...r, id: `ROL-${String(Date.now()).slice(-4)}`, name: `${r.name} (copy)`, users: 0, system: false };
    setRoles((prev) => [...prev, copy]);
  };

  return (
    <AppShell title="Access & Permissions" subtitle="IAM-style role delegation across modules and branches"
      actions={<Button variant="primary" onClick={() => setOpenCreate(true)}><Plus className="size-3.5" /> New Role</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total roles", v: String(roles.length) },
          { l: "Active admins", v: String(roles.reduce((s, r) => s + r.users, 0)) },
          { l: "Modules governed", v: String(MODULES.length) },
          { l: "Custom roles", v: String(roles.filter((r) => !r.system).length) },
        ].map((s) => (
          <Card key={s.l} className="p-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{s.v}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Role Matrix" hint="Green = full · Amber = read-only · Gray = no access"
          action={<div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Shield className="size-3" /> {roles.reduce((s, r) => s + r.users, 0)} admins</div>} />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-background/40">
                <th className="px-5 py-3 sticky left-0 bg-background/95 backdrop-blur-sm">Role</th>
                <th className="px-3 py-3">Users</th>
                {MODULES.map((m) => <th key={m} className="px-3 py-3 text-center whitespace-nowrap">{m}</th>)}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3 sticky left-0 bg-surface">
                    <div className="text-xs font-medium flex items-center gap-2">
                      {r.name}
                      {r.system && <Pill tone="info">System</Pill>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{r.scope}</div>
                  </td>
                  <td className="px-3 py-3"><Pill tone="info">{r.users}</Pill></td>
                  {MODULES.map((m) => (
                    <td key={m} className="px-3 py-3 text-center">
                      <span className={`inline-block size-2.5 rounded-full ${dot[r.perms[m]]}`} />
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleDuplicate(r)} title="Duplicate"
                        className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground"><Copy className="size-3.5" /></button>
                      <button onClick={() => setEditingId(r.id)} title="Edit"
                        className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground"><Edit3 className="size-3.5" /></button>
                      {!r.system && (
                        <button onClick={() => handleDelete(r.id)} title="Delete"
                          className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-destructive"><Trash2 className="size-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <RoleEditor
        open={openCreate || editing !== null}
        role={editing}
        onClose={() => { setOpenCreate(false); setEditingId(null); }}
        onSave={handleSave}
      />
    </AppShell>
  );
}

function RoleEditor({ open, role, onClose, onSave }: {
  open: boolean; role: Role | null; onClose: () => void; onSave: (r: Role) => void;
}) {
  const [draft, setDraft] = useState<Role>(role ?? {
    id: `ROL-${String(Date.now()).slice(-4)}`,
    name: "", scope: "", description: "", users: 0,
    perms: mkPerms(),
  });

  // re-seed when role changes
  useMemo(() => {
    if (role) setDraft(role);
    else setDraft({
      id: `ROL-${String(Date.now()).slice(-4)}`,
      name: "", scope: "", description: "", users: 0,
      perms: mkPerms(),
    });
  }, [role]);

  const setPerm = (m: Module, p: Perm) => setDraft((d) => ({ ...d, perms: { ...d.perms, [m]: p } }));
  const setAll = (p: Perm) => setDraft((d) => ({ ...d, perms: mkPerms({}, p) }));

  return (
    <Modal open={open} onClose={onClose}
      title={role ? "Edit role" : "Create new role"}
      subtitle="Define name, scope, and per-module access matrix"
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => draft.name && onSave(draft)}>
            <Save className="size-3.5" /> {role ? "Save changes" : "Create role"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Role name" required>
          <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Examination Officer" />
        </Field>
        <Field label="Scope" hint="Branch, grade range, or department">
          <TextInput value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })} placeholder="Branch Alpha · Grades 9–12" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <TextArea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What this role is responsible for and any operational notes…" />
          </Field>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold">Permission matrix</div>
            <div className="text-[11px] text-muted-foreground">Set access per module. You can quick-fill with the presets below.</div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setAll("full")}>All full</Button>
            <Button onClick={() => setAll("read")}>All read</Button>
            <Button onClick={() => setAll("none")}>Clear</Button>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] bg-background/60 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <span>Module</span>
            <span className="px-3 hidden sm:block">No access</span>
            <span className="px-3 hidden sm:block">Read</span>
            <span className="px-3">Full</span>
          </div>
          <div className="divide-y divide-border">
            {MODULES.map((m) => (
              <div key={m} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] items-center px-4 py-2.5 hover:bg-surface-hover">
                <div className="text-xs font-medium">{m}</div>
                {(["none", "read", "full"] as Perm[]).map((p) => (
                  <label key={p} className={`flex items-center justify-center px-3 cursor-pointer ${p === "none" ? "hidden sm:flex" : ""} ${p === "read" ? "hidden sm:flex" : ""}`}>
                    <input type="radio" name={`m-${m}`} checked={draft.perms[m] === p} onChange={() => setPerm(m, p)} className="sr-only peer" />
                    <span className={`size-5 rounded-full border-2 flex items-center justify-center transition-all
                      ${draft.perms[m] === p
                        ? p === "full" ? "border-success bg-success/15" : p === "read" ? "border-warning bg-warning/15" : "border-muted-foreground/50 bg-muted"
                        : "border-border"}`}>
                      {draft.perms[m] === p && <span className={`size-2 rounded-full ${p === "full" ? "bg-success" : p === "read" ? "bg-warning" : "bg-muted-foreground"}`} />}
                    </span>
                  </label>
                ))}
                {/* mobile fallback: dropdown */}
                <select value={draft.perms[m]} onChange={(e) => setPerm(m, e.target.value as Perm)}
                  className="sm:hidden h-8 px-2 rounded-md bg-background border border-border text-[11px]">
                  <option value="none">None</option><option value="read">Read</option><option value="full">Full</option>
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /> Full · create / edit / delete</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> Read · view only</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground" /> None · hidden in sidebar</span>
        </div>
      </div>

      <div className="mt-5 p-3.5 rounded-lg border border-border bg-background/40 flex items-center gap-3">
        <UsersIcon className="size-4 text-muted-foreground" />
        <div className="text-[11px] text-muted-foreground flex-1">Assign users to this role from the <span className="text-foreground font-medium">Accounts & Access</span> page after saving.</div>
      </div>
    </Modal>
  );
}
