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
  PageToolbar,
  DataTable,
  EmptyState,
  Th,
  CascadingFiltersMenu,
} from "@lumenx/ui-admin";
import { Plus, UserPlus, KeyRound, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import { softDeleteToRecycleBin } from "@lumenx/utils";
import { loadPersistedAccounts, savePersistedAccounts } from "@/lib/recycle-restore";
import { AccountStatusPill, type AccStatus } from "@/components/accounts/AccountStatusPill";
import { AccountsKpiStrip } from "@/components/accounts/AccountsKpiStrip";
import { PeopleDirectoryCard } from "@/components/people/PeopleDirectoryCard";
import {
  CLASS_OPTIONS,
  SECTION_OPTIONS,
  matchesClassSection,
  classSectionLabel,
  type ClassFilter,
  type SectionFilter,
} from "@/lib/class-section-filter";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";
import { AccountsApiMembershipsPanel } from "@/components/accounts/AccountsApiMembershipsPanel";
import { AccountsApiStaffPanel } from "@/components/accounts/AccountsApiStaffPanel";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: adminPageTitle("/accounts") }] }),
  component: AccountsPage,
});

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
  email: string;
  phone: string;
  password: string;
  classSection?: string;
  rollNo?: string;
  studentId?: string;
  department?: string;
  employeeId?: string;
  subjects?: string[];
  assignedSections?: string[];
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
    email: "s.jenkins@institute.edu",
    phone: "9876501221",
    password: "Teach@Sarah1",
    department: "Mathematics",
    employeeId: "EMP-1041",
    subjects: ["Mathematics", "Algebra"],
    assignedSections: ["10-A", "10-B", "11-A"],
  },
  {
    id: "ACC-9002",
    name: "Aanya Sharma",
    role: "Student",
    portal: "Student",
    lastLogin: "1 h ago",
    status: "active",
    email: "aanya.sharma@student.edu",
    phone: "9876510012",
    password: "Stud@Aanya12",
    classSection: "10-A",
    rollNo: "12",
    studentId: "STU-1042",
  },
  {
    id: "ACC-9003",
    name: "Rohan Sharma",
    role: "Parent",
    portal: "Parent",
    lastLogin: "3 h ago",
    status: "active",
    email: "rohan.sharma@email.com",
    phone: "9876512345",
    password: "Parent@Rohan1",
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
    email: "mira.draxler@email.com",
    phone: "9876512346",
    password: "Parent@Mira1",
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
    email: "m.whitfield@institute.edu",
    phone: "9876501441",
    password: "Teach@Marcus1",
    department: "English",
    employeeId: "EMP-1044",
    subjects: ["English", "Literature"],
    assignedSections: ["10-A", "10-C", "12-B"],
  },
  {
    id: "ACC-9006",
    name: "Liang Ortega",
    role: "Sub-admin",
    portal: "Admin",
    lastLogin: "yesterday",
    status: "active",
    email: "l.ortega@institute.edu",
    phone: "9876501990",
    password: "Admin@Liang1",
    department: "Administration",
    employeeId: "EMP-2201",
  },
  {
    id: "ACC-9007",
    name: "Ethan Wright",
    role: "Student",
    portal: "Student",
    lastLogin: "9 d ago",
    status: "suspended",
    email: "ethan.wright@student.edu",
    phone: "9876510008",
    password: "Stud@Ethan08",
    classSection: "10-B",
    rollNo: "08",
    studentId: "STU-1044",
  },
  {
    id: "ACC-9008",
    name: "Susan Wright",
    role: "Parent",
    portal: "Parent",
    lastLogin: "4 h ago",
    status: "active",
    email: "susan.wright@email.com",
    phone: "9876512347",
    password: "Parent@Susan1",
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
    email: "julian.draxler@student.edu",
    phone: "9876510007",
    password: "Stud@Julian07",
    classSection: "11-C",
    rollNo: "07",
    studentId: "STU-1043",
  },
  {
    id: "ACC-9010",
    name: "Sana Khan",
    role: "Student",
    portal: "Student",
    lastLogin: "6 h ago",
    status: "active",
    email: "sana.khan@student.edu",
    phone: "9876510003",
    password: "Stud@Sana03",
    classSection: "12-A",
    rollNo: "03",
    studentId: "STU-1045",
  },
  {
    id: "ACC-9011",
    name: "Imran Khan",
    role: "Parent",
    portal: "Parent",
    lastLogin: "1 d ago",
    status: "active",
    email: "imran.khan@email.com",
    phone: "9876512348",
    password: "Parent@Imran1",
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
    email: "alina.moreno@student.edu",
    phone: "9876510022",
    password: "Stud@Alina22",
    classSection: "9-A",
    rollNo: "22",
    studentId: "STU-1046",
  },
  {
    id: "ACC-9013",
    name: "Marcus Lee",
    role: "Student",
    portal: "Student",
    lastLogin: "30 min ago",
    status: "active",
    email: "marcus.lee@student.edu",
    phone: "9876510001",
    password: "Stud@Marcus01",
    classSection: "11-A",
    rollNo: "01",
    studentId: "STU-1047",
  },
  {
    id: "ACC-9014",
    name: "Priya Patel",
    role: "Student",
    portal: "Student",
    lastLogin: "5 h ago",
    status: "active",
    email: "priya.patel@student.edu",
    phone: "9876510014",
    password: "Stud@Priya14",
    classSection: "9-B",
    rollNo: "14",
    studentId: "STU-1048",
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
  const { user } = useAuth();
  const [rows, setRows] = useState(() => loadPersistedAccounts(INITIAL));
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | Account["role"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AccStatus>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [rollNo, setRollNo] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

  const hold = (id: string) => {
    const acc = rows.find((a) => a.id === id);
    setRows((p) => p.map((a) => (a.id === id ? { ...a, status: "hold" as const } : a)));
    notify(`${acc?.name ?? "Account"} put on hold`);
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

  const persistAccounts = (next: typeof INITIAL) => {
    setRows(next);
    savePersistedAccounts(next);
  };

  const removeAccount = (id: string) => {
    const acc = rows.find((a) => a.id === id);
    if (acc) {
      softDeleteToRecycleBin({
        module: "Accounts",
        title: acc.name,
        subtitle: acc.role,
        deletedBy: user?.name ?? "Admin",
        snapshot: { ...acc } as unknown as Record<string, unknown>,
      });
    }
    persistAccounts(rows.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
    setPendingDelete(null);
    notify(`${acc?.name ?? "Account"} moved to Recycle Bin`);
  };

  const provision = () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/\s+/g, ".");
    setRows((p) => [
      ...p,
      {
        id: `ACC-${Date.now()}`,
        name: newName.trim(),
        role: newRole,
        portal: newRole === "Sub-admin" ? "Admin" : newRole === "Teacher" ? "Faculty" : newRole,
        lastLogin: "Never",
        status: "pending",
        email: `${slug}@institute.edu`,
        phone: "",
        password: `Temp@${Date.now().toString().slice(-4)}`,
      },
    ]);
    setNewName("");
    setOpen(false);
  };

  const activeToday = rows.filter((a) => a.status === "active").length;
  const suspended = rows.filter((a) => a.status === "suspended").length;

  if (isApiAuthMode()) {
    return (
      <AppShell
        title={M.accounts}
        subtitle="Staff Admin accounts · institute memberships · roles managed under Roles & Access"
      >
        <AccountsApiStaffPanel />
        <div className="mt-6">
          <AccountsApiMembershipsPanel />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={M.accounts}
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
      <AccountsKpiStrip total={rows.length} active={activeToday} suspended={suspended} />

      <Card>
        <PageToolbar className="lx-people-toolbar">
          <div className="w-full min-w-0">
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="w-full min-w-0"
            />
          </div>
          <div className="lx-people-filters flex flex-wrap items-center gap-2">
            <CascadingFiltersMenu
              groups={[
                {
                  id: "role",
                  label: "Role type",
                  value: role,
                  onChange: (v) => setRole(v as typeof role),
                  options: [
                    { value: "all", label: "All roles" },
                    { value: "Teacher", label: "Teacher" },
                    { value: "Parent", label: "Parent" },
                    { value: "Student", label: "Student" },
                    { value: "Sub-admin", label: "Sub-admin" },
                  ],
                },
                {
                  id: "class",
                  label: "Class",
                  value: classFilter,
                  onChange: (v) => setClassFilter(v as ClassFilter),
                  options: [
                    { value: "all", label: "All classes" },
                    ...CLASS_OPTIONS.map((g) => ({ value: g, label: `Grade ${g}` })),
                  ],
                },
                {
                  id: "section",
                  label: "Section",
                  value: sectionFilter,
                  onChange: (v) => setSectionFilter(v as SectionFilter),
                  options: [
                    { value: "all", label: "All" },
                    ...SECTION_OPTIONS.map((s) => ({ value: s, label: s })),
                  ],
                },
                {
                  id: "roll",
                  label: "Roll no.",
                  kind: "text",
                  value: rollNo,
                  clearValues: [""],
                  placeholder: "e.g. 12",
                  onChange: (v) => setRollNo(v.replace(/\D/g, "").slice(0, 3)),
                },
                {
                  id: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as typeof statusFilter),
                  options: [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Pending" },
                    { value: "hold", label: "Hold" },
                    { value: "suspended", label: "Suspended" },
                  ],
                },
              ]}
            />
          </div>
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
          <>
            <div className="lx-people-list sm:hidden">
              {list.map((a) => {
                const visibleChildren = scoped
                  ? (a.linkedChildren ?? []).filter((c) =>
                      childMatchesScope(c, classFilter, sectionFilter, rollNo),
                    )
                  : (a.linkedChildren ?? []);
                const linked =
                  a.role === "Student" && a.classSection
                    ? `Grade ${a.classSection}${a.rollNo ? ` · Roll ${a.rollNo}` : ""}`
                    : a.role === "Teacher" && a.assignedSections?.length
                      ? a.assignedSections.join(", ")
                      : a.role === "Parent" && visibleChildren.length > 0
                        ? visibleChildren.map((c) => `${c.name} (${c.classSection})`).join(" · ")
                        : a.portal;
                return (
                  <PeopleDirectoryCard
                    key={a.id}
                    name={a.name}
                    id={`${a.id} · ${a.role}`}
                    status={<AccountStatusPill status={a.status} />}
                    meta={
                      <>
                        <span>{linked}</span>
                        <span>{a.lastLogin}</span>
                      </>
                    }
                    menu={
                      <AccountRowMenu
                        account={a}
                        onView={() => {
                          setShowPassword(false);
                          setSelected(a);
                        }}
                        onSuspend={() => suspend(a.id)}
                        onHold={() => hold(a.id)}
                        onReactivate={() => reactivate(a.id)}
                        onResendInvite={() => activatePending(a.id)}
                        onDelete={() => setPendingDelete(a)}
                      />
                    }
                    onOpen={() => {
                      setShowPassword(false);
                      setSelected(a);
                    }}
                  />
                );
              })}
            </div>
            <div className="hidden sm:block">
          <DataTable>
            <thead>
              <tr>
                <Th>Account</Th>
                <Th>Role</Th>
                <Th>Class / Linked</Th>
                <Th>Roll no.</Th>
                <Th>Last login</Th>
                <Th>Status</Th>
                <Th className="w-36 text-right">
                  <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                    {list.length} results
                  </span>
                </Th>
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
                  <tr
                    key={a.id}
                    className="hover:bg-surface-hover cursor-pointer"
                    onClick={() => {
                      setShowPassword(false);
                      setSelected(a);
                    }}
                  >
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{a.id}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">{a.role}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[220px]">
                      {a.role === "Student" && a.classSection ? `Grade ${a.classSection}` : null}
                      {a.role === "Teacher" && a.assignedSections?.length
                        ? a.assignedSections.join(", ")
                        : null}
                      {a.role === "Parent" && visibleChildren.length > 0
                        ? visibleChildren.map((c) => `${c.name} (${c.classSection})`).join(", ")
                        : null}
                      {a.role === "Sub-admin" ? a.portal : null}
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
                      <AccountStatusPill status={a.status} />
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end">
                        <AccountRowMenu
                          account={a}
                          onView={() => {
                            setShowPassword(false);
                            setSelected(a);
                          }}
                          onSuspend={() => suspend(a.id)}
                          onHold={() => hold(a.id)}
                          onReactivate={() => reactivate(a.id)}
                          onResendInvite={() => activatePending(a.id)}
                          onDelete={() => setPendingDelete(a)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete account?"
        subtitle={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.name} (${pendingDelete.role}).`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) removeAccount(pendingDelete.id);
              }}
            >
              Delete account
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Portal access for this account will stop immediately. This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          setShowPassword(false);
        }}
        title={selected ? `${selected.name}` : "Account details"}
        subtitle={
          selected
            ? `${selected.role} portal account · ${selected.id}`
            : undefined
        }
        size="lg"
        footer={
          <Button
            onClick={() => {
              setSelected(null);
              setShowPassword(false);
            }}
          >
            Close
          </Button>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="info">{selected.role}</Pill>
              <AccountStatusPill status={selected.status} />
              <span className="text-[11px] text-muted-foreground">
                Last login · {selected.lastLogin}
              </span>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 text-xs font-semibold">Account basic information</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Full name" value={selected.name} />
                <DetailField label="Portal" value={selected.portal} />
                <DetailField label="Email" value={selected.email || "—"} />
                <DetailField label="Mobile number" value={selected.phone || "—"} />
                <div className="sm:col-span-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Account password
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <span className="flex-1 font-mono text-xs">
                      {showPassword ? selected.password : "••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {selected.role === "Teacher" && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <div className="text-xs font-semibold">Teacher profile</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Employee ID" value={selected.employeeId ?? "—"} />
                  <DetailField label="Department" value={selected.department ?? "—"} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Subjects
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.subjects ?? []).length > 0 ? (
                      selected.subjects!.map((subject) => (
                        <Pill key={subject} tone="info">
                          {subject}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No subjects assigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Class & section assignments
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.assignedSections ?? []).length > 0 ? (
                      selected.assignedSections!.map((section) => (
                        <Pill key={section} tone="neutral">
                          Grade {section}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No classes assigned</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selected.role === "Student" && (
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs font-semibold mb-3">Student profile</div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <DetailField label="Student ID" value={selected.studentId ?? "—"} />
                  <DetailField
                    label="Class & section"
                    value={selected.classSection ? `Grade ${selected.classSection}` : "—"}
                  />
                  <DetailField label="Roll number" value={selected.rollNo ?? "—"} />
                </div>
              </div>
            )}

            {selected.role === "Parent" && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold">Linked children</div>
                  <Pill tone="info">
                    {(selected.linkedChildren ?? []).length}{" "}
                    {(selected.linkedChildren ?? []).length === 1 ? "child" : "children"} linked
                  </Pill>
                </div>
                {(selected.linkedChildren ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {selected.linkedChildren!.map((child) => {
                      const [className, section = "—"] = child.classSection.split("-");
                      return (
                        <div
                          key={child.studentId}
                          className="rounded-md border border-border bg-background/40 p-3"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold">{child.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {child.studentId}
                              </div>
                            </div>
                            <Pill tone="neutral">Roll {child.rollNo}</Pill>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <DetailField label="Class" value={`Grade ${className}`} />
                            <DetailField label="Section" value={section} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No linked students</span>
                )}
              </div>
            )}

            {selected.role === "Sub-admin" && (
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs font-semibold mb-3">Sub-admin profile</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Employee ID" value={selected.employeeId ?? "—"} />
                  <DetailField label="Department" value={selected.department ?? "—"} />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-xs font-medium break-all">{value}</div>
    </div>
  );
}

function AccountRowMenu({
  account,
  onView,
  onSuspend,
  onHold,
  onReactivate,
  onResendInvite,
  onDelete,
}: {
  account: Account;
  onView: () => void;
  onSuspend: () => void;
  onHold: () => void;
  onReactivate: () => void;
  onResendInvite: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Account actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-pop">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => run(onView)}
          >
            View details
          </button>
          {account.status === "pending" && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onResendInvite)}
            >
              Resend invite
            </button>
          )}
          {(account.status === "suspended" || account.status === "hold") && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onReactivate)}
            >
              Reactivate
            </button>
          )}
          {account.status !== "hold" && account.status !== "suspended" && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onHold)}
            >
              Hold
            </button>
          )}
          {account.status !== "suspended" && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => run(onSuspend)}
            >
              Suspend
            </button>
          )}
          <div className="border-t border-border" />
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
            onClick={() => run(onDelete)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
