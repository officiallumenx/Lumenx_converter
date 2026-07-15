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
  Th as TableTh,
  IconButton,
} from "@lumenx/ui-admin";
import {
  filterAdminStudents,
  sortAdminStudents,
  type AdminStudentRecord,
  type AdminStudentSortKey,
  type StudentStatus,
} from "@lumenx/module-students";
import {
  Filter,
  Plus,
  MoreHorizontal,
  Download,
  ArrowUpDown,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { getMockStudentsForProfile, isCollegeMode } from "@/lib/academic-data";
import {
  getClassFilterOptions,
  getDepartmentFilterOptions,
  getSectionFilterOptions,
  matchesClassSection,
  classSectionLabel,
  formatCollegeBatch,
  formatStudentGradeDisplay,
  type ClassFilter,
  type DepartmentFilter,
  type SectionFilter,
} from "@/lib/class-section-filter";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "Students — LumenX Admin" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const notify = useAdminToast();
  const { profileId, profile } = useDemoProfile();
  const college = isCollegeMode();
  const classOptions = getClassFilterOptions();
  const sectionOptions = getSectionFilterOptions();
  const departmentOptions = getDepartmentFilterOptions();
  const defaultLevel = profile.academic.levels[0]!.label;
  const defaultDept = profile.academic.departments[0]?.code ?? "MPC";

  const [rows, setRows] = useState<AdminStudentRecord[]>(() => getMockStudentsForProfile());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | StudentStatus>("all");
  const [sort, setSort] = useState<{ key: AdminStudentSortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [open, setOpen] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
  const [attMin, setAttMin] = useState(0);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState(defaultLevel);
  const [newSection, setNewSection] = useState("A");
  const [newDepartment, setNewDepartment] = useState(defaultDept);
  const [newEmail, setNewEmail] = useState("");
  const [newParent, setNewParent] = useState("");

  useEffect(() => {
    setRows(getMockStudentsForProfile());
    setClassFilter("all");
    setSectionFilter("all");
    setDepartmentFilter("all");
    const { levels, departments } = profile.academic;
    setNewGrade(levels[0]!.label);
    setNewDepartment(departments[0]?.code ?? "MPC");
  }, [profileId, profile.academic]);

  const list = useMemo(() => {
    let filtered = filterAdminStudents(rows, q, filter);
    filtered = filtered.filter((s) =>
      matchesClassSection(s.grade, classFilter, sectionFilter, departmentFilter),
    );
    if (attMin > 0) filtered = filtered.filter((s) => s.attendance >= attMin);
    return sortAdminStudents(filtered, sort.key, sort.dir);
  }, [q, filter, sort, classFilter, sectionFilter, departmentFilter, attMin, rows]);

  const scopeLabel = classSectionLabel(classFilter, sectionFilter, departmentFilter);

  const admitStudent = () => {
    if (!newName.trim()) return;
    const id = `STU-${1000 + rows.length + 1}`;
    const levelMeta = profile.academic.levels.find((l) => l.label === newGrade);
    const gradeKey = college
      ? formatCollegeBatch(newDepartment, levelMeta?.shortLabel ?? "FY", newSection)
      : `${newGrade.replace("Grade ", "")}-${newSection}`;
    setRows((prev) => [
      ...prev,
      {
        id,
        name: newName.trim(),
        grade: gradeKey,
        attendance: 100,
        gpa: 0,
        status: "active" as const,
        parent: newParent.trim() || "—",
      },
    ]);
    setNewName("");
    setNewEmail("");
    setNewParent("");
    setOpen(false);
    notify(
      `${newName.trim()} admitted · credentials ${newEmail ? "sent to " + newEmail : "pending invite"}`,
    );
  };

  const toggleSort = (k: AdminStudentSortKey) =>
    setSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }));
  const SortTh = ({ k, label }: { k: AdminStudentSortKey; label: string }) => (
    <TableTh>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-0.5"
      >
        {label}
        <ArrowUpDown className="size-3 opacity-60" />
      </button>
    </TableTh>
  );

  const statusOptions = [
    { value: "all" as const, label: "All" },
    { value: "active" as const, label: "Active" },
    { value: "watch" as const, label: "Needs attention" },
    { value: "at-risk" as const, label: "At risk" },
    { value: "inactive" as const, label: "Inactive" },
  ];

  return (
    <AppShell
      title="Student Directory"
      subtitle={`${list.length} students · ${scopeLabel}`}
      actions={
        <>
          <Button onClick={() => setBulk(true)}>
            <Upload className="size-3.5" /> Bulk Import
          </Button>
          <Button onClick={() => notify("Student export queued — CSV will download shortly")}>
            <Download className="size-3.5" /> Export CSV
          </Button>
          <Button onClick={() => setFiltersOpen(!filtersOpen)}>
            <Filter className="size-3.5" /> Filters
          </Button>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> Add Student
          </Button>
        </>
      }
    >
      <Card>
        <PageToolbar>
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or ID…"
            className="flex-1 min-w-[200px]"
          />
          <ToolbarGroup>
            <SegmentedControl value={filter} onChange={setFilter} options={statusOptions} />
          </ToolbarGroup>
          <ToolbarGroup>
            {college && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Dept
                </div>
                <Select
                  fieldSize="compact"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value as DepartmentFilter)}
                  className="w-24"
                >
                  <option value="all">All</option>
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {college ? "Year" : "Class"}
              </div>
              <Select
                fieldSize="compact"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value as ClassFilter)}
                className="w-28"
              >
                <option value="all">{college ? "All years" : "All classes"}</option>
                {classOptions.map((g) => {
                  const level = profile.academic.levels.find((l) => l.shortLabel === g);
                  return (
                    <option key={g} value={g}>
                      {level?.label ?? g}
                    </option>
                  );
                })}
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
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>
        {filtersOpen && (
          <div className="px-4 sm:px-5 py-4 border-b border-border flex flex-wrap gap-4 bg-background/40">
            <Field label="Min attendance %">
              <TextInput
                fieldSize="compact"
                type="number"
                value={attMin || ""}
                onChange={(e) => setAttMin(Number(e.target.value) || 0)}
                className="w-24"
                placeholder="0"
              />
            </Field>
            {(classFilter !== "all" || sectionFilter !== "all" || departmentFilter !== "all") && (
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setClassFilter("all");
                    setSectionFilter("all");
                    setDepartmentFilter("all");
                  }}
                >
                  Clear class filter
                </Button>
              </div>
            )}
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No students found"
            hint={`No students in ${scopeLabel}. Try another class, section, or search term.`}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <SortTh k="name" label="Student" />
                <SortTh k="grade" label={college ? "Dept / Year / Sec" : "Class"} />
                <SortTh k="attendance" label="Attendance" />
                <SortTh k="gpa" label="GPA" />
                <TableTh>Guardian</TableTh>
                <TableTh>Status</TableTh>
                <TableTh className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to="/students/$id"
                      params={{ id: s.id }}
                      className="flex items-center gap-3 group"
                    >
                      <div className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono">
                        {s.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="text-xs font-medium group-hover:text-primary">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{s.id}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs">{formatStudentGradeDisplay(s.grade)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded bg-muted overflow-hidden">
                        <div
                          className={`h-full ${s.attendance < 75 ? "bg-destructive" : s.attendance < 90 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${s.attendance}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">{s.attendance}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono">{s.gpa.toFixed(1)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{s.parent}</td>
                  <td className="px-5 py-3">
                    {s.status === "active" && <Pill tone="success">Active</Pill>}
                    {s.status === "watch" && <Pill tone="warning">Needs attention</Pill>}
                    {s.status === "at-risk" && <Pill tone="danger">At risk</Pill>}
                    {s.status === "inactive" && <Pill tone="neutral">Inactive</Pill>}
                  </td>
                  <td className="px-5 py-3">
                    <IconButton
                      label="More actions"
                      className="border-0 bg-transparent hover:bg-surface-hover"
                    >
                      <MoreHorizontal className="size-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {list.length === 0 ? "No matches" : `Showing 1–${list.length} of ${rows.length}`}
            {classFilter !== "all" || sectionFilter !== "all" ? ` · ${scopeLabel}` : ""}
          </span>
          <div className="flex gap-1">
            <Button>Previous</Button>
            <Button>Next</Button>
          </div>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Admit new student"
        subtitle="Issue credentials and assign class on completion"
        size="lg"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={admitStudent} disabled={!newName.trim()}>
              <UserPlus className="size-3.5" /> Admit student
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
          <Field label="Date of birth" required>
            <TextInput type="date" defaultValue="2010-01-15" />
          </Field>
          <Field label="Gender">
            <Select defaultValue="Female">
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Admission number" hint="auto if blank">
            <TextInput placeholder="STU-XXXX" disabled className="opacity-60" />
          </Field>
          {college && (
            <Field label={profile.academic.departmentLabel} required>
              <Select value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
                {profile.academic.departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={college ? "Year" : "Grade"} required>
            <Select value={newGrade} onChange={(e) => setNewGrade(e.target.value)}>
              {profile.academic.levels.map((l) => (
                <option key={l.id} value={l.label}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required>
            <Select value={newSection} onChange={(e) => setNewSection(e.target.value)}>
              {sectionOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Branch">
            <Select defaultValue="Branch Alpha">
              <option>Branch Alpha</option>
              <option>Branch Beta</option>
              <option>Branch Gamma</option>
            </Select>
          </Field>
          <Field label="Guardian name">
            <TextInput
              value={newParent}
              onChange={(e) => setNewParent(e.target.value)}
              placeholder="Parent name"
            />
          </Field>
          <Field label="Contact email">
            <TextInput
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="student@institute.edu"
            />
          </Field>
          <Field label="Issue credentials">
            <Select defaultValue="Email invite">
              <option>Email invite</option>
              <option>Generate temp password</option>
              <option>Skip for now</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={bulk}
        onClose={() => setBulk(false)}
        title="Bulk import students"
        subtitle="Upload an Excel or CSV file — duplicates are detected and parents auto-linked"
        size="lg"
        footer={
          <>
            <Button onClick={() => setBulk(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setBulk(false);
                notify("Import validated — 24 students queued for admission");
              }}
            >
              <Upload className="size-3.5" /> Validate & Import
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <div className="rounded-xl border-2 border-dashed border-border bg-background/40 hover:border-primary/50 hover:bg-primary/[0.03] transition-colors p-8 text-center cursor-pointer">
              <div className="mx-auto size-12 rounded-xl bg-accent flex items-center justify-center mb-3">
                <FileSpreadsheet className="size-5 text-primary" />
              </div>
              <div className="text-sm font-medium">Drop .xlsx or .csv file</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Max 10MB · 5,000 rows per upload
              </div>
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
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.l}
                </div>
                <div className="font-medium mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
          <a className="text-[11px] text-primary hover:underline cursor-pointer">
            ↓ Download CSV template (students.csv)
          </a>
        </div>
      </Modal>
    </AppShell>
  );
}
