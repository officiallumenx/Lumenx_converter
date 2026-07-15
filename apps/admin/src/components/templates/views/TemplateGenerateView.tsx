import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Select,
  Pill,
  PageStack,
  SearchInput,
} from "@lumenx/ui-admin";
import type { TemplateRecord } from "@/lib/template-management/types";
import { getAllTemplates, generateDocumentBatch } from "@/lib/template-management/store";
import { studentVariableMap } from "@/lib/template-management/variable-resolve";
import { getMockStudentsForProfile } from "@/lib/academic-data";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import { TemplatePreviewFrame } from "@/components/templates/TemplatePreviewFrame";
import { useAdminToast } from "@/components/AdminActionToast";
import { ChevronRight, FileCheck, Users, User, GraduationCap, ExternalLink } from "lucide-react";

type RecipientMode = "single" | "class" | "grade" | "custom";

const STEPS = ["template", "students", "review", "done"] as const;
type Step = (typeof STEPS)[number];

const STEP_LABEL: Record<Step, string> = {
  template: "Choose template",
  students: "Select students",
  review: "Review & generate",
  done: "Complete",
};

type GenerateViewProps = {
  initialTemplateId?: string;
};

export function TemplateGenerateView({ initialTemplateId }: GenerateViewProps) {
  useTemplateStore();
  const notify = useAdminToast();
  const { instituteProfile } = useDemoProfile();
  const allStudents = useMemo(() => getMockStudentsForProfile(), []);
  const templates = useMemo(
    () => getAllTemplates().filter((t) => t.status === "active"),
    [],
  );

  const [step, setStep] = useState<Step>(initialTemplateId ? "students" : "template");
  const [templateId, setTemplateId] = useState(initialTemplateId ?? templates[0]?.id ?? "");
  const [mode, setMode] = useState<RecipientMode>("class");
  const [classFilter, setClassFilter] = useState(() => allStudents[0]?.grade ?? "");
  const [gradeFilter, setGradeFilter] = useState("");
  const [singleId, setSingleId] = useState(allStudents[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentQ, setStudentQ] = useState("");
  const [batchId, setBatchId] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);

  const template = templates.find((t) => t.id === templateId) ?? null;

  const grades = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStudents) {
      const parts = s.grade.split("-");
      set.add(parts.length >= 2 ? parts.slice(0, -1).join("-") : s.grade);
    }
    return [...set].sort();
  }, [allStudents]);

  const effectiveGradeFilter = gradeFilter || (grades[0] ?? "");

  const classes = useMemo(() => {
    const set = new Set(allStudents.map((s) => s.grade));
    return [...set].sort();
  }, [allStudents]);

  const resolvedStudents = useMemo(() => {
    let list = allStudents;
    if (mode === "single") list = list.filter((s) => s.id === singleId);
    else if (mode === "class") list = list.filter((s) => s.grade === classFilter);
    else if (mode === "grade") {
      list = list.filter((s) => {
        const parts = s.grade.split("-");
        const g = parts.length >= 2 ? parts.slice(0, -1).join("-") : s.grade;
        return g === effectiveGradeFilter;
      });
    } else if (mode === "custom") list = list.filter((s) => selectedIds.has(s.id));

    if (studentQ.trim()) {
      const q = studentQ.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allStudents, mode, singleId, classFilter, effectiveGradeFilter, selectedIds, studentQ]);

  const previewStudent = resolvedStudents[0] ?? allStudents[0];
  const previewVars = previewStudent
    ? studentVariableMap(previewStudent, instituteProfile, 1)
    : undefined;

  const stepIndex = STEPS.indexOf(step);

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(resolvedStudents.map((s) => s.id)));
  };

  const handleGenerate = () => {
    if (!template || resolvedStudents.length === 0) return;

    const recipients = resolvedStudents.map((s, i) => {
      const vars = studentVariableMap(s, instituteProfile, i + 1);
      return {
        id: s.id,
        name: s.name,
        ref: s.grade,
        certificateNumber: vars.CertificateNumber,
      };
    });

    const result = generateDocumentBatch({
      templateId: template.id,
      templateName: template.name,
      kind: template.kind,
      recipients,
      actor: instituteProfile.principal || "Principal",
    });

    setBatchId(result.batchId);
    setGeneratedCount(result.count);
    setStep("done");
    notify(`Generated ${result.count} documents · batch ${result.batchId}`);
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Issue documents to students"
          hint="Choose a template, pick students by class or grade, then generate certificates in one batch"
        />
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <Pill tone={i <= stepIndex ? "success" : "neutral"}>{STEP_LABEL[s]}</Pill>
                {i < STEPS.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <InstituteBrandingBanner />

          {step === "template" && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5 space-y-4">
                <Field label="Certificate / document template">
                  <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.kind.replace("_", " ")})
                      </option>
                    ))}
                  </Select>
                </Field>
                {template && (
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                )}
                <Button
                  variant="primary"
                  disabled={!template}
                  onClick={() => setStep("students")}
                >
                  Continue to student selection
                </Button>
              </div>
              {template && (
                <div className="col-span-12 lg:col-span-7">
                  <TemplatePreviewFrame template={template} variableOverrides={previewVars} />
                </div>
              )}
            </div>
          )}

          {step === "students" && template && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <RecipientModeCard
                  active={mode === "single"}
                  icon={User}
                  title="One student"
                  hint="Issue to a single student"
                  onClick={() => setMode("single")}
                />
                <RecipientModeCard
                  active={mode === "class"}
                  icon={Users}
                  title="Whole class"
                  hint="e.g. 10-A, 12-B"
                  onClick={() => setMode("class")}
                />
                <RecipientModeCard
                  active={mode === "grade"}
                  icon={GraduationCap}
                  title="Entire grade"
                  hint="All sections in a grade"
                  onClick={() => setMode("grade")}
                />
                <RecipientModeCard
                  active={mode === "custom"}
                  icon={FileCheck}
                  title="Pick students"
                  hint="Checkbox list"
                  onClick={() => setMode("custom")}
                />
              </div>

              {mode === "single" && (
                <Field label="Student">
                  <Select value={singleId} onChange={(e) => setSingleId(e.target.value)}>
                    {allStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.grade}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {mode === "class" && (
                <Field label="Class & section">
                  <Select
                    value={classFilter || (classes[0] ?? "")}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {mode === "grade" && (
                <Field label="Grade / year">
                  <Select
                    value={gradeFilter || (grades[0] ?? "")}
                    onChange={(e) => setGradeFilter(e.target.value)}
                  >
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {mode === "custom" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <SearchInput
                      placeholder="Search students…"
                      value={studentQ}
                      onChange={(e) => setStudentQ(e.target.value)}
                      className="flex-1 min-w-[200px]"
                    />
                    <Button size="sm" onClick={selectAllFiltered}>
                      Select all shown
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border lx-sidebar-scroll">
                    {allStudents.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="size-4 rounded border-border"
                        />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{s.grade}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm">
                <span className="font-medium text-foreground">{resolvedStudents.length}</span>{" "}
                <span className="text-muted-foreground">students selected</span>
              </p>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setStep("template")}>Back</Button>
                <Button
                  variant="primary"
                  disabled={resolvedStudents.length === 0}
                  onClick={() => setStep("review")}
                >
                  Review before generating
                </Button>
              </div>
            </div>
          )}

          {step === "review" && template && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5 space-y-4">
                <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Template:</span>{" "}
                    <span className="font-medium">{template.name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Recipients:</span>{" "}
                    <span className="font-medium">{resolvedStudents.length} students</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Institute:</span>{" "}
                    <span className="font-medium">{instituteProfile.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Each certificate gets a unique number, student name, class, section, and
                    admission number filled automatically from your student records.
                  </p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto lx-sidebar-scroll">
                  {resolvedStudents.slice(0, 12).map((s) => (
                    <li key={s.id}>
                      {s.name} · {s.grade}
                    </li>
                  ))}
                  {resolvedStudents.length > 12 && (
                    <li>…and {resolvedStudents.length - 12} more</li>
                  )}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setStep("students")}>Back</Button>
                  <Button variant="primary" onClick={handleGenerate}>
                    Generate {resolvedStudents.length} documents
                  </Button>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-7">
                <p className="text-xs text-muted-foreground mb-2">
                  Sample preview — {previewStudent?.name}
                </p>
                <TemplatePreviewFrame template={template} variableOverrides={previewVars} />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8 space-y-4">
              <FileCheck className="size-12 text-success mx-auto" />
              <p className="text-lg font-semibold">
                {generatedCount} documents generated successfully
              </p>
              <p className="text-sm text-muted-foreground">
                Batch reference: <span className="font-mono">{batchId}</span>
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link to="/templates" search={{ view: "generated" }}>
                  <Button variant="primary">View generated documents</Button>
                </Link>
                <Button
                  onClick={() => {
                    setStep("template");
                    setBatchId("");
                    setGeneratedCount(0);
                  }}
                >
                  Issue more certificates
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </PageStack>
  );
}

function InstituteBrandingBanner() {
  const { instituteProfile } = useDemoProfile();
  const photo = instituteProfile.profilePhoto;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/15 p-4">
      <div className="size-12 rounded-lg border border-border bg-surface overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold text-primary">
        {photo ? (
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          instituteProfile.logo.slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{instituteProfile.name}</p>
        <p className="text-xs text-muted-foreground">
          Logo, principal name, and institute details are pulled from your Institute Profile and
          appear on every template automatically.
        </p>
      </div>
      <Link to="/institute">
        <Button size="sm">
          <ExternalLink className="size-3" /> Edit institute details
        </Button>
      </Link>
    </div>
  );
}

function RecipientModeCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: typeof User;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-3 transition-colors ${
        active
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:bg-surface-hover"
      }`}
    >
      <Icon className={`size-4 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </button>
  );
}
