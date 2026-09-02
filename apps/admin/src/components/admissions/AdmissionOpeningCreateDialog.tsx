import { useState } from "react";
import { Button, Field, Modal, Select, TextInput } from "@lumenx/ui-admin";
import { createAdmissionOpening, type AdmissionProgramListItem } from "@/lib/admissions";

type AdmissionOpeningCreateDialogProps = {
  open: boolean;
  instituteId: string;
  programs: AdmissionProgramListItem[];
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
};

export function AdmissionOpeningCreateDialog({
  open,
  instituteId,
  programs,
  onClose,
  onCreated,
  onError,
}: AdmissionOpeningCreateDialogProps) {
  const [programId, setProgramId] = useState("");
  const [name, setName] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("2026–27");
  const [seatsAvailable, setSeatsAvailable] = useState("20");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [openNow, setOpenNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const resetAndClose = () => {
    setProgramId("");
    setName("");
    setApplicationDeadline("");
    onClose();
  };

  const submit = () => {
    const resolvedProgramId = programId || programs[0]?.id;
    if (!resolvedProgramId) {
      onError("Create a program before adding openings");
      return;
    }
    if (!name.trim()) {
      onError("Opening name is required (e.g. Class 10)");
      return;
    }

    setSaving(true);
    void createAdmissionOpening({
      instituteId,
      programId: resolvedProgramId,
      name: name.trim(),
      academicYearLabel: academicYearLabel.trim() || null,
      seatsAvailable: Number.parseInt(seatsAvailable, 10) || 0,
      applicationDeadline: applicationDeadline.trim() || undefined,
      openNow,
    })
      .then(() => {
        onCreated();
        resetAndClose();
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Failed to create opening");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Add admission opening"
      footer={
        <>
          <Button onClick={resetAndClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={saving || programs.length === 0}>
            {saving ? "Creating…" : "Create opening"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add an admission program first, then link class openings to it.
          </p>
        ) : (
          <>
            <Field label="Program" required>
              <Select
                value={programId || programs[0]?.id || ""}
                onChange={(e) => setProgramId(e.target.value)}
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Opening name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Class 10"
              />
            </Field>
            <Field label="Academic year">
              <TextInput
                value={academicYearLabel}
                onChange={(e) => setAcademicYearLabel(e.target.value)}
                placeholder="2026–27"
              />
            </Field>
            <Field label="Seats available">
              <TextInput
                type="number"
                min={0}
                value={seatsAvailable}
                onChange={(e) => setSeatsAvailable(e.target.value)}
              />
            </Field>
            <Field label="Application deadline">
              <TextInput
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => setOpenNow(e.target.checked)}
              />
              Publish immediately (accepting applications)
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}
