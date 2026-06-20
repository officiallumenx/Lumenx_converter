import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { Plus, Mail, Phone, Search, MoreHorizontal, Link2, Users, KeyRound, Power } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/parents")({
  head: () => ({ meta: [{ title: "Parents — LumenX Nexus" }] }),
  component: ParentsPage,
});

const seed = [
  { id: "PAR-2201", name: "Rohan Sharma", email: "rohan@kin.io", phone: "+91 98765 11020", children: ["Aanya Sharma (10-A)"], status: "active" },
  { id: "PAR-2202", name: "Mira Draxler", email: "mira.d@kin.io", phone: "+49 175 220 4421", children: ["Julian Draxler (11-C)", "Lena Draxler (8-A)"], status: "active" },
  { id: "PAR-2203", name: "Susan Wright", email: "swright@kin.io", phone: "+1 415 552 9001", children: ["Ethan Wright (10-B)"], status: "pending" },
  { id: "PAR-2204", name: "Imran Khan", email: "ikhan@kin.io", phone: "+92 333 552 8810", children: ["Sana Khan (12-A)"], status: "active" },
  { id: "PAR-2205", name: "Carla Moreno", email: "cmoreno@kin.io", phone: "+34 612 998 110", children: ["Alina Moreno (9-A)"], status: "suspended" },
  { id: "PAR-2206", name: "Hyun Lee", email: "hlee@kin.io", phone: "+82 10 9912 4421", children: ["Marcus Lee (11-A)", "Soyeon Lee (7-B)"], status: "active" },
];

function ParentsPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = seed.filter((p) => q === "" || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Parent Directory" subtitle="2,104 guardians · 184 multi-child accounts"
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add Parent</Button>}
    >
      <Card>
        <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by guardian name…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40" />
          </div>
          <div className="text-xs text-muted-foreground ml-auto font-mono">{list.length} results</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <th className="px-5 py-3 font-semibold">Guardian</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Linked Children</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-gradient-to-br from-chart-5/30 to-primary/30 ring-2 ring-border flex items-center justify-center text-[11px] font-semibold">
                        {p.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3" />{p.email}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5"><Phone className="size-3" />{p.phone}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {p.children.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-accent text-accent-foreground border border-border">
                          <Link2 className="size-2.5" />{c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {p.status === "active" && <Pill tone="success">Active</Pill>}
                    {p.status === "pending" && <Pill tone="warning">Pending invite</Pill>}
                    {p.status === "suspended" && <Pill tone="danger">Suspended</Pill>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground" title="Reset credentials"><KeyRound className="size-3.5" /></button>
                      <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground" title="Suspend"><Power className="size-3.5" /></button>
                      <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground"><MoreHorizontal className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Guardian" subtitle="Create a parent account and link to one or more students"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}><Users className="size-3.5" /> Create & Link</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><TextInput placeholder="Maya Robinson" /></Field>
          <Field label="Relationship" required><Select><option>Mother</option><option>Father</option><option>Guardian</option></Select></Field>
          <Field label="Email" required><TextInput type="email" placeholder="parent@example.com" /></Field>
          <Field label="Phone"><TextInput placeholder="+1 555 010 4521" /></Field>
          <Field label="Link child (Student ID)" required hint="Comma separated"><TextInput placeholder="STU-1042, STU-1099" /></Field>
          <Field label="Send portal invite"><Select><option>Email invite immediately</option><option>Generate temp password</option><option>Do not send yet</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
