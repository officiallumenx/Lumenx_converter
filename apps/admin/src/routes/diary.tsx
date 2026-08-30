import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Modal,
  Pill,
  Select,
  TextArea,
  TextInput,
  Th,
} from "@lumenx/ui-admin";
import {
  ensureHomeworkDiaryDemoSeed,
  loadDiarySubmissionLogs,
  type DiarySubmissionLog,
} from "@lumenx/utils";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { BookMarked, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listClassesCatalog } from "@/lib/classes/api";
import type { SectionDto } from "@/lib/classes/types";
import { listTeachers, teacherDtosToListItems, type TeacherListItem } from "@/lib/teachers";
import {
  createDiaryDay,
  deleteDiaryDay,
  loadDiaryDaysList,
  resolveDiaryListView,
  shouldCommitDiaryLoad,
  submitDiaryDay,
  updateDiaryDay,
  type DiaryListItem,
  type DiaryListStatus,
  type DiaryRowInput,
  type DiaryScope,
} from "@/lib/diary";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: adminPageTitle("/diary") }] }),
  component: DiaryViewPage,
});

type DiaryRow = DiarySubmissionLog | DiaryListItem;

type DraftRow = {
  sectionId: string;
  classLabel: string;
  description: string;
};

function formatSubmittedAt(iso: string): string {
  if (!iso) return "Draft";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function scopeDisplay(scope: string): string {
  return (scope ?? "").replace(/-/g, " ") || "—";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraftRow(): DraftRow {
  return { sectionId: "", classLabel: "", description: "" };
}

function DiaryViewPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [demoLogs] = useState<DiarySubmissionLog[]>(() => {
    if (apiMode) return [];
    ensureHomeworkDiaryDemoSeed();
    return loadDiarySubmissionLogs();
  });
  const [apiItems, setApiItems] = useState<DiaryListItem[]>([]);
  const [listStatus, setListStatus] = useState<DiaryListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [mutating, setMutating] = useState(false);

  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formDate, setFormDate] = useState(todayIso);
  const [formScope, setFormScope] = useState<DiaryScope>("activity");
  const [formRows, setFormRows] = useState<DraftRow[]>([emptyDraftRow()]);

  const listView = resolveDiaryListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayStatus = listView.status;
  const displayError = listView.errorMessage;

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      setDetailId(null);
      setFormOpen(false);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setApiItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      setDetailId(null);
      setFormOpen(false);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      setDetailId(null);
      setFormOpen(false);
      setTeachers([]);
      setSections([]);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    setDetailId(null);
    setFormOpen(false);

    void Promise.all([
      loadDiaryDaysList(requestInstituteId),
      listTeachers({ instituteId: requestInstituteId }).then(teacherDtosToListItems),
      listClassesCatalog({ instituteId: requestInstituteId }),
    ]).then(
      ([next, teacherRows, catalog]) => {
        if (
          !shouldCommitDiaryLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
          })
        ) {
          return;
        }
        setApiItems(next.items);
        setListStatus(next.status);
        setListError(next.errorMessage);
        setResolvedForInstituteId(requestInstituteId);
        setTeachers(teacherRows);
        setSections(catalog.sections);
      },
      (err) => {
        if (
          !shouldCommitDiaryLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
          })
        ) {
          return;
        }
        setApiItems([]);
        setListStatus("error");
        setListError(err instanceof Error ? err.message : "Failed to load diary");
        setResolvedForInstituteId(requestInstituteId);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const displayItems: DiaryRow[] = apiMode ? listView.items : demoLogs;
  const sorted = useMemo(
    () =>
      [...displayItems].sort((a, b) =>
        (b.submittedAt || "").localeCompare(a.submittedAt || ""),
      ),
    [displayItems],
  );

  const detail = useMemo(
    () => (detailId ? sorted.find((row) => row.id === detailId) ?? null : null),
    [sorted, detailId],
  );

  const sectionOptions = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: `${section.name || section.code} (${section.id.slice(0, 8)})`,
      })),
    [sections],
  );

  const resetForm = () => {
    setEditingId(null);
    setFormTeacherId(teachers[0]?.id ?? "");
    setFormDate(todayIso());
    setFormScope("activity");
    setFormRows([emptyDraftRow()]);
  };

  const openCreate = () => {
    if (!writesEnabled || !apiMode) return;
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (row: DiaryListItem) => {
    if (!writesEnabled || !apiMode) return;
    setEditingId(row.id);
    setFormTeacherId(row.teacherId);
    setFormDate(row.date);
    setFormScope(row.scope);
    setFormRows(
      row.rows.length > 0
        ? row.rows.map((r) => ({
            sectionId: r.sectionId ?? "",
            classLabel: r.className,
            description: r.description,
          }))
        : [emptyDraftRow()],
    );
    setDetailId(null);
    setFormOpen(true);
  };

  const buildRowsPayload = (): DiaryRowInput[] =>
    formRows
      .map((row, index) => ({
        sectionId: formScope === "subject" ? row.sectionId || null : row.sectionId || null,
        classLabel: row.classLabel.trim(),
        description: row.description.trim(),
        sortOrder: index,
      }))
      .filter((row) => row.classLabel && row.description);

  const saveForm = (andSubmit: boolean) => {
    if (!writesEnabled || !apiMode || mutating) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before saving diary");
      return;
    }
    const rows = buildRowsPayload();
    if (rows.length === 0) {
      notify("Add at least one class label and description");
      return;
    }
    if (formScope === "subject" && rows.some((r) => !r.sectionId)) {
      notify("Subject diary rows require a section");
      return;
    }

    setMutating(true);
    const done = (message: string) => {
      if (activeInstituteIdRef.current !== instituteId) return;
      setFormOpen(false);
      resetForm();
      setReloadKey((k) => k + 1);
      notify(message);
    };

    if (editingId) {
      void updateDiaryDay(editingId, { rows })
        .then(async (updated) => {
          if (andSubmit && !updated.submittedAt) {
            await submitDiaryDay(editingId);
            done("Diary updated and submitted");
            return;
          }
          done("Diary updated");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to update diary");
        })
        .finally(() => setMutating(false));
      return;
    }

    if (!formTeacherId) {
      setMutating(false);
      notify("Select a teacher for this diary day");
      return;
    }

    void createDiaryDay({
      instituteId,
      teacherId: formTeacherId,
      diaryDate: formDate,
      scope: formScope,
      rows,
    })
      .then(async (created) => {
        if (andSubmit) {
          await submitDiaryDay(created.id);
          done("Diary created and submitted");
          return;
        }
        done("Diary draft created");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create diary");
      })
      .finally(() => setMutating(false));
  };

  const removeDiary = (id: string) => {
    if (!writesEnabled || !apiMode || mutating) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (!requestInstituteId) return;
    setMutating(true);
    void deleteDiaryDay(id)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setDetailId(null);
        setFormOpen(false);
        setReloadKey((k) => k + 1);
        notify("Diary day deleted");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete diary day");
      })
      .finally(() => setMutating(false));
  };

  const listHint =
    displayStatus === "loading"
      ? "Loading diary days…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load diary days"
        : displayStatus === "forbidden"
          ? "You do not have access to diary for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load diary days"
            : displayStatus === "empty"
              ? "No diary days yet"
              : null;

  return (
    <AppShell
      title={M.diary}
      subtitle={
        apiMode
          ? writesEnabled
            ? "API mode · create / edit / submit / delete diary days"
            : "API mode · read-only list"
          : "Teacher submits · Admin view only (no edit)"
      }
      actions={
        apiMode && writesEnabled ? (
          <Button variant="primary" onClick={openCreate}>
            <Plus className="size-3.5" /> New diary day
          </Button>
        ) : null
      }
    >
      <Card>
        {apiMode && !listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="size-5" />}
            title="No diary days yet"
            hint={
              apiMode
                ? listHint ?? "Create a diary day for a teacher, or wait for Connect submissions."
                : "Submitted teacher diary days from Connect appear here for viewing only."
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Diary date</Th>
                <Th>Status</Th>
                <Th>Teacher</Th>
                <Th>Scope</Th>
                <Th>Entries</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const apiRow = apiMode ? (row as DiaryListItem) : null;
                return (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-mono text-xs">{row.date}</td>
                    <td className="px-5 py-3">
                      {row.submittedAt ? (
                        <Pill tone="success">submitted</Pill>
                      ) : (
                        <Pill tone="warning">draft</Pill>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">
                      {row.teacherName || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm capitalize">
                      {scopeDisplay(row.scope)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {(row.rows ?? []).length}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailId(row.id)}
                        >
                          <Eye className="size-3.5" /> View
                        </Button>
                        {apiMode && writesEnabled && apiRow ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={mutating}
                              onClick={() => openEdit(apiRow)}
                            >
                              <Pencil className="size-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={mutating}
                              onClick={() => removeDiary(row.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        ) : null}
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
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail ? `Diary · ${detail.date}` : "Diary"}
        subtitle={
          detail
            ? `${detail.teacherName || "Teacher"} · ${formatSubmittedAt(detail.submittedAt)}`
            : undefined
        }
        size="lg"
        footer={
          <>
            {apiMode && writesEnabled && detail && "instituteId" in detail ? (
              <>
                <Button
                  variant="outline"
                  disabled={mutating}
                  onClick={() => openEdit(detail as DiaryListItem)}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="danger"
                  disabled={mutating}
                  onClick={() => removeDiary(detail.id)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </>
            ) : null}
            <Button onClick={() => setDetailId(null)}>Close</Button>
          </>
        }
      >
        {detail ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill tone={detail.submittedAt ? "success" : "warning"}>
                {detail.submittedAt ? "submitted" : "draft"}
              </Pill>
              <Pill tone="neutral">{scopeDisplay(detail.scope)}</Pill>
            </div>
            <div className="space-y-2">
              {(detail.rows ?? []).map((r, i) => (
                <div
                  key={`${r.className ?? "class"}-${i}`}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="text-xs font-semibold">{r.className || "Class"}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {r.description || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => {
          if (mutating) return;
          setFormOpen(false);
          resetForm();
        }}
        title={editingId ? "Edit diary day" : "New diary day"}
        subtitle="Institute staff create or update on behalf of a teacher"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              disabled={mutating}
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={mutating}
              onClick={() => saveForm(false)}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              disabled={mutating}
              onClick={() => saveForm(true)}
            >
              Save & submit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!editingId ? (
            <Field label="Teacher">
              <Select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                disabled={mutating}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {!editingId ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Diary date">
                <TextInput
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  disabled={mutating}
                />
              </Field>
              <Field label="Scope">
                <Select
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value as DiaryScope)}
                  disabled={mutating}
                >
                  <option value="activity">Activity</option>
                  <option value="subject">Subject</option>
                </Select>
              </Field>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Entries
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={mutating}
                onClick={() => setFormRows((prev) => [...prev, emptyDraftRow()])}
              >
                Add row
              </Button>
            </div>
            {formRows.map((row, index) => (
              <div
                key={`draft-row-${index}`}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                {formScope === "subject" ? (
                  <Field label="Section">
                    <Select
                      value={row.sectionId}
                      onChange={(e) => {
                        const sectionId = e.target.value;
                        const section = sections.find((s) => s.id === sectionId);
                        setFormRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  sectionId,
                                  classLabel:
                                    r.classLabel ||
                                    section?.name ||
                                    section?.code ||
                                    "",
                                }
                              : r,
                          ),
                        );
                      }}
                      disabled={mutating}
                    >
                      <option value="">Select section</option>
                      {sectionOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                <Field label="Class label">
                  <TextInput
                    value={row.classLabel}
                    onChange={(e) =>
                      setFormRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, classLabel: e.target.value } : r,
                        ),
                      )
                    }
                    disabled={mutating}
                  />
                </Field>
                <Field label="Description">
                  <TextArea
                    rows={3}
                    value={row.description}
                    onChange={(e) =>
                      setFormRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, description: e.target.value } : r,
                        ),
                      )
                    }
                    disabled={mutating}
                  />
                </Field>
                {formRows.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutating}
                    onClick={() =>
                      setFormRows((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Remove row
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
