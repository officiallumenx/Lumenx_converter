import { useState } from "react";
import { Button, Field, Modal, TextInput } from "@lumenx/ui-admin";
import { createAdmissionProgram } from "@/lib/admissions";

type AdmissionProgramCreateDialogProps = {
  open: boolean;
  instituteId: string;
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
};

export function AdmissionProgramCreateDialog({
  open,
  instituteId,
  onClose,
  onCreated,
  onError,
}: AdmissionProgramCreateDialogProps) {
  const [name, setName] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("2026–27");
  const [seatsAvailable, setSeatsAvailable] = useState("40");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const resetAndClose = () => {
    setName("");
    setDescription("");
    setApplicationDeadline("");
    onClose();
  };

  const submit = () => {
    if (!name.trim()) {
      onError("Program name is required");
      return;
    }

    setSaving(true);
    void createAdmissionProgram({
      instituteId,
      name: name.trim(),
      description: description.trim() || null,
      academicYearLabel: academicYearLabel.trim() || null,
      seatsAvailable: Number.parseInt(seatsAvailable, 10) || 0,
      applicationDeadline: applicationDeadline.trim() || undefined,
      publishNow,
    })
      .then(() => {
        onCreated();
        resetAndClose();
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Failed to create program");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Add admission program"
      footer={
        <>
          <Button onClick={resetAndClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create program"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Program name" required>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Primary School Admissions"
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
        <Field label="Description">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional overview for parents"
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          Publish immediately (visible to applicants)
        </label>
      </div>
    </Modal>
  );
}
