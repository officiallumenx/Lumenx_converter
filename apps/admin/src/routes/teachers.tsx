import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select, SearchInput, SegmentedControl, PageToolbar, ToolbarSpacer, ToolbarMeta } from "@lumenx/ui-admin";
import { Plus, Mail, KeyRound, UserPlus, Edit3, Phone, Calendar, BookOpen, Shield } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useMemo, useState, type ReactNode } from "react";

export const Route = createFileRoute("/teachers")({
  head: () => ({ meta: [{ title: "Teachers — LumenX Admin" }] }),
  component: TeachersPage,
});

type TeacherStatus = "active" | "on-leave" | "pending";

type Teacher = {
  id: string;
  name: string;
  dept: string;
  email: string;
  phone: string;
  employeeId: string;
  joined: string;
  classes: number;
  assignedSections: string[];
  status: TeacherStatus;
  subjects: string[];
  portalAccess: string;
  qualification: string;
  lastLogin: string;
  credentialsSentAt: string | null;
};

const INITIAL: Teacher[] = [
  {
    id: "T-001", name: "Sarah Jenkins", dept: "Mathematics", email: "s.jenkins@institute.edu", phone: "+1 555 010 2201",
    employeeId: "EMP-1041", joined: "Aug 2019", classes: 6, assignedSections: ["10-A", "10-B", "11-A"],
    status: "active", subjects: ["Mathematics", "Algebra"], portalAccess: "Faculty + Grading",
    qualification: "M.Sc Mathematics · B.Ed", lastLogin: "12 min ago", credentialsSentAt: "Jan 2026",
  },
  {
    id: "T-002", name: "David Koal", dept: "Physics", email: "d.koal@institute.edu", phone: "+1 555 010 2202",
    employeeId: "EMP-1042", joined: "Jun 2020", classes: 5, assignedSections: ["11-A", "11-B", "12-A"],
    status: "active", subjects: ["Physics"], portalAccess: "Faculty + Grading",
    qualification: "Ph.D Physics", lastLogin: "2 h ago", credentialsSentAt: "Feb 2026",
  },
  {
    id: "T-003", name: "Priya Iyer", dept: "Biology", email: "p.iyer@institute.edu", phone: "+91 98220 44102",
    employeeId: "EMP-1043", joined: "Apr 2021", classes: 4, assignedSections: ["9-A", "9-B"],
    status: "active", subjects: ["Biology", "Environmental Science"], portalAccess: "Faculty + Grading",
    qualification: "M.Sc Biology · B.Ed", lastLogin: "45 min ago", credentialsSentAt: "Mar 2026",
  },
  {
    id: "T-004", name: "Marcus Whitfield", dept: "English", email: "m.whitfield@institute.edu", phone: "+44 7700 900441",
    employeeId: "EMP-1044", joined: "Jan 2018", classes: 7, assignedSections: ["10-A", "10-C", "12-B"],
    status: "on-leave", subjects: ["English", "Literature"], portalAccess: "Faculty only",
    qualification: "M.A English Literature", lastLogin: "14 d ago", credentialsSentAt: "Dec 2025",
  },
  {
    id: "T-005", name: "Hana Suzuki", dept: "Chemistry", email: "h.suzuki@institute.edu", phone: "+81 90 1234 5678",
    employeeId: "EMP-1045", joined: "Jul 2022", classes: 5, assignedSections: ["11-C", "12-A"],
    status: "active", subjects: ["Chemistry"], portalAccess: "Faculty + Grading",
    qualification: "M.Sc Chemistry", lastLogin: "1 h ago", credentialsSentAt: "Jan 2026",
  },
  {
    id: "T-006", name: "Omar Faris", dept: "History", email: "o.faris@institute.edu", phone: "+971 50 882 1100",
    employeeId: "EMP-1046", joined: "Sep 2023", classes: 3, assignedSections: ["9-A"],
    status: "pending", subjects: ["History"], portalAccess: "Faculty only",
    qualification: "M.A History", lastLogin: "Never", credentialsSentAt: null,
  },
];

const DEPARTMENTS = ["Mathematics", "Physics", "Biology", "Chemistry", "English", "History"] as const;
const STATUS_FILTERS = ["all", "active", "on-leave", "pending"] as const;

function statusPill(status: TeacherStatus) {
  if (status === "active") return <Pill tone="success">Active</Pill>;
  if (status === "on-leave") return <Pill tone="warning">On leave</Pill>;
  return <Pill tone="info">Pending</Pill>;
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-2 text-xs text-foreground">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span>{value}</span>
      </div>
    </div>
  );
}

type TeacherDraft = Partial<Teacher> & { subjectsText?: string; sectionsText?: string };

function TeachersPage() {
  const notify = useAdminToast();
  const [rows, setRows] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TeacherDraft>({});
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null);

  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("Mathematics");
  const [newEmail, setNewEmail] = useState("");
  const [newSubjects, setNewSubjects] = useState("");

  const selected = useMemo(() => rows.find((t) => t.id === selectedId) ?? null, [rows, selectedId]);

  const list = useMemo(() => {
    return rows.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const lq = q.toLowerCase();
      return t.name.toLowerCase().includes(lq) || t.dept.toLowerCase().includes(lq) || t.email.toLowerCase().includes(lq);
    });
  }, [rows, q, statusFilter]);

  const openDetail = (t: Teacher) => {
    setSelectedId(t.id);
    setEditing(false);
    setDraft({});
  };

  const closeDetail = () => {
    setSelectedId(null);
    setEditing(false);
    setDraft({});
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft({
      ...selected,
      subjectsText: selected.subjects.join(", "),
      sectionsText: selected.assignedSections.join(", "),
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selected || !draft.name?.trim()) return;
    const subjects = draft.subjectsText
      ? draft.subjectsText.split(",").map((s) => s.trim()).filter(Boolean)
      : selected.subjects;
    const assignedSections = draft.sectionsText
      ? draft.sectionsText.split(",").map((s) => s.trim()).filter(Boolean)
      : selected.assignedSections;

    setRows((prev) => prev.map((t) => t.id === selected.id ? {
      ...t,
      name: draft.name!.trim(),
      dept: draft.dept ?? t.dept,
      email: draft.email ?? t.email,
      phone: draft.phone ?? t.phone,
      status: draft.status ?? t.status,
      portalAccess: draft.portalAccess ?? t.portalAccess,
      qualification: draft.qualification ?? t.qualification,
      subjects,
      assignedSections,
      classes: assignedSections.length || t.classes,
    } : t));
    setEditing(false);
    setDraft({});
    notify(`${draft.name.trim()} updated successfully`);
  };

  const confirmReset = () => {
    if (!resetTarget) return;
    const sentAt = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
    setRows((prev) => prev.map((t) => t.id === resetTarget.id ? { ...t, credentialsSentAt: sentAt } : t));
    notify(`Password reset link sent to ${resetTarget.email}`);
    setResetTarget(null);
  };

  const onboard = () => {
    if (!newName.trim()) return;
    const id = `T-${String(rows.length + 1).padStart(3, "0")}`;
    setRows((p) => [...p, {
      id,
      name: newName.trim(),
      dept: newDept,
      email: newEmail.trim() || `${newName.trim().split(" ")[0].toLowerCase()}@institute.edu`,
      phone: "",
      employeeId: `EMP-${1040 + p.length + 1}`,
      joined: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      classes: 0,
      assignedSections: [],
      status: "pending",
      subjects: newSubjects.split(",").map((s) => s.trim()).filter(Boolean),
      portalAccess: "Faculty + Grading",
      qualification: "",
      lastLogin: "Never",
      credentialsSentAt: null,
    }]);
    setNewName("");
    setNewEmail("");
    setNewSubjects("");
    setOpen(false);
    notify(`${newName.trim()} onboarded · portal invite sent`);
  };

  return (
    <AppShell title="Academic Staff" subtitle={`${rows.length} teachers · 12 departments`}
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add Teacher</Button>}
    >
      <Card className="mb-4">
        <PageToolbar className="!flex-row !items-center">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or department…" className="flex-1 min-w-[200px]" />
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS.map((f) => ({
              value: f,
              label: f === "all" ? "All" : f.replace("-", " "),
            }))}
          />
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((t) => (
          <Card
            key={t.id}
            interactive
            role="button"
            tabIndex={0}
            aria-label={`View ${t.name} profile`}
            onClick={() => openDetail(t)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDetail(t);
              }
            }}
            className="p-5 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 ring-2 ring-border flex items-center justify-center text-xs font-semibold">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.dept}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{t.id}</div>
                </div>
              </div>
              {statusPill(t.status)}
            </div>
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Classes</div>
              <div className="text-base font-semibold mt-1">{t.classes}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {t.subjects.slice(0, 2).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-accent border border-border">{s}</span>
              ))}
              {t.subjects.length > 2 && <span className="text-[10px] text-muted-foreground">+{t.subjects.length - 2}</span>}
            </div>
            <div className="flex gap-2 mt-5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <Button className="flex-1 justify-center" onClick={() => notify(`Message queued for ${t.name}`)}><Mail className="size-3" /> Message</Button>
              <Button className="flex-1 justify-center" onClick={() => setResetTarget(t)}><KeyRound className="size-3" /> Reset</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Teacher detail / edit */}
      <Modal
        open={!!selected}
        onClose={closeDetail}
        title={editing ? "Edit teacher profile" : "Teacher profile"}
        subtitle={selected ? `${selected.name} · ${selected.id} · ${selected.employeeId}` : undefined}
        size="lg"
        footer={editing ? (
          <>
            <Button onClick={() => { setEditing(false); setDraft({}); }}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit} disabled={!draft.name?.trim()}>Save changes</Button>
          </>
        ) : (
          <>
            <Button onClick={closeDetail}>Close</Button>
            <Button onClick={() => selected && setResetTarget(selected)}><KeyRound className="size-3.5" /> Reset credentials</Button>
            <Button variant="primary" onClick={startEdit}><Edit3 className="size-3.5" /> Edit profile</Button>
          </>
        )}
      >
        {selected && !editing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 ring-2 ring-border flex items-center justify-center text-sm font-semibold">
                {selected.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold">{selected.name}</div>
                <div className="text-sm text-muted-foreground">{selected.dept}</div>
                <div className="mt-1">{statusPill(selected.status)}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <DetailRow label="Email" value={selected.email} icon={<Mail className="size-3.5" />} />
              <DetailRow label="Phone" value={selected.phone || "—"} icon={<Phone className="size-3.5" />} />
              <DetailRow label="Employee ID" value={selected.employeeId} />
              <DetailRow label="Joined" value={selected.joined} icon={<Calendar className="size-3.5" />} />
              <DetailRow label="Portal access" value={selected.portalAccess} icon={<Shield className="size-3.5" />} />
              <DetailRow label="Last login" value={selected.lastLogin} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { l: "Classes", v: String(selected.classes) },
                { l: "Last login", v: selected.lastLogin },
                { l: "Credentials", v: selected.credentialsSentAt ?? "Not sent" },
              ].map((s) => (
                <div key={s.l} className="p-3 rounded-md border border-border bg-background/40">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  <div className="font-medium mt-1 text-sm">{s.v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Qualification</div>
              <div className="text-xs">{selected.qualification || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><BookOpen className="size-3" /> Subjects</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.subjects.map((s) => (
                  <span key={s} className="px-2 py-1 rounded text-[11px] bg-accent border border-border">{s}</span>
                ))}
              </div>
            </div>
            {selected.assignedSections.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Assigned sections</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.assignedSections.map((s) => (
                    <span key={s} className="px-2 py-1 rounded text-[11px] font-mono bg-background border border-border">Grade {s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selected && editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <TextInput value={draft.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </Field>
            <Field label="Department" required>
              <Select value={draft.dept ?? "Mathematics"} onChange={(e) => setDraft((d) => ({ ...d, dept: e.target.value }))}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Email">
              <TextInput type="email" value={draft.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <TextInput value={draft.phone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={draft.status ?? "active"} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TeacherStatus }))}>
                <option value="active">Active</option>
                <option value="on-leave">On leave</option>
                <option value="pending">Pending</option>
              </Select>
            </Field>
            <Field label="Portal access">
              <Select value={draft.portalAccess ?? "Faculty + Grading"} onChange={(e) => setDraft((d) => ({ ...d, portalAccess: e.target.value }))}>
                <option>Faculty + Grading</option>
                <option>Faculty only</option>
                <option>Read-only</option>
              </Select>
            </Field>
            <Field label="Qualification" hint="Degrees & certifications">
              <TextInput value={draft.qualification ?? ""} onChange={(e) => setDraft((d) => ({ ...d, qualification: e.target.value }))} />
            </Field>
            <Field label="Subjects" hint="Comma separated">
              <TextInput
                value={draft.subjectsText ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, subjectsText: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Assigned sections" hint="e.g. 10-A, 11-B">
                <TextInput
                  value={draft.sectionsText ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, sectionsText: e.target.value }))}
                  placeholder="10-A, 10-B, 11-A"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 text-[11px] text-muted-foreground">
              Employee ID {selected.employeeId} · Teacher ID {selected.id} (read-only)
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset credentials"
        subtitle={`Send a secure password reset link to ${resetTarget?.email ?? ""}`}
        footer={
          <>
            <Button onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmReset}><KeyRound className="size-3.5" /> Send reset link</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            This will email <span className="text-foreground font-medium">{resetTarget?.name}</span> a one-time link to set a new password.
          </p>
          <div className="p-3 rounded-md border border-border bg-background/40 text-xs space-y-1">
            <div><span className="text-muted-foreground">Portal:</span> {resetTarget?.portalAccess}</div>
            <div><span className="text-muted-foreground">Last credentials sent:</span> {resetTarget?.credentialsSentAt ?? "Never"}</div>
          </div>
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Onboard teacher" subtitle="Create faculty record, portal access and timetable assignment" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={onboard} disabled={!newName.trim()}><UserPlus className="size-3.5" /> Onboard</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Dr. Maya Robinson" /></Field>
          <Field label="Department" required><Select value={newDept} onChange={(e) => setNewDept(e.target.value)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
          <Field label="Email"><TextInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="faculty@institute.edu" /></Field>
          <Field label="Subjects" hint="Comma separated"><TextInput value={newSubjects} onChange={(e) => setNewSubjects(e.target.value)} placeholder="Mathematics, Algebra" /></Field>
          <Field label="Portal access"><Select><option>Faculty + Grading</option><option>Faculty only</option></Select></Field>
          <Field label="Credentials"><Select><option>Email invite</option><option>Generate temp password</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
