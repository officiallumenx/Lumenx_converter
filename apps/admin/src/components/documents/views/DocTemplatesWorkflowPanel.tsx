import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import { FileText, Loader2, Wand2 } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { DocTemplatesApiPanel } from "@/components/documents/views/DocTemplatesApiPanel";
import { WorkflowStepBar } from "@/components/docs-certs/WorkflowStepBar";
import { StudentMultiSelectPanel } from "@/components/docs-certs/StudentMultiSelectPanel";
import {
  GenerationPreviewWorkspace,
  type PreviewItem,
} from "@/components/docs-certs/GenerationPreviewWorkspace";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listStudents, studentDtosToListItems } from "@/lib/students";
import type { StudentListItem } from "@/lib/students";
import type { TemplateRecord } from "@/lib/template-management/types";
import {
  createGeneratedDocument,
  deleteGeneratedDocument,
  transitionGeneratedDocument,
} from "@/lib/documents";
import type { GeneratedDocumentDto } from "@/lib/documents/types";
import { loadAcademicYearsList } from "@/lib/academic-years";

const STEPS = ["Template", "Students", "Preview", "Publish"] as const;

function newGenerationBatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function draftGenerationKey(
  batchId: string,
  templateId: string,
  student: StudentListItem,
): string {
  return `${batchId}:${templateId}:${student.id}`;
}

type DraftRow = {
  localId: string;
  student: StudentListItem;
  generationKey: string;
  generated: GeneratedDocumentDto | null;
  publishStatus: PreviewItem["publishStatus"];
  errorMessage: string | null;
};

type DocTemplatesWorkflowPanelProps = {
  templates: TemplateRecord[];
  writesEnabled?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
  onChanged?: () => void;
};

export function DocTemplatesWorkflowPanel({
  templates,
  writesEnabled: writesProp,
  listBlocked = false,
  listHint = null,
  onChanged,
}: DocTemplatesWorkflowPanelProps) {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled =
    writesProp ??
    resolveWritesEnabled(true, {
      status: instituteCtx.status,
      activeInstituteId: instituteCtx.activeInstituteId,
    });

  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentsHint, setStudentsHint] = useState<string | null>(null);
  const [academicYearOptions, setAcademicYearOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [generationBatchId, setGenerationBatchId] = useState<string | null>(null);
  const activeRef = useRef(instituteCtx.activeInstituteId);
  activeRef.current = instituteCtx.activeInstituteId;
  const generateInFlightRef = useRef(false);

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.status === "active"),
    [templates],
  );

  const selectedTemplate = activeTemplates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (
      instituteCtx.status !== "ready" ||
      !instituteCtx.activeInstituteId
    ) {
      setStudents([]);
      setAcademicYearOptions([]);
      setStudentsHint("Select an institute to load students.");
      return;
    }
    const requestId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setStudentsHint("Loading students…");
    void Promise.all([
      listStudents({ instituteId: requestId }),
      loadAcademicYearsList(requestId),
    ])
      .then(([dtos, years]) => {
        if (cancelled || activeRef.current !== requestId) return;
        setStudents(studentDtosToListItems(dtos));
        setAcademicYearOptions(
          years.items.map((y) => ({ id: y.id, label: y.label })),
        );
        setStudentsHint(null);
      })
      .catch((err) => {
        if (cancelled || activeRef.current !== requestId) return;
        setStudents([]);
        setAcademicYearOptions([]);
        setStudentsHint(err instanceof Error ? err.message : "Failed to load students");
      });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (
      selectedTemplateId &&
      activeTemplates.some((t) => t.id === selectedTemplateId)
    ) {
      return;
    }
    setSelectedTemplateId(activeTemplates[0]?.id ?? "");
  }, [activeTemplates, selectedTemplateId]);

  const selectableStudents = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        classLabel: s.classLabel,
        sectionLabel: s.sectionLabel,
        admissionNumber: s.admissionNumber,
        rollNo: s.rollNo,
      })),
    [students],
  );

  const confirmDiscard = () => {
    if (!dirty) return true;
    return window.confirm(
      "Discard the current generation batch? Unpublished drafts will be removed.",
    );
  };

  const resetWorkflow = async (deleteDrafts: boolean) => {
    if (deleteDrafts) {
      const toDelete = drafts.filter(
        (d) => d.generated && d.publishStatus !== "published",
      );
      for (const row of toDelete) {
        if (!row.generated) continue;
        try {
          await deleteGeneratedDocument(row.generated.id);
        } catch {
          /* best-effort cleanup */
        }
      }
    }
    setDrafts([]);
    setPreviewIndex(0);
    setSelectedIds(new Set());
    setGenerationBatchId(null);
    setDirty(false);
    setStep(1);
    onChanged?.();
  };

  const createOneDraft = async (input: {
    instituteId: string;
    templateId: string;
    templateName: string;
    batchId: string;
    student: StudentListItem;
  }): Promise<DraftRow> => {
    const generationKey = draftGenerationKey(
      input.batchId,
      input.templateId,
      input.student,
    );
    try {
      const generated = await createGeneratedDocument({
        instituteId: input.instituteId,
        templateId: input.templateId,
        title: input.templateName || "Document",
        studentId: input.student.id,
        recipientName: input.student.displayName,
        recipientRef: input.student.admissionNumber ?? input.student.id,
        generationKey,
        payload: {
          generationKey,
          generationBatchId: input.batchId,
          classLabel: input.student.classLabel,
          sectionLabel: input.student.sectionLabel,
          rollNo: input.student.rollNo,
          admissionNumber: input.student.admissionNumber,
        },
      });
      return {
        localId: input.student.id,
        student: input.student,
        generationKey,
        generated,
        publishStatus: "pending",
        errorMessage: null,
      };
    } catch (err) {
      return {
        localId: input.student.id,
        student: input.student,
        generationKey,
        generated: null,
        publishStatus: "failed",
        errorMessage:
          err instanceof Error ? err.message : "Failed to generate draft",
      };
    }
  };

  const generateDrafts = async () => {
    if (!writesEnabled || busy || generateInFlightRef.current) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId || !selectedTemplate) {
      notify("Select an institute and template first");
      return;
    }
    const chosen = students.filter((s) => selectedIds.has(s.id));
    if (chosen.length === 0) {
      notify("Select at least one student");
      return;
    }

    generateInFlightRef.current = true;
    setBusy(true);
    const batchId = newGenerationBatchId();
    setGenerationBatchId(batchId);
    const nextDrafts: DraftRow[] = [];
    let failures = 0;
    for (const student of chosen) {
      const row = await createOneDraft({
        instituteId,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        batchId,
        student,
      });
      if (!row.generated) failures += 1;
      nextDrafts.push(row);
    }
    setDrafts(nextDrafts);
    setPreviewIndex(0);
    setDirty(true);
    setStep(3);
    setBusy(false);
    generateInFlightRef.current = false;
    onChanged?.();
    if (failures > 0) {
      notify(`Generated with ${failures} failure(s). Review before publishing.`);
    } else {
      notify(`Generated ${nextDrafts.length} draft document(s). Review before publishing.`);
    }
  };

  /** Retry only failed draft creates; successful drafts are not recreated. */
  const retryFailedGenerates = async () => {
    if (!writesEnabled || busy || generateInFlightRef.current) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId || !selectedTemplate) return;
    const batchId = generationBatchId ?? newGenerationBatchId();
    if (!generationBatchId) setGenerationBatchId(batchId);

    generateInFlightRef.current = true;
    setBusy(true);
    const next = [...drafts];
    for (let i = 0; i < next.length; i++) {
      const row = next[i]!;
      if (row.generated || row.publishStatus === "published") continue;
      next[i] = await createOneDraft({
        instituteId,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        batchId,
        student: row.student,
      });
    }
    setDrafts(next);
    setBusy(false);
    generateInFlightRef.current = false;
    onChanged?.();
  };

  const publishOne = async (rowIndex: number): Promise<boolean> => {
    const row = drafts[rowIndex];
    if (!row?.generated || row.publishStatus === "published") return true;

    setDrafts((prev) =>
      prev.map((d, i) =>
        i === rowIndex
          ? { ...d, publishStatus: "publishing", errorMessage: null }
          : d,
      ),
    );
    try {
      const updated = await transitionGeneratedDocument(row.generated.id, {
        workflowState: "published",
      });
      setDrafts((prev) =>
        prev.map((d, i) =>
          i === rowIndex
            ? {
                ...d,
                generated: updated,
                publishStatus: "published",
                errorMessage: null,
              }
            : d,
        ),
      );
      return true;
    } catch (err) {
      setDrafts((prev) =>
        prev.map((d, i) =>
          i === rowIndex
            ? {
                ...d,
                publishStatus: "failed",
                errorMessage:
                  err instanceof Error ? err.message : "Publish failed",
              }
            : d,
        ),
      );
      return false;
    }
  };

  const publishIndexes = async (indexes: number[]) => {
    if (!writesEnabled || busy) return;
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const idx of indexes) {
      const row = drafts[idx];
      if (!row || row.publishStatus === "published") continue;
      // Skip rows that never got a draft id — avoid duplicate create on retry.
      if (!row.generated) {
        fail += 1;
        continue;
      }
      const success = await publishOne(idx);
      if (success) ok += 1;
      else fail += 1;
    }
    setBusy(false);
    setDirty(fail > 0 || ok < drafts.length);
    onChanged?.();
    if (fail === 0) {
      notify(`Published ${ok} document(s)`);
      setDirty(false);
    } else {
      notify(`Published ${ok}, failed ${fail}. Retry only failed items.`);
    }
  };

  const previewItems: PreviewItem[] = drafts.map((d) => ({
    id: d.generated?.id ?? d.localId,
    studentName: d.student.displayName,
    subtitle: [
      d.student.classLabel,
      d.student.sectionLabel,
      selectedTemplate?.name,
    ]
      .filter(Boolean)
      .join(" · "),
    documentNumber: d.generated?.certificateNumber ?? null,
    publishStatus: d.publishStatus,
    errorMessage: d.errorMessage,
  }));

  const currentDraft = drafts[previewIndex];

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Generate documents"
          hint="Template → students → preview → publish"
        />
        <CardBody className="space-y-4">
          <WorkflowStepBar steps={STEPS} current={step} />

          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose an active template to start generation. Upload or manage
                templates below.
              </p>
              {activeTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active templates. Create and activate a template first.
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeTemplates.map((t) => {
                    const selected = t.id === selectedTemplateId;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          disabled={!writesEnabled}
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setDirty(true);
                          }}
                          className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="size-4 mt-0.5 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {t.kind}
                                {t.categoryId ? ` · ${t.categoryId}` : ""}
                              </p>
                            </div>
                          </div>
                          {selected ? (
                            <div className="mt-2">
                              <Pill tone="success">Selected</Pill>
                            </div>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!writesEnabled || !selectedTemplateId}
                  onClick={() => setStep(2)}
                >
                  Continue to students
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Template:{" "}
                <span className="font-medium text-foreground">
                  {selectedTemplate?.name ?? "—"}
                </span>
              </p>
              {studentsHint ? (
                <p className="text-sm text-muted-foreground">{studentsHint}</p>
              ) : (
                <StudentMultiSelectPanel
                  students={selectableStudents}
                  selectedIds={selectedIds}
                  onChange={(next) => {
                    setSelectedIds(next);
                    setDirty(true);
                  }}
                  disabled={!writesEnabled || busy}
                />
              )}
              {!studentsHint ? (
                <p className="text-[11px] text-muted-foreground">
                  {academicYearOptions.length > 0
                    ? `Academic years are available (${academicYearOptions.length}) but the student list API does not expose academicYearId yet, so year filtering is disabled. Class and section filters remain available.`
                    : "No academic-year catalog rows returned for this institute; class and section filters remain available."}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!writesEnabled || busy || selectedIds.size === 0}
                  onClick={() => void generateDrafts()}
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                  Generate Documents
                </Button>
              </div>
            </div>
          ) : null}

          {step >= 3 ? (
            <GenerationPreviewWorkspace
              items={previewItems}
              index={previewIndex}
              onIndexChange={setPreviewIndex}
              busy={busy}
              canPublish={writesEnabled}
              publishLabel="Publish"
              onCancel={() => {
                if (!confirmDiscard()) return;
                void resetWorkflow(true);
              }}
              onPublishCurrent={() => void publishIndexes([previewIndex])}
              onPublishAll={() =>
                void publishIndexes(
                  drafts
                    .map((d, i) =>
                      d.publishStatus === "pending" || d.publishStatus === "failed"
                        ? i
                        : -1,
                    )
                    .filter((i) => i >= 0),
                )
              }
              onRetryFailed={() => {
                const failedPublish = drafts
                  .map((d, i) =>
                    d.generated && d.publishStatus === "failed" ? i : -1,
                  )
                  .filter((i) => i >= 0);
                if (failedPublish.length > 0) {
                  void publishIndexes(failedPublish);
                  return;
                }
                void retryFailedGenerates();
              }}
              preview={
                currentDraft ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{selectedTemplate?.name}</p>
                    <p className="text-muted-foreground">
                      Student: {currentDraft.student.displayName}
                    </p>
                    <p className="text-muted-foreground">
                      Class / section:{" "}
                      {[
                        currentDraft.student.classLabel,
                        currentDraft.student.sectionLabel,
                      ]
                        .filter(Boolean)
                        .join("-") || "—"}
                    </p>
                    <p className="text-muted-foreground">
                      Admission: {currentDraft.student.admissionNumber ?? "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground pt-2">
                      Draft id: {currentDraft.generated?.id ?? "not created"} ·
                      Number assigned when published
                    </p>
                  </div>
                ) : null
              }
            />
          ) : null}
        </CardBody>
      </Card>

      <DocTemplatesApiPanel
        templates={templates}
        writesEnabled={writesEnabled}
        listBlocked={listBlocked}
        listHint={listHint}
        onChanged={onChanged}
      />
    </PageStack>
  );
}
