import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Button,
  Pill,
  Modal,
  Field,
  TextInput,
  Select,
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
import { Plus, Mail, Phone, KeyRound, Power, Users, UserCheck } from "lucide-react";
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

export const Route = createFileRoute("/parents")({
  head: () => ({ meta: [{ title: "Parents — LumenX Admin" }] }),
  component: ParentsPage,
});

type ParentStatus = "active" | "pending" | "suspended";

type ParentChild = {
  name: string;
  studentId: string;
  classSection: string;
};

type Parent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  children: ParentChild[];
  status: ParentStatus;
};

const INITIAL: Parent[] = [
  {
    id: "PAR-2201",
    name: "Rohan Sharma",
    email: "rohan@kin.io",
    phone: "+91 98765 11020",
    children: [{ name: "Aanya Sharma", studentId: "STU-1042", classSection: "10-A" }],
    status: "active",
  },
  {
    id: "PAR-2202",
    name: "Mira Draxler",
    email: "mira.d@kin.io",
    phone: "+49 175 220 4421",
    children: [{ name: "Julian Draxler", studentId: "STU-1043", classSection: "11-C" }],
    status: "active",
  },
  {
    id: "PAR-2203",
    name: "Susan Wright",
    email: "swright@kin.io",
    phone: "+1 415 552 9001",
    children: [{ name: "Ethan Wright", studentId: "STU-1044", classSection: "10-B" }],
    status: "pending",
  },
  {
    id: "PAR-2204",
    name: "Imran Khan",
    email: "ikhan@kin.io",
    phone: "+92 333 552 8810",
    children: [{ name: "Sana Khan", studentId: "STU-1045", classSection: "12-A" }],
    status: "active",
  },
  {
    id: "PAR-2205",
    name: "Carla Moreno",
    email: "cmoreno@kin.io",
    phone: "+34 612 998 110",
    children: [{ name: "Alina Moreno", studentId: "STU-1046", classSection: "9-A" }],
    status: "suspended",
  },
  {
    id: "PAR-2206",
    name: "Hyun Lee",
    email: "hlee@kin.io",
    phone: "+82 10 9912 4421",
    children: [{ name: "Marcus Lee", studentId: "STU-1047", classSection: "11-A" }],
    status: "active",
  },
  {
    id: "PAR-2207",
    name: "Kavita Patel",
    email: "kpatel@kin.io",
    phone: "+91 98220 44102",
    children: [{ name: "Priya Patel", studentId: "STU-1048", classSection: "9-B" }],
    status: "active",
  },
  {
    id: "PAR-2208",
    name: "Fadi Haddad",
    email: "fhaddad@kin.io",
    phone: "+971 50 882 1100",
    children: [{ name: "Omar Haddad", studentId: "STU-1049", classSection: "12-B" }],
    status: "active",
  },
];

function childMatchesFilter(
  child: ParentChild,
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
) {
  return matchesClassSection(child.classSection, classFilter, sectionFilter);
}

function ParentsPage() {
  const notify = useAdminToast();
  const [rows, setRows] = useState(INITIAL);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ParentStatus>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const scopeLabel = classSectionLabel(classFilter, sectionFilter);
  const classScoped = classFilter !== "all" || sectionFilter !== "all";

  const list = useMemo(() => {
    return rows
      .map((p) => {
        const matchingChildren = p.children.filter((c) =>
          childMatchesFilter(c, classFilter, sectionFilter),
        );
        return {
          parent: p,
          matchingChildren,
          visibleChildren: classScoped ? matchingChildren : p.children,
        };
      })
      .filter(({ parent, matchingChildren }) => {
        if (classScoped && matchingChildren.length === 0) return false;
        if (statusFilter !== "all" && parent.status !== statusFilter) return false;
        if (!q) return true;
        const lq = q.toLowerCase();
        return (
          parent.name.toLowerCase().includes(lq) ||
          parent.email.toLowerCase().includes(lq) ||
          parent.children.some(
            (c) => c.name.toLowerCase().includes(lq) || c.classSection.includes(lq),
          )
        );
      });
  }, [rows, q, statusFilter, classFilter, sectionFilter, classScoped]);

  const suspend = (id: string) => {
    const parent = rows.find((r) => r.id === id);
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: "suspended" as const } : r)));
    notify(`${parent?.name ?? "Guardian"} suspended`);
  };

  const reactivate = (id: string) => {
    const parent = rows.find((r) => r.id === id);
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: "active" as const } : r)));
    notify(`${parent?.name ?? "Guardian"} reactivated · portal access restored`);
  };

  const resendInvite = (id: string) => {
    const parent = rows.find((r) => r.id === id);
    setRows((p) =>
      p.map((r) =>
        r.id === id && r.status === "pending" ? { ...r, status: "active" as const } : r,
      ),
    );
    notify(`Invite sent · ${parent?.name ?? "Guardian"} is now active`);
  };

  const addParent = () => {
    if (!newName.trim()) return;
    setRows((p) => [
      ...p,
      {
        id: `PAR-${Date.now()}`,
        name: newName.trim(),
        email: "",
        phone: "",
        children: [],
        status: "pending",
      },
    ]);
    setNewName("");
    setOpen(false);
  };

  return (
    <AppShell
      title="Parent Directory"
      subtitle={`${list.length} guardians · ${scopeLabel}`}
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add Parent
        </Button>
      }
    >
      <Card>
        <PageToolbar>
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, or child…"
            className="flex-1 min-w-[200px]"
          />
          <ToolbarGroup>
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
          </ToolbarGroup>
          <ToolbarGroup>
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
            {classScoped && (
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setClassFilter("all");
                    setSectionFilter("all");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>

        {list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No guardians found"
            hint={`No guardians linked to students in ${scopeLabel}. Try another class or section.`}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Guardian</Th>
                <Th>Contact</Th>
                <Th>Linked Children{classScoped ? ` · ${scopeLabel}` : ""}</Th>
                <Th>Status</Th>
                <Th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(({ parent: p, visibleChildren }) => (
                <tr key={p.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{p.id}</div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3" />
                      {p.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                      <Phone className="size-3" />
                      {p.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {visibleChildren.map((c) => (
                        <Link
                          key={c.studentId}
                          to="/students/$id"
                          params={{ id: c.studentId }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-accent border border-border hover:border-primary/30"
                        >
                          <span>{c.name}</span>
                          <span className="text-muted-foreground font-mono">
                            ({c.classSection})
                          </span>
                        </Link>
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
                      {p.status === "pending" && (
                        <IconButton
                          label="Resend invite"
                          size="sm"
                          onClick={() => resendInvite(p.id)}
                        >
                          <KeyRound className="size-3.5" />
                        </IconButton>
                      )}
                      {p.status === "suspended" && (
                        <IconButton
                          label="Reactivate guardian"
                          size="sm"
                          className="border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => reactivate(p.id)}
                        >
                          <UserCheck className="size-3.5" />
                        </IconButton>
                      )}
                      {p.status !== "suspended" && (
                        <IconButton
                          label="Suspend guardian"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => suspend(p.id)}
                        >
                          <Power className="size-3.5" />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Guardian"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={addParent}>
              <Users className="size-3.5" /> Create & Link
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Maya Robinson"
            />
          </Field>
          <Field label="Relationship">
            <Select>
              <option>Mother</option>
              <option>Father</option>
              <option>Guardian</option>
            </Select>
          </Field>
          <Field label="Email">
            <TextInput type="email" placeholder="parent@example.com" />
          </Field>
          <Field label="Link child IDs">
            <TextInput placeholder="STU-1042, STU-1099" />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
