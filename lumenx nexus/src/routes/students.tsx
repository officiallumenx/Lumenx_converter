import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select } from "@/components/ui-kit";
import { Search, Filter, Plus, MoreHorizontal, Download, ArrowUpDown, UserPlus, Upload, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "Students — Luminexa Admin" }] }),
  component: StudentsPage,
});

const students = [
  { id: "STU-1042", name: "Aanya Sharma", grade: "10-A", attendance: 96, gpa: 3.8, status: "active", parent: "R. Sharma" },
  { id: "STU-1043", name: "Julian Draxler", grade: "11-C", attendance: 71, gpa: 2.2, status: "at-risk", parent: "M. Draxler" },
  { id: "STU-1044", name: "Ethan Wright", grade: "10-B", attendance: 85, gpa: 2.9, status: "watch", parent: "S. Wright" },
  { id: "STU-1045", name: "Sana Khan", grade: "12-A", attendance: 91, gpa: 3.5, status: "active", parent: "I. Khan" },
  { id: "STU-1046", name: "Alina Moreno", grade: "9-A", attendance: 68, gpa: 2.1, status: "at-risk", parent: "C. Moreno" },
  { id: "STU-1047", name: "Marcus Lee", grade: "11-A", attendance: 99, gpa: 3.95, status: "active", parent: "H. Lee" },
  { id: "STU-1048", name: "Priya Patel", grade: "9-B", attendance: 93, gpa: 3.6, status: "active", parent: "K. Patel" },
  { id: "STU-1049", name: "Omar Haddad", grade: "12-B", attendance: 78, gpa: 2.8, status: "watch", parent: "F. Haddad" },
];

type SortKey = "name" | "grade" | "attendance" | "gpa";

function StudentsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "at-risk" | "watch" | "active">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [open, setOpen] = useState(false);
  const [bulk, setBulk] = useState(false);

  const list = useMemo(() => {
    const base = students.filter((s) =>
      (filter === "all" || s.status === filter) &&
      (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.id.includes(q.toUpperCase()))
    );
    const dirMul = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dirMul;
      return String(av).localeCompare(String(bv)) * dirMul;
    });
  }, [q, filter, sort]);

  const toggleSort = (k: SortKey) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }));
  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-5 py-3 font-semibold">
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}<ArrowUpDown className="size-3 opacity-60" />
      </button>
    </th>
  );

  return (
    <AppShell title="Student Directory" subtitle="2,842 students across 42 classes"
      actions={<>
        <Button onClick={() => setBulk(true)}><Upload className="size-3.5" /> Bulk Import</Button>
        <Button><Download className="size-3.5" /> Export CSV</Button>
        <Button><Filter className="size-3.5" /> Filters</Button>
        <Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add Student</Button>
      </>}
    >
      <Card>
        <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or ID…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40" />
          </div>
          <div className="flex items-center gap-1 p-1 bg-background rounded-md border border-border">
            {(["all", "at-risk", "watch", "active"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 h-7 rounded text-[11px] font-medium uppercase tracking-wide transition-colors ${
                  filter === f ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {f}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground ml-auto font-mono">{list.length} results</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <Th k="name" label="Student" />
                <Th k="grade" label="Class" />
                <Th k="attendance" label="Attendance" />
                <Th k="gpa" label="GPA" />
                <th className="px-5 py-3 font-semibold">Guardian</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3">
                    <Link to="/students/$id" params={{ id: s.id }} className="flex items-center gap-3 group">
                      <div className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono">
                        {s.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-xs font-medium group-hover:text-primary">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{s.id}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs">{s.grade}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded bg-muted overflow-hidden">
                        <div className={`h-full ${s.attendance < 75 ? "bg-destructive" : s.attendance < 90 ? "bg-warning" : "bg-success"}`} style={{ width: `${s.attendance}%` }} />
                      </div>
                      <span className="text-xs font-mono">{s.attendance}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono">{s.gpa.toFixed(1)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{s.parent}</td>
                  <td className="px-5 py-3">
                    {s.status === "active" && <Pill tone="success">Active</Pill>}
                    {s.status === "watch" && <Pill tone="warning">Watch</Pill>}
                    {s.status === "at-risk" && <Pill tone="danger">At risk</Pill>}
                  </td>
                  <td className="px-5 py-3">
                    <button className="size-7 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground"><MoreHorizontal className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Showing 1–{list.length} of 2,842</span>
          <div className="flex gap-1">
            <Button>Previous</Button>
            <Button>Next</Button>
          </div>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Admit new student" subtitle="Issue credentials and assign class on completion" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}><UserPlus className="size-3.5" /> Admit student</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><TextInput placeholder="Jane Doe" /></Field>
          <Field label="Date of birth" required><TextInput type="date" /></Field>
          <Field label="Gender"><Select><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></Select></Field>
          <Field label="Admission number" hint="auto if blank"><TextInput placeholder="STU-XXXX" /></Field>
          <Field label="Grade" required><Select><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option></Select></Field>
          <Field label="Section" required><Select><option>A</option><option>B</option><option>C</option><option>D</option></Select></Field>
          <Field label="Branch"><Select><option>Branch Alpha</option><option>Branch Beta</option><option>Branch Gamma</option></Select></Field>
          <Field label="Guardian (Parent ID)" hint="leave blank to invite"><TextInput placeholder="PAR-XXXX" /></Field>
          <Field label="Contact email"><TextInput type="email" placeholder="student@institute.edu" /></Field>
          <Field label="Issue credentials"><Select><option>Email invite</option><option>Generate temp password</option><option>Skip for now</option></Select></Field>
        </div>
      </Modal>

      <Modal open={bulk} onClose={() => setBulk(false)} title="Bulk import students" subtitle="Upload an Excel or CSV file — duplicates are detected and parents auto-linked" size="lg"
        footer={<><Button onClick={() => setBulk(false)}>Cancel</Button><Button variant="primary" onClick={() => setBulk(false)}><Upload className="size-3.5" /> Validate & Import</Button></>}
      >
        <div className="space-y-4">
          <label className="block">
            <div className="rounded-xl border-2 border-dashed border-border bg-background/40 hover:border-primary/50 hover:bg-primary/[0.03] transition-colors p-8 text-center cursor-pointer">
              <div className="mx-auto size-12 rounded-xl bg-accent flex items-center justify-center mb-3"><FileSpreadsheet className="size-5 text-primary" /></div>
              <div className="text-sm font-medium">Drop .xlsx or .csv file</div>
              <div className="text-[11px] text-muted-foreground mt-1">Max 10MB · 5,000 rows per upload</div>
              <input type="file" accept=".csv,.xlsx" className="hidden" />
            </div>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            {[
              { l: "Auto-detect duplicates", v: "By email + DOB" },
              { l: "Generate credentials", v: "Email invite" },
              { l: "Auto-link parents", v: "By guardian email" },
            ].map((s) => (
              <div key={s.l} className="p-3 rounded-md border border-border bg-background/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className="font-medium mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
          <a className="text-[11px] text-primary hover:underline cursor-pointer">↓ Download CSV template (students.csv)</a>
        </div>
      </Modal>
    </AppShell>
  );
}
