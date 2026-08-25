import { useEffect, useState } from "react";
import { KeyRound, UserPlus, Users } from "lucide-react";
import type { DemoAcademicConfig } from "@lumenx/types";
import {
  Button,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";

import {
  normalizePhone,
  validateStudentDraft,
  type StudentDraft,
  type StudentGender,
} from "@/lib/student-directory-store";

function emptyDraft(academic: DemoAcademicConfig): StudentDraft {
  return {
    firstName: "",
    surname: "",
    className: academic.levels[0]?.label ?? "",
    section: "",
    parentName: "",
    parentPhone: "",
    address: "",
    gender: "",
    dateOfBirth: "",
    admissionNumber: "",
    rollNo: "",
    createConnectAccount: false,
    studentPhone: "",
    studentEmail: "",
    temporaryPassword: "Student@123",
  };
}

export function StudentCreateDialog({
  open,
  academic,
  onClose,
  onCreate,
}: {
  open: boolean;
  academic: DemoAcademicConfig;
  onClose: () => void;
  onCreate: (draft: StudentDraft, addSibling: boolean) => void;
}) {
  const [draft, setDraft] = useState<StudentDraft>(() => emptyDraft(academic));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft(academic));
    setErrors([]);
  }, [open, academic]);

  const submit = (addSibling: boolean) => {
    const validationErrors = validateStudentDraft(draft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onCreate(draft, addSibling);
    setErrors([]);
    if (addSibling) {
      setDraft((current) => ({
        ...emptyDraft(academic),
        parentName: current.parentName,
        parentPhone: current.parentPhone,
        address: current.address,
      }));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add student"
      subtitle="Required academic and parent details are marked below"
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => submit(true)}>
            <Users className="size-3.5" /> Save & Add Sibling
          </Button>
          <Button variant="primary" onClick={() => submit(false)}>
            <UserPlus className="size-3.5" /> Create Student
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required>
          <TextInput
            value={draft.firstName}
            onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
            placeholder="Aanya"
          />
        </Field>
        <Field label="Surname" required>
          <TextInput
            value={draft.surname}
            onChange={(event) => setDraft({ ...draft, surname: event.target.value })}
            placeholder="Sharma"
          />
        </Field>
        <Field label={academic.mode === "college" ? "Year" : "Class"} required>
          <Select
            value={draft.className}
            onChange={(event) => setDraft({ ...draft, className: event.target.value })}
          >
            {academic.levels.map((level) => (
              <option key={level.id} value={level.label}>
                {level.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Section" hint="Optional">
          <Select
            value={draft.section}
            onChange={(event) => setDraft({ ...draft, section: event.target.value })}
          >
            <option value="">Not assigned</option>
            {academic.sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gender" required>
          <Select
            value={draft.gender}
            onChange={(event) =>
              setDraft({ ...draft, gender: event.target.value as StudentGender })
            }
          >
            <option value="">Select gender</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <Field label="Date of birth" hint="Optional">
          <TextInput
            type="date"
            value={draft.dateOfBirth}
            onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })}
          />
        </Field>
        <Field label="Admission number" hint="Optional · student ID is generated if blank">
          <TextInput
            value={draft.admissionNumber}
            onChange={(event) => setDraft({ ...draft, admissionNumber: event.target.value })}
            placeholder="ADM-2026-001"
          />
        </Field>
        <Field label="Roll number" hint="Optional · used in class & section roster order">
          <TextInput
            value={draft.rollNo}
            onChange={(event) => setDraft({ ...draft, rollNo: event.target.value })}
            placeholder="12"
          />
        </Field>
      </div>

      <div className="my-5 border-t border-border" />
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <div>
          <div className="text-xs font-semibold">Parent details</div>
          <div className="text-[11px] text-muted-foreground">
            Save & Add Sibling keeps these details for the next student.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Parent name" required>
          <TextInput
            value={draft.parentName}
            onChange={(event) => setDraft({ ...draft, parentName: event.target.value })}
            placeholder="Rohan Sharma"
          />
        </Field>
        <Field label="Parent phone" required hint="Exactly 10 digits">
          <TextInput
            value={draft.parentPhone}
            onChange={(event) =>
              setDraft({ ...draft, parentPhone: normalizePhone(event.target.value) })
            }
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address" required>
            <TextArea
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              placeholder="Complete residential address"
            />
          </Field>
        </div>
      </div>

      <div className="my-5 border-t border-border" />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-4 hover:border-primary/35">
        <input
          type="checkbox"
          checked={draft.createConnectAccount}
          onChange={(event) =>
            setDraft({ ...draft, createConnectAccount: event.target.checked })
          }
          className="mt-0.5 size-4 accent-primary"
        />
        <KeyRound className="size-4 shrink-0 text-primary" />
        <span>
          <span className="block text-xs font-semibold">Create Student Connect account</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            Student can use mobile, email, or either one when both are entered.
          </span>
        </span>
      </label>

      {draft.createConnectAccount && (
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4 sm:grid-cols-2">
          <Field label="Student phone" hint="Optional if email is entered · 10 digits">
            <TextInput
              value={draft.studentPhone}
              onChange={(event) =>
                setDraft({ ...draft, studentPhone: normalizePhone(event.target.value) })
              }
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
            />
          </Field>
          <Field label="Student email" hint="Optional if phone is entered">
            <TextInput
              type="email"
              value={draft.studentEmail}
              onChange={(event) => setDraft({ ...draft, studentEmail: event.target.value })}
              placeholder="student@institute.edu"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Admin demo password" required hint="Student changes it after OTP on first login">
              <TextInput
                value={draft.temporaryPassword}
                onChange={(event) =>
                  setDraft({ ...draft, temporaryPassword: event.target.value })
                }
              />
            </Field>
          </div>
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
    </Modal>
  );
}
