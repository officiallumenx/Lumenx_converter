import { useEffect, useState } from "react";
import {
  Button,
  Field,
  Modal,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { listAcademicYears, type AcademicYearDto } from "@/lib/academic-years";
import { listSections, type SectionDto } from "@/lib/classes";
import { listSubjects, type SubjectDto } from "@/lib/subjects";
import { createExam, type CreateExamInput } from "@/lib/exams";

type PaperRow = {
  id: string;
  subjectId: string;
  paperDate: string;
  startsAt: string;
  endsAt: string;
  room: string;
};

type ExamApiCreateDialogProps = {
  open: boolean;
  instituteId: string;
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
};

function newPaperRow(defaults?: Partial<PaperRow>): PaperRow {
  return {
    id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subjectId: defaults?.subjectId ?? "",
    paperDate: defaults?.paperDate ?? "",
    startsAt: defaults?.startsAt ?? "09:00",
    endsAt: defaults?.endsAt ?? "12:00",
    room: defaults?.room ?? "",
  };
}

export function ExamApiCreateDialog({
  open,
  instituteId,
  onClose,
  onCreated,
  onError,
}: ExamApiCreateDialogProps) {
  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [academicYearId, setAcademicYearId] = useState("");
  const [name, setName] = useState("");
  const [header, setHeader] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startsAt, setStartsAt] = useState("09:00");
  const [endsAt, setEndsAt] = useState("12:00");
  const [totalMarks, setTotalMarks] = useState("100");
  const [audienceScope, setAudienceScope] = useState<"year" | "section">("year");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [paperRows, setPaperRows] = useState<PaperRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoadingCatalog(true);
    void Promise.all([
      listAcademicYears({ instituteId }),
      listSections({ instituteId }),
      listSubjects({ instituteId }),
    ])
      .then(([yearRows, sectionRows, subjectRows]) => {
        setYears(yearRows);
        setSections(sectionRows);
        setSubjects(subjectRows);
        const active = yearRows.find((y) => y.status === "active") ?? yearRows[0];
        setAcademicYearId(active?.id ?? "");
        setSelectedSectionIds(sectionRows[0] ? [sectionRows[0].id] : []);
        setPaperRows(
          subjectRows[0]
            ? [newPaperRow({ subjectId: subjectRows[0].id, startsAt: "09:00", endsAt: "12:00" })]
            : [],
        );
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Failed to load exam catalogs");
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, [open, instituteId, onError]);

  const resetAndClose = () => {
    setName("");
    setHeader("");
    setStartDate("");
    setEndDate("");
    setPaperRows([]);
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

  const submit = () => {
    if (!academicYearId || !name.trim() || !startDate || !endDate) {
      onError("Name, academic year, and dates are required");
      return;
    }
    if (endDate < startDate) {
      onError("End date must be on or after start date");
      return;
    }
    const marks = Number(totalMarks);
    if (!Number.isFinite(marks) || marks <= 0) {
      onError("Total marks must be a positive number");
      return;
    }
    if (audienceScope === "section" && selectedSectionIds.length === 0) {
      onError("Select at least one target section");
      return;
    }

    const targetSections =
      audienceScope === "section"
        ? selectedSectionIds
            .map((id) => sections.find((s) => s.id === id))
            .filter((s): s is SectionDto => Boolean(s))
            .map((s) => ({ sectionId: s.id, classId: s.classId }))
        : undefined;

    const subjectSchedules = paperRows
      .filter((row) => row.subjectId)
      .map((row) => ({
        subjectId: row.subjectId,
        paperDate: row.paperDate || startDate,
        startsAt: row.startsAt || startsAt,
        endsAt: row.endsAt || endsAt,
        room: row.room.trim() || null,
      }));

    const input: CreateExamInput = {
      instituteId,
      academicYearId,
      name: name.trim(),
      header: header.trim() || name.trim(),
      startDate,
      endDate,
      defaultStartsAt: startsAt,
      defaultEndsAt: endsAt,
      totalMarks: marks,
      audienceScope,
      targetSections,
      subjectSchedules: subjectSchedules.length > 0 ? subjectSchedules : undefined,
    };

    setSaving(true);
    void createExam(input)
      .then(() => {
        resetAndClose();
        onCreated();
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Failed to create exam");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Create exam (API)"
      size="lg"
      footer={
        <>
          <Button onClick={resetAndClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saving || loadingCatalog || !academicYearId}
          >
            {saving ? "Creating…" : "Create exam"}
          </Button>
        </>
      }
    >
      {loadingCatalog ? (
        <p className="text-sm text-muted-foreground">Loading academic catalogs…</p>
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
          <Field label="Name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Header">
            <TextInput
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Defaults to name"
            />
          </Field>
          <Field label="Start date" required>
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date" required>
            <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field label="Default start">
            <TextInput type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Default end">
            <TextInput type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
          <Field label="Total marks" required>
            <TextInput
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
            />
          </Field>
          <Field label="Audience">
            <Select
              value={audienceScope}
              onChange={(e) => setAudienceScope(e.target.value as "year" | "section")}
            >
              <option value="year">All classes (year)</option>
              <option value="section">Selected sections</option>
            </Select>
          </Field>
          {audienceScope === "section" ? (
            <Field label="Target sections" required className="sm:col-span-2">
              <div className="flex flex-wrap gap-2 rounded-lg border border-border p-3">
                {sections.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No sections</span>
                ) : (
                  sections.map((s) => (
                    <label key={s.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(s.id)}
                        onChange={() => toggleSection(s.id)}
                      />
                      {s.name} ({s.code})
                    </label>
                  ))
                )}
              </div>
            </Field>
          ) : null}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Subject papers</h3>
              <Button
                type="button"
                onClick={() =>
                  setPaperRows((rows) => [
                    ...rows,
                    newPaperRow({
                      subjectId: subjects[0]?.id ?? "",
                      paperDate: startDate,
                      startsAt,
                      endsAt,
                    }),
                  ])
                }
              >
                Add paper
              </Button>
            </div>
            {paperRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add papers to build the timetable, or leave empty for header-only draft.
              </p>
            ) : (
              paperRows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"
                >
                  <Field label={`Paper ${index + 1} subject`}>
                    <Select
                      value={row.subjectId}
                      onChange={(e) =>
                        setPaperRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id ? { ...r, subjectId: e.target.value } : r,
                          ),
                        )
                      }
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Date">
                    <TextInput
                      type="date"
                      value={row.paperDate}
                      onChange={(e) =>
                        setPaperRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id ? { ...r, paperDate: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Start">
                    <TextInput
                      type="time"
                      value={row.startsAt}
                      onChange={(e) =>
                        setPaperRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id ? { ...r, startsAt: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="End">
                    <TextInput
                      type="time"
                      value={row.endsAt}
                      onChange={(e) =>
                        setPaperRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id ? { ...r, endsAt: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Room" className="sm:col-span-2">
                    <TextInput
                      value={row.room}
                      onChange={(e) =>
                        setPaperRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id ? { ...r, room: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setPaperRows((rows) => rows.filter((r) => r.id !== row.id))
                      }
                    >
                      Remove paper
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
