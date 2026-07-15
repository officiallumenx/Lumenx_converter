import { useState, useMemo } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  FormGrid,
  FormStack,
  KpiGrid,
  Kpi,
  Modal,
  PageStack,
  Pill,
  SearchInput,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import {
  DEMO_STUDENTS,
  AVAILABLE_GRADES,
  AVAILABLE_CLASSES,
  buildVariableMap,
  resolveText,
  generateDocNumber,
  extractUsedVariables,
  studentsForScope,
  VARIABLE_CATALOGUE,
  type DemoStudent,
  type GenerateScope,
} from "@/lib/doc-generation-data";
import { getAllTemplates, generateDocumentBatch } from "@/lib/template-management/store";
import type { TemplateRecord } from "@/lib/template-management/types";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  School,
  Search,
  User,
  Users,
  Wand2,
  X,
} from "lucide-react";

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Scope", "Students", "Template", "Preview & Edit", "Generate"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto lx-sidebar-scroll pb-1">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              active ? "bg-primary/10 text-primary" :
              done ? "text-emerald-600" : "text-muted-foreground"
            }`}>
              <div className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                active ? "bg-primary text-primary-foreground" :
                done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="size-3" /> : idx}
              </div>
              {label}
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 – Scope ───────────────────────────────────────────────────────────

const SCOPE_OPTIONS: {
  scope: GenerateScope;
  icon: typeof User;
  title: string;
  desc: string;
}[] = [
  { scope: "single", icon: User, title: "Single student", desc: "Issue a document to one specific student" },
  { scope: "multiple", icon: Users, title: "Multiple students", desc: "Hand-pick specific students from the roster" },
  { scope: "class", icon: BookOpen, title: "Entire class", desc: "All students in a specific class & section" },
  { scope: "grade", icon: GraduationCap, title: "Entire grade", desc: "Every student across all sections of a grade" },
  { scope: "school", icon: School, title: "Entire school", desc: `All ${DEMO_STUDENTS.length} students in the institute` },
];

function Step1Scope({ value, onChange }: { value: GenerateScope | null; onChange: (s: GenerateScope) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Who should receive this document?</h3>
        <p className="text-sm text-muted-foreground mt-1">Select the audience scope for this generation batch.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SCOPE_OPTIONS.map(({ scope, icon: Icon, title, desc }) => {
          const isSelected = value === scope;
          return (
            <button
              key={scope}
              type="button"
              onClick={() => onChange(scope)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <div className="mb-3">
                <IconChip icon={Icon} size="md" variant={isSelected ? "brand" : "soft"} active={isSelected} />
              </div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              {isSelected && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-primary font-semibold">
                  <CheckCircle2 className="size-3" /> Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2 – Student selection ───────────────────────────────────────────────

function StudentRow({
  student,
  selected,
  multi,
  onToggle,
}: {
  student: DemoStudent;
  selected: boolean;
  multi: boolean;
  onToggle: () => void;
}) {
  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
      selected ? "bg-primary/5 border border-primary/30" : "border border-transparent hover:bg-surface-hover"
    }`}>
      <input
        type={multi ? "checkbox" : "radio"}
        checked={selected}
        onChange={onToggle}
        className="accent-primary"
      />
      <div className="size-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
        {student.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{student.name}</p>
        <p className="text-[10px] text-muted-foreground">{student.classLabel} · {student.admissionNo}</p>
      </div>
    </label>
  );
}

function Step2Students({
  scope,
  selectedIds,
  setSelectedIds,
  selectedClass,
  setSelectedClass,
  selectedGrade,
  setSelectedGrade,
}: {
  scope: GenerateScope;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  selectedClass: string;
  setSelectedClass: (c: string) => void;
  selectedGrade: number | null;
  setSelectedGrade: (g: number | null) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const base = DEMO_STUDENTS;
    if (!q) return base;
    const lq = q.toLowerCase();
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(lq) ||
        s.classLabel.toLowerCase().includes(lq) ||
        s.admissionNo.toLowerCase().includes(lq),
    );
  }, [q]);

  if (scope === "school") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Entire school selected</h3>
        <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-2">
          <School className="size-12 mx-auto text-muted-foreground/30" />
          <p className="text-2xl font-bold">{DEMO_STUDENTS.length}</p>
          <p className="text-sm text-muted-foreground">students will receive this document</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {AVAILABLE_GRADES.map((g) => {
              const cnt = DEMO_STUDENTS.filter((s) => s.grade === g).length;
              return (
                <span key={g} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                  Grade {g}: {cnt}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (scope === "class") {
    const classStudents = DEMO_STUDENTS.filter((s) => s.classLabel === selectedClass);
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Select a class</h3>
        <Field label="Class">
          <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Choose a class…</option>
            {AVAILABLE_CLASSES.map((cl) => (
              <option key={cl} value={cl}>
                Class {cl} ({DEMO_STUDENTS.filter((s) => s.classLabel === cl).length} students)
              </option>
            ))}
          </Select>
        </Field>
        {selectedClass && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
            <p className="font-semibold text-emerald-700">{classStudents.length} students in {selectedClass}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {classStudents.map((s) => (
                <span key={s.id} className="px-2 py-0.5 rounded bg-background border border-border text-xs">{s.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (scope === "grade") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Select a grade</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {AVAILABLE_GRADES.map((g) => {
            const cnt = DEMO_STUDENTS.filter((s) => s.grade === g).length;
            const isSelected = selectedGrade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(isSelected ? null : g)}
                className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-surface hover:border-border-strong text-foreground"
                }`}
              >
                <span className="text-xs font-mono text-muted-foreground">{["VI","VII","VIII","IX","X","XI","XII"][g-6]}</span>
                <span className="mt-0.5">Gr. {g}</span>
                <span className="text-[10px] text-muted-foreground font-normal mt-0.5">{cnt} students</span>
              </button>
            );
          })}
        </div>
        {selectedGrade && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
            <p className="font-semibold text-emerald-700">
              {DEMO_STUDENTS.filter((s) => s.grade === selectedGrade).length} students in Grade {selectedGrade}
            </p>
          </div>
        )}
      </div>
    );
  }

  // single or multiple
  const multi = scope === "multiple";
  const toggle = (id: string) => {
    if (!multi) {
      setSelectedIds([id]);
    } else {
      setSelectedIds(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id],
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-base">
          {multi ? "Select students" : "Select a student"}
        </h3>
        {multi && selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{selectedIds.length} selected</span>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(filtered.map((s) => s.id))}>
              Select all {filtered.length > DEMO_STUDENTS.length ? "" : `(${filtered.length})`}
            </Button>
          </div>
        )}
      </div>
      <SearchInput
        placeholder="Search by name, class, admission no…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full"
      />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No students match your search.</div>
          ) : (
            filtered.map((stu) => (
              <StudentRow
                key={stu.id}
                student={stu}
                selected={selectedIds.includes(stu.id)}
                multi={multi}
                onToggle={() => toggle(stu.id)}
              />
            ))
          )}
        </div>
        {multi && (
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
            {selectedIds.length} of {DEMO_STUDENTS.length} students selected
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 – Template ────────────────────────────────────────────────────────

const KIND_LABELS = { certificate: "Certificate", report: "Report", document: "Document", id_card: "ID Card" };
const KIND_COLORS: Record<string, string> = {
  certificate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  report: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  document: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  id_card: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

function TemplateTile({ template, selected, onSelect }: { template: TemplateRecord; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-3 rounded-xl border-2 transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-surface hover:border-border-strong"
      }`}
    >
      {/* Thumbnail */}
      <div className={`w-full aspect-[3/4] rounded-lg overflow-hidden mb-2.5 flex items-center justify-center text-xs font-medium ${
        template.kind === "id_card" ? "bg-gradient-to-br from-blue-600 to-indigo-700" :
        template.kind === "certificate" ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200" :
        template.kind === "report" ? "bg-gradient-to-br from-blue-50 to-slate-100 border border-blue-100" :
        "bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200"
      }`}>
        {template.kind === "id_card" ? (
          <div className="flex flex-col items-center gap-1 text-white">
            <div className="size-8 rounded-full bg-white/20" />
            <div className="w-12 h-1.5 rounded bg-white/40" />
            <div className="w-8 h-1 rounded bg-white/30" />
          </div>
        ) : template.kind === "certificate" ? (
          <div className="flex flex-col items-center gap-1 p-2 w-full">
            <div className="w-full h-1 rounded bg-amber-300" />
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 mt-2" />
            <div className="w-16 h-1.5 rounded bg-amber-400/60 mt-1" />
            <div className="w-12 h-1 rounded bg-amber-300/50" />
            <div className="mt-2 w-full h-px bg-amber-200" />
          </div>
        ) : template.kind === "report" ? (
          <div className="flex flex-col gap-1.5 p-2 w-full">
            {[1,0.7,0.9,0.6,0.8].map((w,i) => (
              <div key={i} className="h-1 rounded bg-blue-200/80" style={{ width: `${w * 100}%` }} />
            ))}
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-2 rounded bg-blue-100 border border-blue-200" />)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-2 w-full">
            <div className="w-8 h-8 rounded bg-slate-200" />
            {[0.9,0.7,0.8,0.6].map((w,i) => (
              <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${w * 100}%` }} />
            ))}
          </div>
        )}
      </div>
      <p className="text-xs font-semibold leading-tight">{template.name}</p>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${KIND_COLORS[template.kind] ?? KIND_COLORS.document}`}>
          {KIND_LABELS[template.kind] ?? template.kind}
        </span>
        <span className="text-[10px] text-muted-foreground">{template.usageCount} uses</span>
      </div>
      {selected && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-primary font-semibold">
          <CheckCircle2 className="size-3" /> Selected
        </div>
      )}
    </button>
  );
}

type KindFilter = TemplateRecord["kind"] | "all";

function Step3Template({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const templates = useMemo(() => getAllTemplates().filter((t) => t.status === "active"), []);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (kind !== "all" && t.kind !== kind) return false;
      if (q) return t.name.toLowerCase().includes(q.toLowerCase());
      return true;
    });
  }, [templates, kind, q]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">Choose a template</h3>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search templates…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <div className="flex gap-1 p-1 bg-background rounded-md border border-border">
          {(["all", "certificate", "report", "document", "id_card"] as (KindFilter)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-2.5 h-8 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                kind === k ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? "All" : KIND_LABELS[k as TemplateRecord["kind"]]}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No templates found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((t) => (
            <TemplateTile key={t.id} template={t} selected={selectedId === t.id} onSelect={() => onSelect(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Document mini-preview ────────────────────────────────────────────────────

function MiniDocPreview({
  template,
  student,
  overrides,
  issueDate,
}: {
  template: TemplateRecord;
  student: DemoStudent;
  overrides: Record<string, string>;
  issueDate: string;
}) {
  const vars = buildVariableMap(student, issueDate);
  const vf = template.visualFields;
  const title = vf ? resolveText(vf.titleMain, vars, overrides) : template.name;
  const sub = vf ? resolveText(vf.titleSub, vars, overrides) : "";
  const body = vf ? resolveText(vf.bodyText, vars, overrides) : "";
  const sigLeft = vf?.signatoryLeftName ?? "Dr. Ramesh Kumar";
  const sigLeftTitle = vf?.signatoryLeftTitle ?? "Principal";
  const sigRight = vf?.signatoryRightName;
  const sigRightTitle = vf?.signatoryRightTitle;

  if (template.kind === "id_card") {
    return (
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-xl p-4 text-white w-full max-w-[240px] mx-auto shadow-lg">
        <div className="text-[9px] font-bold tracking-widest opacity-70 text-center uppercase mb-3">
          {resolveText("{{InstituteName}}", vars)}
        </div>
        <div className="size-14 rounded-full bg-white/20 mx-auto flex items-center justify-center text-lg font-bold">
          {student.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="mt-3 text-center">
          <p className="font-bold text-sm">{student.name}</p>
          <p className="text-[11px] opacity-80 mt-0.5">{student.classLabel}</p>
          <p className="text-[10px] opacity-60 mt-0.5 font-mono">{student.admissionNo}</p>
        </div>
        <div className="mt-3 pt-2 border-t border-white/20 text-[9px] opacity-60 text-center">
          Academic Year {student.academicYear}
        </div>
      </div>
    );
  }

  const borderClass =
    template.kind === "certificate"
      ? "border-amber-400"
      : template.kind === "report"
        ? "border-blue-400"
        : "border-slate-300";

  return (
    <div className={`bg-white rounded border-2 ${borderClass} p-4 text-slate-900 text-[10px] leading-relaxed w-full shadow-sm`}>
      {/* Header */}
      <div className="text-center mb-3 border-b border-current/20 pb-2">
        <div className="size-7 rounded-full bg-slate-100 mx-auto mb-1 flex items-center justify-center">
          <School className="size-4 text-slate-500" />
        </div>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest">LumenX International School</p>
        <p className="font-bold text-xs mt-1">{title}</p>
        {sub && <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p>}
      </div>

      {/* Body */}
      {body ? (
        <p className="text-[10px] text-slate-700 leading-relaxed">{body}</p>
      ) : (
        <div className="space-y-1">
          {["StudentName", "AdmissionNumber", "Class", "AcademicYear"].map((k) => (
            <div key={k} className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-500">{VARIABLE_CATALOGUE.find((v) => v.key === k)?.label}</span>
              <span className="font-medium">{vars[k] ?? "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Signatories */}
      <div className="mt-4 pt-2 border-t border-current/20 flex justify-between gap-4">
        <div className="text-center">
          <div className="h-4 border-b border-slate-400 mb-1" />
          <p className="font-medium">{sigLeft}</p>
          <p className="text-[9px] text-slate-500">{sigLeftTitle}</p>
        </div>
        {sigRight && (
          <div className="text-center">
            <div className="h-4 border-b border-slate-400 mb-1" />
            <p className="font-medium">{sigRight}</p>
            <p className="text-[9px] text-slate-500">{sigRightTitle}</p>
          </div>
        )}
      </div>

      {/* Issue date */}
      <p className="mt-2 text-[9px] text-slate-400 text-right">Issued: {issueDate}</p>
    </div>
  );
}

// ─── Per-student override modal ───────────────────────────────────────────────

function OverrideModal({
  student,
  template,
  issueDate,
  overrides,
  onSave,
  onClose,
}: {
  student: DemoStudent;
  template: TemplateRecord;
  issueDate: string;
  overrides: Record<string, string>;
  onSave: (o: Record<string, string>) => void;
  onClose: () => void;
}) {
  const vars = buildVariableMap(student, issueDate);
  const [local, setLocal] = useState<Record<string, string>>(overrides);

  // Find all variables used in this template's text content
  const usedInBody = useMemo(() => {
    const vf = template.visualFields;
    const texts = [
      vf?.bodyText ?? "",
      vf?.titleMain ?? "",
      vf?.titleSub ?? "",
      vf?.presentationLine ?? "",
      ...(template.blocks?.map((b) => b.content ?? "") ?? []),
    ].join(" ");
    return extractUsedVariables(texts);
  }, [template]);

  const catalogue = VARIABLE_CATALOGUE.filter((v) => usedInBody.includes(v.key));
  const others = VARIABLE_CATALOGUE.filter((v) => !usedInBody.includes(v.key));

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit document — ${student.name}`}
      subtitle={`${student.classLabel} · ${student.admissionNo} · Override resolved values`}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>
            <CheckCircle2 className="size-3.5" /> Save overrides
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {catalogue.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Used in this template</p>
            <FormStack>
              <FormGrid cols={2}>
                {catalogue.map(({ key, label }) => (
                  <Field key={key} label={label} hint={`Default: ${vars[key] ?? "—"}`}>
                    <TextInput
                      value={local[key] ?? ""}
                      placeholder={vars[key] ?? ""}
                      onChange={(e) =>
                        setLocal((prev) =>
                          e.target.value ? { ...prev, [key]: e.target.value } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)),
                        )
                      }
                    />
                  </Field>
                ))}
              </FormGrid>
            </FormStack>
          </div>
        )}
        {others.length > 0 && (
          <details className="group">
            <summary className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer list-none flex items-center gap-1">
              <ChevronRight className="size-3 group-open:rotate-90 transition-transform" /> Other variables
            </summary>
            <FormStack className="mt-2">
              <FormGrid cols={2}>
                {others.map(({ key, label }) => (
                  <Field key={key} label={label} hint={vars[key] ?? "—"}>
                    <TextInput
                      value={local[key] ?? ""}
                      placeholder={vars[key] ?? ""}
                      onChange={(e) =>
                        setLocal((prev) =>
                          e.target.value ? { ...prev, [key]: e.target.value } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)),
                        )
                      }
                    />
                  </Field>
                ))}
              </FormGrid>
            </FormStack>
          </details>
        )}
        {Object.keys(local).length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600">
            <span>{Object.keys(local).length} field{Object.keys(local).length !== 1 ? "s" : ""} overridden</span>
            <button type="button" onClick={() => setLocal({})} className="underline hover:no-underline">Clear all overrides</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Step 4 – Preview & Edit ──────────────────────────────────────────────────

function Step4Preview({
  students,
  template,
  issueDate,
  overrides,
  onOverride,
}: {
  students: DemoStudent[];
  template: TemplateRecord;
  issueDate: string;
  overrides: Record<string, Record<string, string>>;
  onOverride: (studentId: string, o: Record<string, string>) => void;
}) {
  const [activeId, setActiveId] = useState(students[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);

  const active = students.find((s) => s.id === activeId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-base">Preview &amp; edit documents</h3>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{students.length}</span> document{students.length !== 1 ? "s" : ""} will be generated for{" "}
          <span className="font-medium">{template.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[420px]">
        {/* Left — student list */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {students.length} Student{students.length !== 1 ? "s" : ""}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {students.map((stu) => {
              const hasOverrides = Object.keys(overrides[stu.id] ?? {}).length > 0;
              return (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => setActiveId(stu.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors ${
                    activeId === stu.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-hover"
                  }`}
                >
                  <div className="size-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                    {stu.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{stu.name}</p>
                    <p className="text-[10px] text-muted-foreground">{stu.classLabel}</p>
                  </div>
                  {hasOverrides && <div className="size-1.5 rounded-full bg-amber-500 shrink-0" title="Has overrides" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — preview */}
        <div className="lg:col-span-8 xl:col-span-9 rounded-xl border border-border overflow-hidden flex flex-col">
          {active ? (
            <>
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{active.name}</p>
                  <p className="text-[10px] text-muted-foreground">{active.classLabel} · {active.admissionNo}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(active.id)}>
                  <Edit3 className="size-3.5" /> Edit overrides
                </Button>
              </div>
              <div className="flex-1 p-4 sm:p-6 bg-muted/20 overflow-auto">
                <MiniDocPreview
                  template={template}
                  student={active}
                  overrides={overrides[active.id] ?? {}}
                  issueDate={issueDate}
                />
              </div>
              {Object.keys(overrides[active.id] ?? {}).length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-amber-500/5 text-[10px] text-amber-600 flex items-center gap-1.5">
                  <Edit3 className="size-3" />
                  {Object.keys(overrides[active.id]).length} field{Object.keys(overrides[active.id]).length !== 1 ? "s" : ""} overridden for this student
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a student to preview
            </div>
          )}
        </div>
      </div>

      {editingId && active && (
        <OverrideModal
          student={active}
          template={template}
          issueDate={issueDate}
          overrides={overrides[editingId] ?? {}}
          onSave={(o) => onOverride(editingId, o)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

// ─── Step 5 – Generate ────────────────────────────────────────────────────────

function Step5Generate({
  students,
  template,
  issueDate,
  overrides,
  onDone,
  onViewGenerated,
}: {
  students: DemoStudent[];
  template: TemplateRecord;
  issueDate: string;
  overrides: Record<string, Record<string, string>>;
  onDone: () => void;
  onViewGenerated: () => void;
}) {
  const [phase, setPhase] = useState<"confirm" | "generating" | "done">("confirm");
  const [progress, setProgress] = useState(0);
  const [batchResult, setBatchResult] = useState<{ batchId: string; count: number } | null>(null);
  const overrideCount = Object.values(overrides).filter((o) => Object.keys(o).length > 0).length;

  const handleGenerate = () => {
    setPhase("generating");
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        // Actually generate via the store
        const result = generateDocumentBatch({
          templateId: template.id,
          templateName: template.name,
          kind: template.kind,
          recipients: students.map((stu, i) => ({
            id: stu.id,
            name: stu.name,
            ref: stu.admissionNo,
            certificateNumber: generateDocNumber(
              template.visualFields?.documentNumberPrefix ?? "LXA/DOC/",
              i,
            ),
          })),
          actor: "Admin User",
        });
        setBatchResult(result);
        setPhase("done");
      }
      setProgress(Math.min(p, 100));
    }, 180);
  };

  if (phase === "confirm") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Review &amp; generate drafts</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Documents to generate</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-sm font-bold truncate">{template.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Template</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium mt-1 inline-block ${KIND_COLORS[template.kind] ?? ""}`}>
              {KIND_LABELS[template.kind] ?? template.kind}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-sm font-bold">{issueDate}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Issue date</p>
            {overrideCount > 0 && (
              <p className="text-[10px] text-amber-600 mt-1">{overrideCount} with overrides</p>
            )}
          </div>
        </div>

        {/* Student summary */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            Students
          </div>
          <div className="p-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {students.map((stu) => (
              <span key={stu.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                overrides[stu.id] && Object.keys(overrides[stu.id]).length > 0
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-700"
                  : "bg-background border-border"
              }`}>
                {stu.name}
                <span className="text-muted-foreground font-normal">({stu.classLabel})</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs text-blue-600">
          <Layers className="size-3.5 mt-0.5 shrink-0" />
          Generated documents will appear in <strong className="mx-1">Generated Documents</strong> as drafts.
          You can publish them to students separately.
        </div>

        <Button
          variant="primary"
          onClick={handleGenerate}
          className="w-full sm:w-auto"
        >
          <Wand2 className="size-4" />
          Generate {students.length} draft{students.length !== 1 ? "s" : ""}
        </Button>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="py-12 flex flex-col items-center gap-6">
        <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="text-center">
          <p className="font-semibold">Generating {students.length} document{students.length !== 1 ? "s" : ""}…</p>
          <p className="text-sm text-muted-foreground mt-1">Applying template and resolving variables</p>
        </div>
        <div className="w-full max-w-sm">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1.5">{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  // Done
  return (
    <div className="py-8 flex flex-col items-center gap-6 text-center">
      <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <CheckCircle2 className="size-9 text-emerald-500" />
      </div>
      <div>
        <h3 className="text-xl font-bold">Documents generated!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {batchResult?.count} draft{(batchResult?.count ?? 0) !== 1 ? "s" : ""} created and stored successfully.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center w-full max-w-sm">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold text-emerald-600">{batchResult?.count}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Drafts created</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono font-bold break-all">{batchResult?.batchId}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Batch ID</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="primary" onClick={onViewGenerated}>
          <Eye className="size-3.5" /> View generated documents
        </Button>
        <Button variant="ghost" onClick={onDone}>
          <Wand2 className="size-3.5" /> Generate another batch
        </Button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function DocGenerateView({ onViewGenerated }: { onViewGenerated: () => void }) {
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [scope, setScope] = useState<GenerateScope | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [issueDate] = useState(today);

  const resolvedStudents = useMemo((): DemoStudent[] => {
    if (!scope) return [];
    return studentsForScope(scope, {
      studentIds: selectedIds,
      classLabel: selectedClass,
      grade: selectedGrade ?? undefined,
    });
  }, [scope, selectedIds, selectedClass, selectedGrade]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return getAllTemplates().find((t) => t.id === selectedTemplateId) ?? null;
  }, [selectedTemplateId]);

  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return scope !== null;
      case 2:
        if (scope === "school") return true;
        if (scope === "class") return selectedClass !== "";
        if (scope === "grade") return selectedGrade !== null;
        return selectedIds.length > 0;
      case 3: return selectedTemplateId !== null;
      case 4: return true;
      default: return false;
    }
  };

  const resetWizard = () => {
    setStep(1);
    setScope(null);
    setSelectedIds([]);
    setSelectedClass("");
    setSelectedGrade(null);
    setSelectedTemplateId(null);
    setOverrides({});
  };

  const handleOverride = (studentId: string, o: Record<string, string>) => {
    setOverrides((prev) => ({ ...prev, [studentId]: o }));
  };

  return (
    <PageStack>
      {/* Back / breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-3.5" />
        Documents &amp; Records Studio
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-medium">Generate Documents</span>
      </div>

      {/* Wizard card */}
      <Card>
        <CardHeader title="Generate Documents" hint={`Step ${step} of 5`} />
        <CardBody>
          <div className="space-y-6">
            {/* Step bar */}
            <StepBar current={step} />

            {/* Step content */}
            {step === 1 && (
              <Step1Scope value={scope} onChange={(s) => { setScope(s); setSelectedIds([]); setSelectedClass(""); setSelectedGrade(null); }} />
            )}
            {step === 2 && scope && (
              <Step2Students
                scope={scope}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                selectedGrade={selectedGrade}
                setSelectedGrade={setSelectedGrade}
              />
            )}
            {step === 3 && (
              <Step3Template selectedId={selectedTemplateId} onSelect={setSelectedTemplateId} />
            )}
            {step === 4 && selectedTemplate && (
              <Step4Preview
                students={resolvedStudents}
                template={selectedTemplate}
                issueDate={issueDate}
                overrides={overrides}
                onOverride={handleOverride}
              />
            )}
            {step === 5 && selectedTemplate && (
              <Step5Generate
                students={resolvedStudents}
                template={selectedTemplate}
                issueDate={issueDate}
                overrides={overrides}
                onDone={resetWizard}
                onViewGenerated={onViewGenerated}
              />
            )}

            {/* Navigation buttons */}
            {step < 5 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (step === 1) resetWizard();
                    else setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
                  }}
                >
                  <ArrowLeft className="size-3.5" />
                  {step === 1 ? "Cancel" : "Back"}
                </Button>

                <div className="flex items-center gap-3">
                  {/* Summary of selections */}
                  {step >= 2 && resolvedStudents.length > 0 && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {resolvedStudents.length} student{resolvedStudents.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {step >= 3 && selectedTemplate && (
                    <span className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {selectedTemplate.name}
                    </span>
                  )}
                  <Button
                    variant="primary"
                    disabled={!canAdvance()}
                    onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
                  >
                    {step === 4 ? "Review & Generate" : "Continue"}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </PageStack>
  );
}
