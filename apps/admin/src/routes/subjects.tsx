import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select, SearchInput, PageToolbar, ToolbarSpacer, ToolbarMeta, DataTable, EmptyState, Th } from "@lumenx/ui-admin";
import { BookOpen, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  GRADES,
  SUBJECT_CATEGORIES,
  addSubject,
  assignTeachersToSubject,
  deleteSubject,
  getInstituteTeachers,
  getSubjectCatalog,
  updateSubject,
  type SubjectCatalogItem,
} from "@/lib/subjects-data";

export const Route = createFileRoute("/subjects")({
  head: () => ({ meta: [{ title: "Subjects — LumenX Admin" }] }),
  component: SubjectsPage,
});

type FormMode = "create" | "edit";

const emptyForm = () => ({
  name: "",
  code: "",
  category: SUBJECT_CATEGORIES[0]!,
  periods: "5",
  status: "active" as SubjectCatalogItem["status"],
  selectedGrades: ["Grade 10"] as string[],
});

function SubjectsPage() {
  const [catalog, setCatalog] = useState(() => getSubjectCatalog());
  const teachers = useMemo(() => getInstituteTeachers(), [catalog]);

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<SubjectCatalogItem | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<string>(SUBJECT_CATEGORIES[0]!);
  const [periods, setPeriods] = useState("5");
  const [status, setStatus] = useState<SubjectCatalogItem["status"]>("active");
  const [selectedGrades, setSelectedGrades] = useState<string[]>(["Grade 10"]);
  const [assignIds, setAssignIds] = useState<string[]>([]);

  const refresh = () => setCatalog(getSubjectCatalog());

  const list = useMemo(() => {
    return catalog.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = `${s.name} ${s.code} ${s.category}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [catalog, q, categoryFilter]);

  const resetForm = () => {
    const e = emptyForm();
    setName(e.name);
    setCode(e.code);
    setCategory(e.category);
    setPeriods(e.periods);
    setStatus(e.status);
    setSelectedGrades(e.selectedGrades);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormMode("create");
    setFormOpen(true);
  };

  const openEdit = (subject: SubjectCatalogItem) => {
    setFormMode("edit");
    setEditingId(subject.id);
    setName(subject.name);
    setCode(subject.code);
    setCategory(subject.category);
    setPeriods(String(subject.periodsPerWeek));
    setStatus(subject.status);
    setSelectedGrades([...subject.grades]);
    setFormOpen(true);
  };

  const openDelete = (subject: SubjectCatalogItem) => {
    setActiveSubject(subject);
    setDeleteOpen(true);
  };

  const toggleGrade = (g: string) => {
    setSelectedGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const openAssign = (subject: SubjectCatalogItem) => {
    setActiveSubject(subject);
    setAssignIds([...subject.assignedTeacherIds]);
    setAssignOpen(true);
  };

  const saveForm = () => {
    if (!name.trim() || !code.trim() || selectedGrades.length === 0) return;

    const payload = {
      name: name.trim(),
      code: code.trim(),
      category,
      periodsPerWeek: Number(periods) || 5,
      grades: selectedGrades,
      status,
    };

    if (formMode === "edit" && editingId) {
      updateSubject(editingId, payload);
    } else {
      addSubject(payload);
    }

    refresh();
    setFormOpen(false);
    resetForm();
  };

  const confirmDelete = () => {
    if (!activeSubject) return;
    deleteSubject(activeSubject.id);
    refresh();
    setDeleteOpen(false);
    setActiveSubject(null);
  };

  const saveAssignments = () => {
    if (!activeSubject) return;
    assignTeachersToSubject(activeSubject.id, assignIds);
    refresh();
    setAssignOpen(false);
    setActiveSubject(null);
  };

  const toggleTeacher = (id: string) => {
    setAssignIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  return (
    <AppShell
      title="Subjects"
      subtitle={`${catalog.length} subjects · create, edit, and assign teachers`}
      actions={
        <Button variant="primary" onClick={openCreate}>
          <Plus className="size-3.5" /> New subject
        </Button>
      }
    >
      <Card>
        <PageToolbar>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject name or code…" className="flex-1 min-w-[200px]" />
          <Select fieldSize="compact" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-40">
            <option value="all">All categories</option>
            {SUBJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>

        {list.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-5" />} title="No subjects found" hint="Try another search term or category filter." action={<Button variant="primary" onClick={openCreate}><Plus className="size-3.5" /> New subject</Button>} />
        ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Subject</Th>
              <Th>Category</Th>
              <Th>Grades</Th>
              <Th>Periods/wk</Th>
              <Th>Teachers</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
            <tbody className="divide-y divide-border">
              {list.map((s) => {
                const assigned = teachers.filter((t) => s.assignedTeacherIds.includes(t.id));
                return (
                  <tr key={s.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.code}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">{s.category}</td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground max-w-[180px]">
                      {s.grades.map((g) => g.replace("Grade ", "G")).join(", ")}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono">{s.periodsPerWeek}</td>
                    <td className="px-5 py-3">
                      {assigned.length === 0 ? (
                        <span className="text-[11px] text-warning">None assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assigned.slice(0, 3).map((t) => (
                            <Pill key={t.id} tone="neutral">
                              {t.name.split(" ")[0]}
                            </Pill>
                          ))}
                          {assigned.length > 3 && <Pill tone="neutral">+{assigned.length - 3}</Pill>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={s.status === "active" ? "success" : "warning"}>{s.status}</Pill>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="size-3" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openAssign(s)}>
                          <UserPlus className="size-3" /> Teachers
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDelete(s)}>
                          <Trash2 className="size-3" />
                        </Button>
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
        open={formOpen}
        onClose={() => { setFormOpen(false); resetForm(); }}
        title={formMode === "edit" ? "Edit subject" : "New subject"}
        subtitle={
          formMode === "edit"
            ? "Update subject details — changes apply to timetable generation"
            : "Subjects appear in timetable auto-generation for selected grades"
        }
        size="lg"
        footer={
          <>
            <Button onClick={() => { setFormOpen(false); resetForm(); }} className="mr-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveForm}
              disabled={!name.trim() || !code.trim() || selectedGrades.length === 0}
            >
              {formMode === "edit" ? "Save changes" : "Create subject"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Subject name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" />
          </Field>
          <Field label="Subject code" required>
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="MTH 101" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {SUBJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Periods per week">
            <TextInput type="number" min={1} max={12} value={periods} onChange={(e) => setPeriods(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SubjectCatalogItem["status"])}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Offered in grades" required>
              <div className="flex flex-wrap gap-2 mt-1">
                {GRADES.map((g) => (
                  <label
                    key={g}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${selectedGrades.includes(g) ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <input type="checkbox" checked={selectedGrades.includes(g)} onChange={() => toggleGrade(g)} />
                    {g}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setActiveSubject(null); }}
        title="Delete subject"
        footer={
          <>
            <Button onClick={() => { setDeleteOpen(false); setActiveSubject(null); }} className="mr-auto">
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="size-3.5" /> Delete subject
            </Button>
          </>
        }
      >
        {activeSubject && (
          <div className="space-y-3">
            <p className="text-sm">
              Delete <span className="font-semibold">{activeSubject.name}</span>{" "}
              <span className="font-mono text-muted-foreground">({activeSubject.code})</span>?
            </p>
            <p className="text-[11px] text-muted-foreground">
              This removes the subject from the catalog and timetable auto-generation. Teacher assignments for this
              subject will be cleared. This cannot be undone.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => { setAssignOpen(false); setActiveSubject(null); }}
        title={activeSubject ? `Assign teachers · ${activeSubject.name}` : "Assign teachers"}
        subtitle={activeSubject ? `${activeSubject.code} · select all qualified teachers for this subject` : undefined}
        size="lg"
        footer={
          <>
            <Button onClick={() => { setAssignOpen(false); setActiveSubject(null); }} className="mr-auto">
              Cancel
            </Button>
            <Button variant="primary" onClick={saveAssignments}>
              Save assignments
            </Button>
          </>
        }
      >
        {activeSubject && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assigned teachers are used by the timetable module for auto-generation and conflict checks.
            </p>
            <div className="rounded-lg border border-border divide-y divide-border">
              {teachers.map((t) => {
                const checked = assignIds.includes(t.id);
                const related =
                  t.department.toLowerCase().includes(activeSubject.name.toLowerCase()) ||
                  t.subjects.some((sub) => sub === activeSubject.code || sub === activeSubject.name);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-hover ${checked ? "bg-primary/5" : ""}`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleTeacher(t.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {t.name}
                        {related && <Pill tone="info">Related dept</Pill>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t.department} · {t.qualification} · {t.experienceYears} years
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <BookOpen className="size-3.5" />
              {assignIds.length} teacher{assignIds.length !== 1 ? "s" : ""} selected for {activeSubject.code}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
