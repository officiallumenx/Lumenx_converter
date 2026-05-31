import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, Select, TextInput } from "@/components/ui-kit";
import { Plus, KeyRound, Power, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: "Accounts & Access — LumenX Nexus" }] }),
  component: AccountsPage,
});

const accounts = [
  { id: "ACC-9001", name: "Sarah Jenkins", role: "Teacher", portal: "Faculty", lastLogin: "12 min ago", status: "active", mfa: true },
  { id: "ACC-9002", name: "Aanya Sharma", role: "Student", portal: "Student", lastLogin: "1 h ago", status: "active", mfa: false },
  { id: "ACC-9003", name: "Rohan Sharma", role: "Parent", portal: "Parent", lastLogin: "3 h ago", status: "active", mfa: true },
  { id: "ACC-9004", name: "Mira Draxler", role: "Parent", portal: "Parent", lastLogin: "2 d ago", status: "pending", mfa: false },
  { id: "ACC-9005", name: "Marcus Whitfield", role: "Teacher", portal: "Faculty", lastLogin: "5 h ago", status: "active", mfa: true },
  { id: "ACC-9006", name: "Liang Ortega", role: "Sub-admin", portal: "Admin", lastLogin: "yesterday", status: "active", mfa: true },
  { id: "ACC-9007", name: "Ethan Wright", role: "Student", portal: "Student", lastLogin: "9 d ago", status: "suspended", mfa: false },
];

function AccountsPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "Student" | "Teacher" | "Parent" | "Sub-admin">("all");
  const [open, setOpen] = useState(false);
  const list = accounts.filter((a) => (role === "all" || a.role === role) && (q === "" || a.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <AppShell title="Accounts & Access" subtitle="Manage credentials, portal access and identity lifecycle"
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New account</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total accounts", value: "5,132" },
          { label: "Active today", value: "1,842" },
          { label: "MFA enrolment", value: "78%" },
          { label: "Suspended", value: "14" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40" />
          </div>
          <div className="flex items-center gap-1 p-1 bg-background rounded-md border border-border">
            {(["all", "Student", "Teacher", "Parent", "Sub-admin"] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-3 h-7 rounded text-[11px] font-medium tracking-wide transition-colors ${role === r ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Portal</th>
                <th className="px-5 py-3 font-semibold">Last login</th>
                <th className="px-5 py-3 font-semibold">MFA</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{a.id}</div>
                  </td>
                  <td className="px-5 py-3 text-xs">{a.role}</td>
                  <td className="px-5 py-3 text-xs">{a.portal}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{a.lastLogin}</td>
                  <td className="px-5 py-3">{a.mfa ? <Pill tone="success">Enabled</Pill> : <Pill tone="warning">Off</Pill>}</td>
                  <td className="px-5 py-3">
                    {a.status === "active" && <Pill tone="success">Active</Pill>}
                    {a.status === "pending" && <Pill tone="warning">Pending</Pill>}
                    {a.status === "suspended" && <Pill tone="danger">Suspended</Pill>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground" title="Reset password"><KeyRound className="size-3.5" /></button>
                      <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground" title="Resend invite"><RefreshCw className="size-3.5" /></button>
                      <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-destructive" title="Suspend"><Power className="size-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Provision account" subtitle="Issue credentials and portal access"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}><ShieldCheck className="size-3.5" /> Provision</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><TextInput placeholder="Jane Doe" /></Field>
          <Field label="Role" required><Select><option>Student</option><option>Teacher</option><option>Parent</option><option>Sub-admin</option></Select></Field>
          <Field label="Email" required><TextInput type="email" placeholder="user@institute.edu" /></Field>
          <Field label="Portal access"><Select><option>Faculty</option><option>Student</option><option>Parent</option><option>Admin</option></Select></Field>
          <Field label="Initial password"><Select><option>Generate temporary</option><option>Send magic link</option><option>Set manually</option></Select></Field>
          <Field label="MFA"><Select><option>Required</option><option>Optional</option><option>Disabled</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
