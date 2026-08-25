import { useEffect, useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { Button, Field, Modal, Select, TextInput } from "@lumenx/ui-admin";

import type { AdminCareerDetail } from "@/lib/careers-application-details";
import type { AdminCareerSyncRow } from "@/lib/careers-sync";
import {
  convertDraftFromCareer,
  fillTeacherConnectFromCareer,
  normalizeTeacherPhone,
  validateCareerConvertDraft,
  type CareerConvertDraft,
  type TeacherRole,
} from "@/lib/career-to-teacher";

const DEPTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Science",
  "Sports",
  "Administration",
  "General",
] as const;

export function ConvertToTeacherDialog({
  open,
  row,
  detail,
  onClose,
  onConvert,
}: {
  open: boolean;
  row: AdminCareerSyncRow | null;
  detail: AdminCareerDetail | null;
  onClose: () => void;
  onConvert: (draft: CareerConvertDraft) => void;
}) {
  const [draft, setDraft] = useState<CareerConvertDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !row) return;
    setDraft(convertDraftFromCareer(row, detail));
    setErrors([]);
  }, [open, row, detail]);

  if (!row || !draft) {
    return (
      <Modal open={open} onClose={onClose} title="Convert to teacher">
        <p className="text-sm text-muted-foreground">No candidate selected.</p>
      </Modal>
    );
  }

  const missingHints: string[] = [];
  if (draft.createConnectAccount) {
    if (!/^\d{10}$/.test(draft.phone)) {
      missingHints.push("10-digit mobile is required — teachers log in with this number.");
    }
    if (draft.password.length < 8) {
      missingHints.push("Set a Connect password (at least 8 characters).");
    }
  }

  const submit = () => {
    const validationErrors = validateCareerConvertDraft(draft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onConvert(draft);
  };

  const toggleConnect = (checked: boolean) => {
    if (checked) setDraft(fillTeacherConnectFromCareer(draft, detail));
    else setDraft({ ...draft, createConnectAccount: false });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convert to teacher"
      subtitle={`${row.id} · details filled from the application — edit anything missing`}
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            <UserPlus className="size-3.5" /> Create teacher
          </Button>
        </>
      }
    >
      <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Values below are copied from the careers application. Complete any blank required fields
        manually before creating the teacher.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Department" required>
          <Select
            value={draft.dept}
            onChange={(event) => setDraft({ ...draft, dept: event.target.value })}
          >
            {DEPTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Teacher role" required>
          <Select
            value={draft.role}
            onChange={(event) =>
              setDraft({ ...draft, role: event.target.value as TeacherRole })
            }
          >
            <option value="subject-teacher">Subject Teacher</option>
            <option value="activity-coordinator">Activity Coordinator</option>
            <option value="both">Both Roles</option>
          </Select>
        </Field>
        <Field label="Qualification" hint="From application">
          <TextInput
            value={draft.qualification}
            onChange={(event) => setDraft({ ...draft, qualification: event.target.value })}
          />
        </Field>
        <Field label="Date of birth">
          <TextInput
            type="date"
            value={draft.dateOfBirth}
            onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })}
          />
        </Field>
        <Field label="Email" hint="Optional contact">
          <TextInput
            type="email"
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          />
        </Field>
        <Field label="Employee ID" hint="Optional · auto-generated if blank">
          <TextInput
            value={draft.employeeId}
            onChange={(event) => setDraft({ ...draft, employeeId: event.target.value })}
            placeholder="EMP-1100"
          />
        </Field>
      </div>

      <div className="my-5 border-t border-border" />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-4 hover:border-primary/35">
        <input
          type="checkbox"
          checked={draft.createConnectAccount}
          onChange={(event) => toggleConnect(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <KeyRound className="size-4 shrink-0 text-primary" />
        <span>
          <span className="block text-xs font-semibold">Create Teacher Connect account</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            Teachers sign in with mobile number only. Phone is mandatory when enabled.
          </span>
        </span>
      </label>

      {draft.createConnectAccount && (
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4 sm:grid-cols-2">
          <Field
            label="Login mobile"
            required
            hint={
              /^\d{10}$/.test(draft.phone)
                ? "From application · teachers use this number to sign in"
                : "Missing or invalid — enter 10 digits (required)"
            }
          >
            <TextInput
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: normalizeTeacherPhone(event.target.value) })
              }
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
            />
          </Field>
          <Field label="Connect password" required hint="Used with the mobile number">
            <TextInput
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </Field>
          {missingHints.length > 0 ? (
            <div className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
              {missingHints.map((hint) => (
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
    </Modal>
  );
}
