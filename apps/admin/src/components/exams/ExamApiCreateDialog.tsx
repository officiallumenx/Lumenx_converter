import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Field,
  Modal,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { listAcademicYears, type AcademicYearDto } from "@/lib/academic-years";
import {
  listClasses,
  listSections,
  sectionsToListItems,
  type ClassDto,
  type SectionDto,
} from "@/lib/classes";
import { listSubjects, type SubjectDto } from "@/lib/subjects";
import { createExam, updateExam, type CreateExamInput } from "@/lib/exams";
import {
  assignSubjectsToDates,
  suggestExamEndDate,
} from "@/lib/exam-calendar-utils";
import { buildExamHeader } from "@/lib/exam-timetable-data";

type ExamApiCreateDialogProps = {
  open: boolean;
  instituteId: string;
  onClose: () => void;
  onCreated: (result: {
    published: boolean;
    examId: string;
    examName: string;
    startDate: string;
    endDate: string;
  }) => void;
  onError: (message: string) => void;
};

type Step = "create" | "preview";

/**
 * Flowchart: Admin exams → Create exam → fields → preview →
 * Create draft, or Create & publish timetable (opens marks entry).
 */
export function ExamApiCreateDialog({
  open,
  instituteId,
  onClose,
  onCreated,
  onError,
}: ExamApiCreateDialogProps) {
  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("create");

  const [academicYearId, setAcademicYearId] = useState("");
  const [name, setName] = useState("");
  const [timetableTitle, setTimetableTitle] = useState("");
  const [header, setHeader] = useState("");
  const [headerTouched, setHeaderTouched] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [startsAt, setStartsAt] = useState("09:00");
  const [endsAt, setEndsAt] = useState("12:00");
  const [totalMarks, setTotalMarks] = useState("100");
  const [internalMarks, setInternalMarks] = useState("20");
  const [externalMarks, setExternalMarks] = useState("80");
  const [audienceScope, setAudienceScope] = useState<"year" | "section">("section");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [orderedSubjectIds, setOrderedSubjectIds] = useState<string[]>([]);

  // Parent often passes inline onError/onCreated — keep stable so catalog load
  // does not re-fire and wipe the form (modal flicker / "popuping").
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const opening = !wasOpenRef.current;
    wasOpenRef.current = true;

    let cancelled = false;
    setLoadingCatalog(true);
    void Promise.all([
      listAcademicYears({ instituteId }),
      listSections({ instituteId }),
      listClasses({ instituteId }),
      listSubjects({ instituteId }),
    ])
      .then(([yearRows, sectionRows, classRows, subjectRows]) => {
        if (cancelled) return;
        setYears(yearRows);
        setSections(sectionRows);
        setClasses(classRows);
        setSubjects(subjectRows);
        // Only seed defaults when the dialog freshly opens — never mid-edit.
        if (opening) {
          const active = yearRows.find((y) => y.status === "active") ?? yearRows[0];
          setAcademicYearId(active?.id ?? "");
          setSelectedSectionIds(sectionRows.slice(0, 1).map((s) => s.id));
          setOrderedSubjectIds([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          onErrorRef.current(
            err instanceof Error ? err.message : "Failed to load exam catalogs",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, instituteId]);

  const autoEndDate = useMemo(() => {
    if (!startDate || orderedSubjectIds.length === 0) return "";
    return suggestExamEndDate(startDate, orderedSubjectIds.length);
  }, [startDate, orderedSubjectIds.length]);

  useEffect(() => {
    if (!endDateTouched && autoEndDate) {
      setEndDate(autoEndDate);
    }
  }, [autoEndDate, endDateTouched]);

  const autoHeader = useMemo(() => {
    const title = timetableTitle.trim() || name.trim();
    return buildExamHeader(title, startDate, endDate || startDate);
  }, [timetableTitle, name, startDate, endDate]);

  useEffect(() => {
    if (!headerTouched) {
      setHeader(autoHeader);
    }
  }, [autoHeader, headerTouched]);

  const paperPreview = useMemo(() => {
    if (!startDate || orderedSubjectIds.length === 0) return [];
    const effectiveEnd = endDate || autoEndDate || startDate;
    const subjectNames = orderedSubjectIds.map(
      (id) => subjects.find((s) => s.id === id)?.name ?? id.slice(0, 8),
    );
    return assignSubjectsToDates(startDate, effectiveEnd, subjectNames).map(
      (row, index) => ({
        ...row,
        subjectId: orderedSubjectIds[index]!,
      }),
    );
  }, [startDate, endDate, autoEndDate, orderedSubjectIds, subjects]);

  const sectionOptions = useMemo(
    () => sectionsToListItems(sections, classes),
    [sections, classes],
  );

  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of sectionOptions) {
      map.set(item.id, item.name);
    }
    return map;
  }, [sectionOptions]);

  const resetAndClose = () => {
    setStep("create");
    setName("");
    setTimetableTitle("");
    setHeader("");
    setHeaderTouched(false);
    setStartDate("");
    setEndDate("");
    setEndDateTouched(false);
    setTotalMarks("100");
    setInternalMarks("20");
    setExternalMarks("80");
    setOrderedSubjectIds([]);
    setSelectedSectionIds([]);
    onClose();
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  };

  const toggleSubject = (subjectId: string) => {
    setOrderedSubjectIds((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }
      return [...current, subjectId];
    });
    setEndDateTouched(false);
  };

  const moveSubject = (subjectId: string, direction: -1 | 1) => {
    setOrderedSubjectIds((current) => {
      const index = current.indexOf(subjectId);
      if (index < 0) return current;
      const next = index + direction;
      if (next < 0 || next >= current.length) return current;
      const copy = [...current];
      const tmp = copy[index]!;
      copy[index] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
  };

  const validateCreate = (): string | null => {
    if (!academicYearId || !name.trim() || !startDate) {
      return "Exam name, academic year, and start date are required";
    }
    const resolvedEnd = endDate || autoEndDate;
    if (!resolvedEnd) {
      return "Select subjects to calculate end date, or set end date manually";
    }
    if (resolvedEnd < startDate) {
      return "End date must be on or after start date";
    }
    if (orderedSubjectIds.length === 0) {
      return "Select subjects order-wise";
    }
    if (audienceScope === "section" && selectedSectionIds.length === 0) {
      return "Select at least one class · section";
    }
    const total = Number(totalMarks);
    const internal = internalMarks.trim() === "" ? null : Number(internalMarks);
    const external = externalMarks.trim() === "" ? null : Number(externalMarks);
    if (!Number.isFinite(total) || total <= 0) {
      return "Total marks must be a positive number";
    }
    if (internal != null && (!Number.isFinite(internal) || internal < 0)) {
      return "Internal marks must be a non-negative number";
    }
    if (external != null && (!Number.isFinite(external) || external < 0)) {
      return "External marks must be a non-negative number";
    }
    if (internal != null && external != null && internal + external !== total) {
      return "Internal + external marks must equal total marks";
    }
    if (paperPreview.length < orderedSubjectIds.length) {
      return "End date is too short for all subjects after skipping holidays — extend end date";
    }
    return null;
  };

  const applyTotalMarks = (raw: string) => {
    setTotalMarks(raw);
    const total = Number(raw);
    if (!Number.isFinite(total) || total <= 0) return;
    // Keep the default 20/80 split proportional to the new total.
    const nextInternal = Math.round(total * 0.2);
    setInternalMarks(String(nextInternal));
    setExternalMarks(String(Math.max(0, total - nextInternal)));
  };

  const goPreview = () => {
    const error = validateCreate();
    if (error) {
      onErrorRef.current(error);
      return;
    }
    setStep("preview");
  };

  const submit = (publish: boolean) => {
    const error = validateCreate();
    if (error) {
      onErrorRef.current(error);
      return;
    }

    const resolvedEnd = endDate || autoEndDate;
    const total = Number(totalMarks);
    const internal = internalMarks.trim() === "" ? null : Number(internalMarks);
    const external = externalMarks.trim() === "" ? null : Number(externalMarks);

    const targetSections =
      audienceScope === "section"
        ? selectedSectionIds
            .map((id) => sections.find((s) => s.id === id))
            .filter((s): s is SectionDto => Boolean(s))
            .map((s) => ({ sectionId: s.id, classId: s.classId }))
        : undefined;

    const subjectSchedules = paperPreview.map((row) => ({
      subjectId: row.subjectId,
      paperDate: row.date,
      startsAt,
      endsAt,
      room: null as string | null,
    }));

    const resolvedHeader =
      header.trim() ||
      buildExamHeader(timetableTitle.trim() || name.trim(), startDate, resolvedEnd);

    const input: CreateExamInput = {
      instituteId,
      academicYearId,
      name: name.trim(),
      header: resolvedHeader,
      startDate,
      endDate: resolvedEnd,
      defaultStartsAt: startsAt,
      defaultEndsAt: endsAt,
      totalMarks: total,
      internalMarks: internal,
      externalMarks: external,
      audienceScope,
      targetSections,
      subjectSchedules,
    };

    setSaving(true);
    void createExam(input)
      .then(async (created) => {
        if (publish) {
          await updateExam(created.id, { scheduleStatus: "published" });
        }
        resetAndClose();
        onCreatedRef.current({
          published: publish,
          examId: created.id,
          examName: created.name?.trim() || name.trim(),
          startDate: created.startDate || startDate,
          endDate: created.endDate || resolvedEnd || startDate,
        });
      })
      .catch((err) => {
        onErrorRef.current(
          err instanceof Error ? err.message : "Failed to create exam",
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const sectionLabel = (sectionId: string, fallback?: SectionDto) =>
    sectionLabelById.get(sectionId) ??
    (fallback
      ? `${fallback.name?.trim() || fallback.code?.trim() || "Section"}`
      : sectionId.slice(0, 8));

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={step === "preview" ? "Preview exam timetable" : "Create exam"}
      size="lg"
      footer={
        <>
          <Button onClick={resetAndClose}>Cancel</Button>
          {step === "preview" ? (
            <>
              <Button onClick={() => setStep("create")} disabled={saving}>
                Back
              </Button>
              <Button
                onClick={() => submit(false)}
                disabled={saving || loadingCatalog || !academicYearId}
              >
                {saving ? "Creating…" : "Save as draft"}
              </Button>
              <Button
                variant="primary"
                onClick={() => submit(true)}
                disabled={saving || loadingCatalog || !academicYearId}
              >
                {saving ? "Publishing…" : "Create & publish timetable"}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={goPreview}
              disabled={saving || loadingCatalog || !academicYearId}
            >
              Preview
            </Button>
          )}
        </>
      }
    >
      {loadingCatalog ? (
        <p className="text-sm text-muted-foreground">Loading academic catalogs…</p>
      ) : step === "preview" ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="font-semibold">{name.trim()}</p>
            <p className="text-muted-foreground">
              Timetable title: {timetableTitle.trim() || name.trim()}
            </p>
            <p className="text-muted-foreground">Header: {header.trim() || autoHeader}</p>
            <p className="mt-1 text-muted-foreground">
              {startDate} → {endDate || autoEndDate} · {startsAt}–{endsAt}
            </p>
            <p className="text-muted-foreground">
              Marks: total {totalMarks}
              {internalMarks ? ` · internal ${internalMarks}` : ""}
              {externalMarks ? ` · external ${externalMarks}` : ""}
            </p>
            <p className="text-muted-foreground">
              Audience:{" "}
              {audienceScope === "year"
                ? "Entire academic year"
                : selectedSectionIds
                    .map((id) => sectionLabel(id, sections.find((s) => s.id === id)))
                    .join(", ")}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Subject papers (order-wise)</h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {paperPreview.map((row) => (
                <li key={row.subjectId} className="flex justify-between gap-3 px-3 py-2">
                  <span>
                    Paper {row.paperNumber}: {row.subject}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{row.date}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Create & publish notifies students, parents, and teachers and opens marks entry.
              Save as draft if you want to publish later from the exam timetable.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Academic year" required className="sm:col-span-2">
            <Select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              {years.length === 0 ? (
                <option value="">No academic years</option>
              ) : (
                years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} ({y.status})
                  </option>
                ))
              )}
            </Select>
          </Field>

          <Field label="Exam name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Timetable title">
            <TextInput
              value={timetableTitle}
              onChange={(e) => setTimetableTitle(e.target.value)}
              placeholder="Defaults to exam name"
            />
          </Field>

          <Field label="Start date" required>
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setEndDateTouched(false);
              }}
            />
          </Field>
          <Field
            label="End date"
            hint={
              autoEndDate
                ? `Auto from subjects (skips holidays): ${autoEndDate}`
                : "Calculated after selecting subjects"
            }
            required
          >
            <TextInput
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setEndDateTouched(true);
              }}
            />
          </Field>

          <Field label="Exam timings (from)">
            <TextInput type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Exam timings (to)">
            <TextInput type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>

          <Field
            label="Header"
            hint="Auto-fetched from timetable title + dates — edit if needed"
            className="sm:col-span-2"
          >
            <TextInput
              value={header}
              onChange={(e) => {
                setHeader(e.target.value);
                setHeaderTouched(true);
              }}
              placeholder={autoHeader || "Auto from title and dates"}
            />
          </Field>

          <Field
            label="Total marks"
            required
            hint="Changing total auto-scales internal (20%) and external (80%)"
          >
            <TextInput
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => applyTotalMarks(e.target.value)}
            />
          </Field>
          <Field label="Internal marks">
            <TextInput
              type="number"
              min={0}
              value={internalMarks}
              onChange={(e) => setInternalMarks(e.target.value)}
            />
          </Field>
          <Field label="External marks">
            <TextInput
              type="number"
              min={0}
              value={externalMarks}
              onChange={(e) => setExternalMarks(e.target.value)}
            />
          </Field>
          <Field label="Classes & sections">
            <Select
              value={audienceScope}
              onChange={(e) => setAudienceScope(e.target.value as "year" | "section")}
            >
              <option value="year">Entire institute (year)</option>
              <option value="section">Selected classes & sections</option>
            </Select>
          </Field>

          {audienceScope === "section" ? (
            <Field label="Select classes & sections" required className="sm:col-span-2">
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-3">
                {sectionOptions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No sections</span>
                ) : (
                  sectionOptions.map((item) => (
                    <label key={item.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(item.id)}
                        onChange={() => toggleSection(item.id)}
                      />
                      {item.name}
                    </label>
                  ))
                )}
              </div>
            </Field>
          ) : null}

          <Field label="Select subjects order-wise" required className="sm:col-span-2">
            <div className="space-y-2 rounded-lg border border-border p-3">
              {subjects.length === 0 ? (
                <span className="text-sm text-muted-foreground">No subjects</span>
              ) : (
                subjects.map((subject) => {
                  const order = orderedSubjectIds.indexOf(subject.id);
                  const selected = order >= 0;
                  return (
                    <div
                      key={subject.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSubject(subject.id)}
                        />
                        {selected ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            #{order + 1}
                          </span>
                        ) : null}
                        {subject.name}
                      </label>
                      {selected ? (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => moveSubject(subject.id, -1)}
                          >
                            Up
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => moveSubject(subject.id, 1)}
                          >
                            Down
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </Field>
        </div>
      )}
    </Modal>
  );
}
