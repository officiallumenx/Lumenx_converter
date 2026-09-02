import { useEffect, useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import type { DemoAcademicConfig } from "@lumenx/types";
import {
  Button,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";

import type { AdminAdmissionDetail } from "@/lib/admissions-application-details";
import type { AdminSyncRow } from "@/lib/admissions-sync";
import type { AdmissionApplicationListItem } from "@/lib/admissions";
import {
  convertDraftFromAdmission,
  fillParentAccountFromAdmission,
  validateAdmissionConvertDraft,
  type AdmissionConvertDraft,
} from "@/lib/admission-to-student";
import type { ParentRelationship } from "@/lib/parent-directory-store";
import { normalizePhone, type StudentGender } from "@/lib/student-directory-store";
import {
  getCurrentOpeningSeats,
  remainingSeatsAfterConversion,
} from "@/lib/admissions-opening-seat-sync";

export function ConvertToStudentDialog({
  open,
  row,
  detail,
  academic,
  onClose,
  onConvert,
}: {
  open: boolean;
  row: AdminSyncRow | AdmissionApplicationListItem | null;
  detail: AdminAdmissionDetail | null;
  academic: DemoAcademicConfig;
  onClose: () => void;
  onConvert: (draft: AdmissionConvertDraft) => void;
}) {
  const [draft, setDraft] = useState<AdmissionConvertDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !row) return;
    const nextDraft = convertDraftFromAdmission(row, detail, academic);
    const openingSeats = getCurrentOpeningSeats(row.instituteId, nextDraft.student.className);
    if (openingSeats.seatsAvailable !== null) {
      nextDraft.seatsRemaining = remainingSeatsAfterConversion(openingSeats.seatsAvailable);
    }
    setDraft(nextDraft);
    setErrors([]);
  }, [open, row, detail, academic]);

  if (!row || !draft) {
    return (
      <Modal open={open} onClose={onClose} title="Convert to student">
        <p className="text-sm text-muted-foreground">No application selected.</p>
      </Modal>
    );
  }

  const student = draft.student;
  const missingParentHints: string[] = [];
  if (draft.createParentAccount) {
    if (!/^\d{10}$/.test(student.parentPhone)) {
      missingParentHints.push("10-digit mobile is required — parents log in with this number only.");
    }
    if (draft.parentPassword.length < 8) {
      missingParentHints.push("Set a Connect password (at least 8 characters).");
    }
  }

  const patchStudent = (patch: Partial<typeof student>) => {
    const nextStudent = { ...student, ...patch };
    let seatsRemaining = draft.seatsRemaining;
    if (patch.className !== undefined) {
      const opening = getCurrentOpeningSeats(row.instituteId, nextStudent.className);
      if (opening.seatsAvailable !== null) {
        seatsRemaining = remainingSeatsAfterConversion(opening.seatsAvailable);
      }
    }
    setDraft({ ...draft, student: nextStudent, seatsRemaining });
  };

  const openingSeats = getCurrentOpeningSeats(row.instituteId, student.className);
  const previewDocs =
    detail?.documents.map((doc) => ({
      id: doc.id,
      label: doc.label,
      fileName: doc.fileName,
      status: doc.status,
      preview:
        doc.previewImageUrl ??
        `data:text/html;charset=utf-8,${encodeURIComponent(
          `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:16px"><h3>${doc.label}</h3><p>${doc.fileName}</p>${(doc.previewLines ?? [])
            .map((line) => `<p>${line}</p>`)
            .join("")}</body></html>`,
        )}`,
    })) ?? [];

  const submit = () => {
    const validationErrors = validateAdmissionConvertDraft(draft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onConvert(draft);
  };

  const toggleParentAccount = (checked: boolean) => {
    if (checked) {
      setDraft(fillParentAccountFromAdmission(draft, detail));
    } else {
      setDraft({ ...draft, createParentAccount: false });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convert to student"
      subtitle={`${row.id} · details filled from the application — edit anything missing`}
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            <UserPlus className="size-3.5" /> Create student
          </Button>
        </>
      }
    >
      <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Values below are copied from the admissions form. Complete any blank required fields
        manually before creating the student.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required>
          <TextInput
            value={student.firstName}
            onChange={(event) => patchStudent({ firstName: event.target.value })}
          />
        </Field>
        <Field label="Surname" required>
          <TextInput
            value={student.surname}
            onChange={(event) => patchStudent({ surname: event.target.value })}
          />
        </Field>
        <Field label={academic.mode === "college" ? "Year" : "Class"} required>
          <Select
            value={student.className}
            onChange={(event) => patchStudent({ className: event.target.value })}
          >
            {academic.levels.map((level) => (
              <option key={level.id} value={level.label}>
                {level.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Section" required hint="Assign class section">
          <Select
            value={student.section}
            onChange={(event) => patchStudent({ section: event.target.value })}
          >
            {academic.sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Academic year" required hint="Assign the enrollment year">
          <TextInput
            value={draft.academicYear}
            onChange={(event) => setDraft({ ...draft, academicYear: event.target.value })}
            placeholder="2026–27"
          />
        </Field>
        <Field
          label="Seats still available"
          required
          hint="Enter remaining seats after this conversion (0 sets opening to Waitlist Only)"
        >
          <TextInput
            type="number"
            min={0}
            value={String(draft.seatsRemaining)}
            onChange={(event) =>
              setDraft({
                ...draft,
                seatsRemaining: Math.max(0, Number(event.target.value) || 0),
              })
            }
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Current opening seats:{" "}
            {openingSeats.seatsAvailable === null ? "Not linked to an opening" : openingSeats.seatsAvailable}
            {openingSeats.openingName ? ` · ${openingSeats.openingName}` : ""}
          </p>
          {draft.seatsRemaining === 0 ? (
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
              Opening will become Waitlist Only.
            </p>
          ) : null}
        </Field>
        <Field label="Gender" required>
          <Select
            value={student.gender}
            onChange={(event) =>
              patchStudent({ gender: event.target.value as StudentGender })
            }
          >
            <option value="">Select gender</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <Field label="Date of birth" hint="From application">
          <TextInput
            type="date"
            value={student.dateOfBirth}
            onChange={(event) => patchStudent({ dateOfBirth: event.target.value })}
          />
        </Field>
        <Field label="Admission number" hint="Application id by default">
          <TextInput
            value={student.admissionNumber}
            onChange={(event) => patchStudent({ admissionNumber: event.target.value })}
          />
        </Field>
        <Field label="Roll number" hint="Optional">
          <TextInput
            value={student.rollNo}
            onChange={(event) => patchStudent({ rollNo: event.target.value })}
            placeholder="12"
          />
        </Field>
      </div>

      <div className="my-5 border-t border-border" />
      <div className="mb-3 text-xs font-semibold">Parent details</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Parent name" required>
          <TextInput
            value={student.parentName}
            onChange={(event) => patchStudent({ parentName: event.target.value })}
          />
        </Field>
        <Field label="Parent phone" required hint="Exactly 10 digits · Connect login ID (mandatory)">
          <TextInput
            value={student.parentPhone}
            onChange={(event) =>
              patchStudent({ parentPhone: normalizePhone(event.target.value) })
            }
            inputMode="numeric"
            maxLength={10}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address" required>
            <TextArea
              value={student.address}
              onChange={(event) => patchStudent({ address: event.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="my-5 border-t border-border" />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-4 hover:border-primary/35">
        <input
          type="checkbox"
          checked={draft.createParentAccount}
          onChange={(event) => toggleParentAccount(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <KeyRound className="size-4 shrink-0 text-primary" />
        <span>
          <span className="block text-xs font-semibold">Create Parent Connect account</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            Parents sign in with mobile number only. Phone is mandatory; email is optional contact.
          </span>
        </span>
      </label>

      {draft.createParentAccount && (
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4 sm:grid-cols-2">
          <Field
            label="Login mobile"
            required
            hint={
              /^\d{10}$/.test(student.parentPhone)
                ? "From application · parents use this number to sign in"
                : "Missing or invalid — enter 10 digits (required for login)"
            }
          >
            <TextInput
              value={student.parentPhone}
              onChange={(event) =>
                patchStudent({ parentPhone: normalizePhone(event.target.value) })
              }
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
            />
          </Field>
          <Field label="Relationship" required>
            <Select
              value={draft.parentRelationship}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  parentRelationship: event.target.value as ParentRelationship,
                })
              }
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Guardian">Guardian</option>
            </Select>
          </Field>
          <Field
            label="Parent email"
            hint="Optional · not used for Connect login"
          >
            <TextInput
              type="email"
              value={draft.parentEmail}
              onChange={(event) => setDraft({ ...draft, parentEmail: event.target.value })}
              placeholder="parent@email.com"
            />
          </Field>
          <Field
            label="Connect password"
            required
            hint="Used with the mobile number above"
          >
            <TextInput
              value={draft.parentPassword}
              onChange={(event) =>
                setDraft({ ...draft, parentPassword: event.target.value })
              }
            />
          </Field>
          {missingParentHints.length > 0 ? (
            <div className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
              {missingParentHints.map((hint) => (
                <div key={hint}>{hint}</div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="text-xs font-semibold text-destructive">Complete required fields</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {previewDocs.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
          <p className="text-xs font-semibold">Admission document preview</p>
          <div className="mt-2 space-y-1.5">
            {previewDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">
                  {doc.label} · {doc.fileName} · {doc.status}
                </span>
                <Button
                  size="sm"
                  onClick={() => window.open(doc.preview, "_blank", "noopener,noreferrer")}
                >
                  Preview
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
