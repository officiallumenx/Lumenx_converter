import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Button,
  Pill,
  Modal,
  Field,
  Select,
  TextInput,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarGroup,
  ToolbarSpacer,
  ToolbarMeta,
  DataTable,
  EmptyState,
  Th,
  IconButton,
} from "@lumenx/ui-admin";
import { Plus, Power, RefreshCw, UserPlus, UserCheck, KeyRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  CLASS_OPTIONS,
  SECTION_OPTIONS,
  matchesClassSection,
  classSectionLabel,
  type ClassFilter,
  type SectionFilter,
} from "@/lib/class-section-filter";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: "Accounts & Access — LumenX Admin" }] }),
  component: AccountsPage,
});

type AccStatus = "active" | "pending" | "suspended";

type LinkedChild = {
  name: string;
  studentId: string;
  classSection: string;
  rollNo: string;
};

type Account = {
  id: string;
  name: string;
  role: "Student" | "Teacher" | "Parent" | "Sub-admin";
  portal: string;
  lastLogin: string;
  status: AccStatus;
  classSection?: string;
  rollNo?: string;
  linkedChildren?: LinkedChild[];
};

const INITIAL: Account[] = [
  {
    id: "ACC-9001",
    name: "Sarah Jenkins",
    role: "Teacher",
    portal: "Faculty",
    lastLogin: "12 min ago",
    status: "active",
  },
  {
    id: "ACC-9002",
    name: "Aanya Sharma",
    role: "Student",
    portal: "Student",
    lastLogin: "1 h ago",
    status: "active",
    classSection: "10-A",
    rollNo: "12",
  },
  {
    id: "ACC-9003",
    name: "Rohan Sharma",
    role: "Parent",
    portal: "Parent",
    lastLogin: "3 h ago",
    status: "active",
    linkedChildren: [
      { name: "Aanya Sharma", studentId: "STU-1042", classSection: "10-A", rollNo: "12" },
    ],
  },
  {
    id: "ACC-9004",
    name: "Mira Draxler",
    role: "Parent",
    portal: "Parent",
    lastLogin: "2 d ago",
    status: "pending",
    linkedChildren: [
      { name: "Julian Draxler", studentId: "STU-1043", classSection: "11-C", rollNo: "07" },
    ],
  },
  {
    id: "ACC-9005",
    name: "Marcus Whitfield",
    role: "Teacher",
    portal: "Faculty",
    lastLogin: "5 h ago",
    status: "active",
  },
  {
    id: "ACC-9006",
    name: "Liang Ortega",
    role: "Sub-admin",
    portal: "Admin",
    lastLogin: "yesterday",
    status: "active",
  },
  {
    id: "ACC-9007",
    name: "Ethan Wright",
    role: "Student",
    portal: "Student",
    lastLogin: "9 d ago",
    status: "suspended",
    classSection: "10-B",
    rollNo: "08",
  },
  {
    id: "ACC-9008",
    name: "Susan Wright",
    role: "Parent",
    portal: "Parent",
    lastLogin: "4 h ago",
    status: "active",
    linkedChildren: [
      { name: "Ethan Wright", studentId: "STU-1044", classSection: "10-B", rollNo: "08" },
    ],
  },
  {
    id: "ACC-9009",
    name: "Julian Draxler",
    role: "Student",
    portal: "Student",
    lastLogin: "2 h ago",
    status: "active",
    classSection: "11-C",
    rollNo: "07",
  },
  {
    id: "ACC-9010",
    name: "Sana Khan",
    role: "Student",
    portal: "Student",
    lastLogin: "6 h ago",
    status: "active",
    classSection: "12-A",
    rollNo: "03",
  },
  {
    id: "ACC-9011",
    name: "Imran Khan",
    role: "Parent",
    portal: "Parent",
    lastLogin: "1 d ago",
    status: "active",
    linkedChildren: [
      { name: "Sana Khan", studentId: "STU-1045", classSection: "12-A", rollNo: "03" },
    ],
  },
  {
    id: "ACC-9012",
    name: "Alina Moreno",
    role: "Student",
    portal: "Student",
    lastLogin: "3 d ago",
    status: "active",
    classSection: "9-A",
    rollNo: "22",
  },
  {
    id: "ACC-9013",
    name: "Marcus Lee",
    role: "Student",
    portal: "Student",
    lastLogin: "30 min ago",
    status: "active",
    classSection: "11-A",
    rollNo: "01",
  },
  {
    id: "ACC-9014",
    name: "Priya Patel",
    role: "Student",
    portal: "Student",
    lastLogin: "5 h ago",
    status: "active",
    classSection: "9-B",
    rollNo: "14",
  },
];

function childMatchesScope(
  child: LinkedChild,
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
  rollNo: string,
): boolean {
  if (!matchesClassSection(child.classSection, classFilter, sectionFilter)) return false;
  if (rollNo.trim() && !child.rollNo.includes(rollNo.trim())) return false;
  return true;
}

function studentMatchesScope(
  account: Account,
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
  rollNo: string,
): boolean {
  if (!account.classSection) return false;
  if (!matchesClassSection(account.classSection, classFilter, sectionFilter)) return false;
  if (rollNo.trim() && !(account.rollNo ?? "").includes(rollNo.trim())) return false;
  return true;
}

function parentMatchesScope(
  account: Account,
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
  rollNo: string,
): boolean {
  return (account.linkedChildren ?? []).some((c) =>
    childMatchesScope(c, classFilter, sectionFilter, rollNo),
  );
}

function scopeActive(
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
  rollNo: string,
): boolean {
  return classFilter !== "all" || sectionFilter !== "all" || rollNo.trim().length > 0;
}

function AccountsPage() {
  const notify = useAdminToast();
  const [rows, setRows] = useState(INITIAL);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | Account["role"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AccStatus>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [rollNo, setRollNo] = useState("");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Account["role"]>("Student");

  const scoped = scopeActive(classFilter, sectionFilter, rollNo);
  const scopeLabel = classSectionLabel(classFilter, sectionFilter);

  const list = useMemo(() => {
    return rows.filter((a) => {
      if (role !== "all" && a.role !== role) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;

      if (scoped) {
        if (a.role === "Student" && !studentMatchesScope(a, classFilter, sectionFilter, rollNo))
          return false;
        if (a.role === "Parent" && !parentMatchesScope(a, classFilter, sectionFilter, rollNo))
          return false;
        if (a.role !== "Student" && a.role !== "Parent") return false;
      }

      if (!q.trim()) return true;
      const lq = q.trim().toLowerCase();
      const haystack = [
        a.name,
        a.id,
        a.rollNo ?? "",
        a.classSection ?? "",
        ...(a.linkedChildren ?? []).flatMap((c) => [c.name, c.rollNo, c.classSection, c.studentId]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(lq);
    });
  }, [rows, q, role, statusFilter, classFilter, sectionFilter, rollNo, scoped]);

  const suspend = (id: string) => {
    const acc = rows.find((a) => a.id === id);
    setRows((p) => p.map((a) => (a.id === id ? { ...a, status: "suspended" as const } : a)));
    notify(`${acc?.name ?? "Account"} suspended`);
  };

  const activatePending = (id: string) => {
    const acc = rows.find((a) => a.id === id);
    setRows((p) => p.map((a) => (a.id === id ? { ...a, status: "active" as const } : a)));
    notify(`Invite sent · ${acc?.name ?? "Account"} is now active`);
  };

  const reactivate = (id: string) => {
    const acc = rows.find((a) => a.id === id);
    setRows((p) => p.map((a) => (a.id === id ? { ...a, status: "active" as const } : a)));
    notify(`${acc?.name ?? "Account"} reactivated · portal access restored`);
  };

  const provision = () => {
    if (!newName.trim()) return;
    setRows((p) => [
      ...p,
      {
        id: `ACC-${Date.now()}`,
        name: newName.trim(),
        role: newRole,
        portal: newRole === "Sub-admin" ? "Admin" : newRole,
        lastLogin: "Never",
        status: "pending",
      },
    ]);
    setNewName("");
    setOpen(false);
  };

  const activeToday = rows.filter((a) => a.status === "active").length;
  const suspended = rows.filter((a) => a.status === "suspended").length;

  return (
    <AppShell
      title="Accounts & Access"
      subtitle={
        scoped
          ? `${list.length} accounts · ${scopeLabel}${rollNo.trim() ? ` · Roll ${rollNo.trim()}` : ""}`
          : "Manage credentials, portal access and identity lifecycle"
      }
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> New account
        </Button>
      }
    >
      <div className="lx-kpi-grid lx-kpi-grid--3 mb-6">
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Total accounts
          </div>
          <div className="mt-2 text-2xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Active
          </div>
          <div className="mt-2 text-2xl font-semibold">{activeToday}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Suspended
          </div>
          <div className="mt-2 text-2xl font-semibold">{suspended}</div>
        </Card>
      </div>

      <Card>
        <PageToolbar>
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, roll no, or ID…"
            className="flex-1 min-w-[200px]"
          />
          <Select
            fieldSize="compact"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-28"
          >
            <option value="all">All roles</option>
            <option>Student</option>
            <option>Teacher</option>
            <option>Parent</option>
            <option>Sub-admin</option>
          </Select>
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending invite" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <ToolbarGroup className="border-l border-border pl-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Class
              </div>
              <Select
                fieldSize="compact"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value as ClassFilter)}
                className="w-28"
              >
                <option value="all">All classes</option>
                {CLASS_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Section
              </div>
              <Select
                fieldSize="compact"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as SectionFilter)}
                className="w-24"
              >
                <option value="all">All</option>
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Roll no.
              </div>
              <TextInput
                fieldSize="compact"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="e.g. 12"
                className="w-20"
              />
            </div>
          </ToolbarGroup>
          {scoped && (
            <Button
              onClick={() => {
                setClassFilter("all");
                setSectionFilter("all");
                setRollNo("");
              }}
            >
              Clear
            </Button>
          )}
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>

        {scoped && (
          <div className="px-5 py-2 border-b border-border bg-primary/[0.03] text-[11px] text-muted-foreground">
            Showing student & parent accounts for {scopeLabel}
            {rollNo.trim() ? ` · Roll ${rollNo.trim()}` : ""}. Teachers and admins are hidden while
            class filters are active.
          </div>
        )}

        {list.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="size-5" />}
            title="No accounts found"
            hint={`No accounts match ${scopeLabel}${rollNo.trim() ? ` · Roll ${rollNo.trim()}` : ""}.`}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Account</Th>
                <Th>Role</Th>
                <Th>Class / Linked</Th>
                <Th>Roll no.</Th>
                <Th>Last login</Th>
                <Th>Status</Th>
                <Th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((a) => {
                const visibleChildren = scoped
                  ? (a.linkedChildren ?? []).filter((c) =>
                      childMatchesScope(c, classFilter, sectionFilter, rollNo),
                    )
                  : (a.linkedChildren ?? []);

                return (
                  <tr key={a.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{a.id}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">{a.role}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[220px]">
                      {a.role === "Student" && a.classSection ? `Grade ${a.classSection}` : null}
                      {a.role === "Parent" && visibleChildren.length > 0
                        ? visibleChildren.map((c) => `${c.name} (${c.classSection})`).join(", ")
                        : null}
                      {a.role !== "Student" && a.role !== "Parent" ? a.portal : null}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono">
                      {a.role === "Student" ? (a.rollNo ?? "—") : null}
                      {a.role === "Parent" && visibleChildren.length > 0
                        ? visibleChildren.map((c) => c.rollNo).join(", ")
                        : null}
                      {a.role !== "Student" && a.role !== "Parent" ? "—" : null}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{a.lastLogin}</td>
                    <td className="px-5 py-3">
                      {a.status === "active" && <Pill tone="success">Active</Pill>}
                      {a.status === "pending" && <Pill tone="warning">Pending invite</Pill>}
                      {a.status === "suspended" && <Pill tone="danger">Suspended</Pill>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {a.status === "pending" && (
                          <IconButton
                            label="Resend invite"
                            size="sm"
                            onClick={() => activatePending(a.id)}
                          >
                            <RefreshCw className="size-3" />
                          </IconButton>
                        )}
                        {a.status === "suspended" && (
                          <IconButton
                            label="Reactivate account"
                            size="sm"
                            className="text-primary border-primary/30"
                            onClick={() => reactivate(a.id)}
                          >
                            <UserCheck className="size-3" />
                          </IconButton>
                        )}
                        {a.status !== "suspended" && (
                          <IconButton
                            label="Suspend account"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => suspend(a.id)}
                          >
                            <Power className="size-3" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Provision account"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={provision} disabled={!newName.trim()}>
              <UserPlus className="size-3.5" /> Provision
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Role" required>
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value as Account["role"])}>
              <option>Student</option>
              <option>Teacher</option>
              <option>Parent</option>
              <option>Sub-admin</option>
            </Select>
          </Field>
          <Field label="Email">
            <TextInput type="email" placeholder="user@institute.edu" />
          </Field>
          <Field label="Credentials">
            <Select>
              <option>Email invite</option>
              <option>Generate temp password</option>
              <option>Skip for now</option>
            </Select>
          </Field>
          {newRole === "Student" && (
            <>
              <Field label="Class">
                <Select>
                  <option>10-A</option>
                  <option>10-B</option>
                  <option>11-A</option>
                  <option>9-A</option>
                </Select>
              </Field>
              <Field label="Roll number">
                <TextInput placeholder="12" />
              </Field>
            </>
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
