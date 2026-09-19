import { Button, Field, Modal, Select } from "@lumenx/ui-admin";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ScheduleConfigForm } from "@/components/timetable/ScheduleConfigForm";
import {
  loadInstituteScheduleDefault,
  saveInstituteScheduleDefault,
  saveSectionScheduleInput,
} from "@/lib/timetable-directory-store";
import {
  buildScheduleConfig,
  defaultScheduleInput,
  scheduleSummary,
  validateBellItems,
  type ScheduleInput,
} from "@/lib/timetable-schedule";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import { classLabelForSection } from "@/lib/classes/map";

type TimetableCreateWizardProps = {
  open: boolean;
  onClose: () => void;
  classes: ClassDto[];
  sections: SectionDto[];
  instituteId?: string | null;
  busy?: boolean;
  onCreated: (sectionId: string) => void;
};

export function TimetableCreateWizard({
  open,
  onClose,
  classes,
  sections,
  instituteId,
  busy = false,
  onCreated,
}: TimetableCreateWizardProps) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [useExistingTemplate, setUseExistingTemplate] = useState(true);
  const [scheduleInput, setScheduleInput] = useState<ScheduleInput>(() =>
    loadInstituteScheduleDefault(),
  );
  const [error, setError] = useState<string | null>(null);

  const classesById = useMemo(
    () => new Map(classes.map((cls) => [cls.id, cls])),
    [classes],
  );

  const classOptions = useMemo(
    () =>
      [...classes]
        .filter((cls) => cls.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [classes],
  );

  const sectionOptions = useMemo(
    () =>
      sections
        .filter((s) => (!classId ? false : s.classId === classId) && s.status === "active")
        .sort((a, b) =>
          (a.code || a.name).localeCompare(b.code || b.name),
        ),
    [sections, classId],
  );

  const customIssues = useMemo(() => {
    if (useExistingTemplate) return [];
    const items =
      scheduleInput.bellItems ?? buildScheduleConfig(scheduleInput).bellItems ?? [];
    return validateBellItems(items).filter((i) => i.severity === "error");
  }, [useExistingTemplate, scheduleInput]);

  const reset = () => {
    setClassId("");
    setSectionId("");
    setUseExistingTemplate(true);
    setScheduleInput(loadInstituteScheduleDefault());
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const create = () => {
    if (!classId) {
      setError("Select a class");
      return;
    }
    if (!sectionId) {
      setError("Select a section");
      return;
    }
    if (customIssues.length > 0) {
      setError(customIssues[0]?.message ?? "Fix schedule errors before creating");
      return;
    }

    const schedule = useExistingTemplate
      ? loadInstituteScheduleDefault()
      : scheduleInput;
    saveSectionScheduleInput(sectionId, schedule, instituteId ?? undefined);
    if (useExistingTemplate) {
      // Keep institute default warm as “previous template”.
      saveInstituteScheduleDefault(schedule);
    }

    const createdSectionId = sectionId;
    reset();
    onCreated(createdSectionId);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create timetable"
      subtitle="Select class and section, then use a previous template or configure new timings"
      size="lg"
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !classId || !sectionId || customIssues.length > 0}
            onClick={create}
          >
            <Plus className="size-3.5" /> Create table
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Select class" required>
            <Select
              value={classId}
              disabled={busy}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setError(null);
              }}
            >
              <option value="">Select class</option>
              {classOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name.trim() || cls.code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Select section" required>
            <Select
              value={sectionId}
              disabled={busy || !classId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setError(null);
              }}
            >
              <option value="">Select section</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code?.trim() || section.name?.trim() || section.id.slice(0, 8)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {classId && sectionId ? (
          <p className="text-xs text-muted-foreground">
            Creating for{" "}
            <span className="font-medium text-foreground">
              {(() => {
                const section = sections.find((s) => s.id === sectionId);
                if (!section) return "…";
                return `${classLabelForSection(section, classesById)} · Sec ${
                  section.code?.trim() || section.name?.trim() || "—"
                }`;
              })()}
            </span>
          </p>
        ) : null}

        <Field label="Use existing template?">
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              className={`rounded-lg border px-3 py-2.5 cursor-pointer ${
                useExistingTemplate
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={useExistingTemplate}
                onChange={() => {
                  setUseExistingTemplate(true);
                  setScheduleInput(loadInstituteScheduleDefault());
                }}
              />
              <div className="text-sm font-medium">Use previous template</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Default · {scheduleSummary(buildScheduleConfig(loadInstituteScheduleDefault()))}
              </div>
            </label>
            <label
              className={`rounded-lg border px-3 py-2.5 cursor-pointer ${
                !useExistingTemplate
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={!useExistingTemplate}
                onChange={() => {
                  setUseExistingTemplate(false);
                  setScheduleInput(defaultScheduleInput());
                }}
              />
              <div className="text-sm font-medium">New template (timings)</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Select custom for this class
              </div>
            </label>
          </div>
        </Field>

        {!useExistingTemplate ? (
          <ScheduleConfigForm
            value={scheduleInput}
            onChange={setScheduleInput}
            mode="class-override"
          />
        ) : null}
      </div>
    </Modal>
  );
}
