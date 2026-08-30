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
import {
  createExam,
  type CreateExamInput,
} from "@/lib/exams";

type ExamApiCreateDialogProps = {
  open: boolean;
  instituteId: string;
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
};

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
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [paperDate, setPaperDate] = useState("");

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
        setSubjectId(subjectRows[0]?.id ?? "");
        setSectionId(sectionRows[0]?.id ?? "");
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Failed to load exam catalogs");
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, [open, instituteId]);

  const resetAndClose = () => {
    setName("");
    setHeader("");
    setStartDate("");
    setEndDate("");
    setPaperDate("");
    setAudienceScope("year");
    onClose();
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
    if (audienceScope === "section" && !sectionId) {
      onError("Select a target section");
      return;
    }

    const selectedSection = sections.find((s) => s.id === sectionId);
    const input: CreateExamInput = {
      instituteId,
      academicYearId,
      name: name.trim(),
      header: (header.trim() || name.trim()),
      startDate,
      endDate,
      defaultStartsAt: startsAt,
      defaultEndsAt: endsAt,
      totalMarks: marks,
      audienceScope,
      targetSections:
        audienceScope === "section" && selectedSection
          ? [{ sectionId: selectedSection.id, classId: selectedSection.classId }]
          : undefined,
      subjectSchedules:
        subjectId && (paperDate || startDate)
          ? [
              {
                subjectId,
                paperDate: paperDate || startDate,
                startsAt,
                endsAt,
              },
            ]
          : undefined,
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
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="End date" required>
            <TextInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
          <Field label="Default start">
            <TextInput
              type="time"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="Default end">
            <TextInput
              type="time"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
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
              onChange={(e) =>
                setAudienceScope(e.target.value as "year" | "section")
              }
            >
              <option value="year">All classes (year)</option>
              <option value="section">Selected section</option>
            </Select>
          </Field>
          {audienceScope === "section" ? (
            <Field label="Target section" required className="sm:col-span-2">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {sections.length === 0 ? (
                  <option value="">No sections</option>
                ) : (
                  sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))
                )}
              </Select>
            </Field>
          ) : null}
          <Field label="First paper subject" className="sm:col-span-2">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">None (header only)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </Field>
          {subjectId ? (
            <Field label="First paper date">
              <TextInput
                type="date"
                value={paperDate}
                onChange={(e) => setPaperDate(e.target.value)}
                placeholder="Defaults to start date"
              />
            </Field>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
