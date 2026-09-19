import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { listParents, getParent } from "@/lib/parents";
import type { ParentDto } from "@/lib/parents/types";
import { getStudent } from "@/lib/students";

export type StudentClassOption = {
  /** Select value — class UUID in API mode, label otherwise. */
  value: string;
  label: string;
  /** Present in API mode for enrollment. */
  classId?: string;
  academicYearId?: string;
  sections: Array<{
    value: string;
    label: string;
    sectionId?: string;
    classId?: string;
    academicYearId?: string;
  }>;
};

export type StudentSectionOption = {
  value: string;
  label: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  classLabel: string;
  sectionLabel: string;
};

function firstEnrollableClass(classOptions: StudentClassOption[]): StudentClassOption | undefined {
  return classOptions.find((item) => item.sections.length > 0) ?? classOptions[0];
}

function emptyDraft(
  academic: DemoAcademicConfig | null,
  classOptions: StudentClassOption[],
  sectionOptions: StudentSectionOption[] = [],
): StudentDraft {
  const firstClass = firstEnrollableClass(classOptions);
  const firstNestedSection = firstClass?.sections[0];
  const firstFlatSection = sectionOptions.find(
    (item) => item.classId === (firstClass?.classId ?? firstClass?.value),
  );
  return {
    firstName: "",
    surname: "",
    className:
      firstClass?.classId ??
      firstClass?.value ??
      firstFlatSection?.classId ??
      academic?.levels[0]?.label ??
      "",
    section:
      firstNestedSection?.sectionId ??
      firstNestedSection?.value ??
      firstFlatSection?.sectionId ??
      "",
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

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function usableAddress(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "—") return "";
  return trimmed;
}

/** Prefer parent.address; if missing, use a linked child's address. */
async function resolveAddressForExistingParent(parent: ParentDto): Promise<string> {
  const direct = usableAddress(parent.address);
  if (direct) return direct;

  let full = parent;
  try {
    full = await getParent(parent.id);
  } catch {
    // Fall back to the list row we already have.
  }

  const fromParent = usableAddress(full.address);
  if (fromParent) return fromParent;

  const studentId =
    full.links?.find((link) => link.status === "active")?.studentId ??
    full.links?.[0]?.studentId;
  if (!studentId) return "";

  try {
    const student = await getStudent(studentId);
    return usableAddress(student.address);
  } catch {
    return "";
  }
}

export function StudentCreateDialog({
  open,
  academic,
  apiMode = false,
  instituteId = null,
  classOptions = [],
  sectionOptions = [],
  onClose,
  onCreate,
}: {
  open: boolean;
  academic: DemoAcademicConfig | null;
  /** When true, class/section come from API catalog. Connect accounts are provisioned via auth flows. */
  apiMode?: boolean;
  instituteId?: string | null;
  classOptions?: StudentClassOption[];
  /** Flat class·section pairs for API create (preferred). */
  sectionOptions?: StudentSectionOption[];
  onClose: () => void;
  onCreate: (draft: StudentDraft, addSibling: boolean) => void;
}) {
  const [draft, setDraft] = useState<StudentDraft>(() =>
    emptyDraft(academic, classOptions, sectionOptions),
  );
  const catalogReady =
    !apiMode || classOptions.some((c) => c.sections.length > 0) || sectionOptions.length > 0;
  const selectedClass =
    classOptions.find(
      (item) => item.value === draft.className || item.classId === draft.className,
    ) ?? null;
  const sectionsForClass = selectedClass?.sections ?? [];
  const [errors, setErrors] = useState<string[]>([]);
  const [matchedParents, setMatchedParents] = useState<ParentDto[]>([]);
  const [parentLookupBusy, setParentLookupBusy] = useState(false);
  const [selectedExistingParentId, setSelectedExistingParentId] = useState<string | null>(
    null,
  );
  const wasOpenRef = useRef(false);

  // Reset form only when the dialog opens — not when catalog refreshes mid-edit.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(emptyDraft(academic, classOptions, sectionOptions));
      setErrors([]);
      setMatchedParents([]);
      setSelectedExistingParentId(null);
    }
    wasOpenRef.current = open;
  }, [open, academic, classOptions, sectionOptions]);

  // If catalog loads after open and placement is still empty/invalid, fill defaults once.
  useEffect(() => {
    if (!open || !apiMode) return;
    const matchedClass = classOptions.find(
      (item) => item.value === draft.className || item.classId === draft.className,
    );
    const matchedSection = matchedClass?.sections.find(
      (item) => item.value === draft.section || item.sectionId === draft.section,
    );
    if (matchedClass && matchedSection) return;
    if (matchedClass && matchedClass.sections.length === 0 && !draft.section) return;
    const firstClass = firstEnrollableClass(classOptions);
    if (!firstClass) return;
    if (matchedClass && !matchedSection) {
      const nextSection = matchedClass.sections[0];
      setDraft((current) => ({
        ...current,
        section: nextSection?.sectionId ?? nextSection?.value ?? "",
      }));
      return;
    }
    const firstSection = firstClass.sections[0];
    setDraft((current) => ({
      ...current,
      className: firstClass.classId ?? firstClass.value,
      section: firstSection?.sectionId ?? firstSection?.value ?? "",
    }));
  }, [open, apiMode, classOptions, draft.className, draft.section]);

  useEffect(() => {
    if (!open || !apiMode || !instituteId) {
      setMatchedParents([]);
      return;
    }
    const digits = phoneDigits(draft.parentPhone);
    if (digits.length !== 10) {
      setMatchedParents([]);
      setSelectedExistingParentId(null);
      return;
    }
    let cancelled = false;
    setParentLookupBusy(true);
    const timer = window.setTimeout(() => {
      void listParents({ instituteId, q: digits })
        .then((rows) => {
          if (cancelled) return;
          const matches = rows.filter(
            (row) => phoneDigits(row.phone) === digits,
          );
          setMatchedParents(matches);
          if (
            selectedExistingParentId &&
            !matches.some((row) => row.id === selectedExistingParentId)
          ) {
            setSelectedExistingParentId(null);
          }
        })
        .catch(() => {
          if (!cancelled) setMatchedParents([]);
        })
        .finally(() => {
          if (!cancelled) setParentLookupBusy(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, apiMode, instituteId, draft.parentPhone, selectedExistingParentId]);

  const applyExistingParent = (parent: ParentDto) => {
    setSelectedExistingParentId(parent.id);
    setDraft((current) => ({
      ...current,
      parentName: parent.name,
      parentPhone: phoneDigits(parent.phone),
      address: usableAddress(parent.address) || current.address,
    }));
    void resolveAddressForExistingParent(parent).then((address) => {
      if (!address) return;
      setDraft((current) =>
        usableAddress(current.address)
          ? current
          : {
              ...current,
              parentName: parent.name,
              parentPhone: phoneDigits(parent.phone),
              address,
            },
      );
    });
  };

  const submit = (addSibling: boolean) => {
    if (!catalogReady) {
      setErrors([
        "Create an academic year, then a class with a section, before adding students.",
      ]);
      return;
    }
    const validationErrors = validateStudentDraft(draft, { apiMode });
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onCreate(draft, addSibling);
    setErrors([]);
    if (addSibling) {
      setDraft((current) => ({
        ...emptyDraft(academic, classOptions, sectionOptions),
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
      subtitle={
        apiMode
          ? catalogReady
            ? "Creates student, parent, and parent↔child link. Same parent phone links siblings."
            : "Students need a class and section from setup before they can be enrolled."
          : "Required academic and parent details are marked below"
      }
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {catalogReady ? (
            <>
              <Button onClick={() => submit(true)}>
                <Users className="size-3.5" /> Save & Add Sibling
              </Button>
              <Button variant="primary" onClick={() => submit(false)}>
                <UserPlus className="size-3.5" /> Create Student
              </Button>
            </>
          ) : (
            <Link to="/setup">
              <Button variant="primary" onClick={onClose}>
                Open setup checklist
              </Button>
            </Link>
          )}
        </>
      }
    >
      {!catalogReady ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            Finish these steps first — students cannot be added without enrollment.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Create (and activate) an academic year</li>
            <li>Add a class with at least one section</li>
            <li>Then return here to add students</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/academic-management"
              search={{ view: "years" }}
              onClick={onClose}
            >
              <Button size="sm" variant="outline">
                Academic year
              </Button>
            </Link>
            <Link to="/classes" onClick={onClose}>
              <Button size="sm" variant="outline">
                Classes & sections
              </Button>
            </Link>
            <Link to="/setup" onClick={onClose}>
              <Button size="sm" variant="primary">
                Setup checklist
              </Button>
            </Link>
          </div>
        </div>
      ) : (
      <>
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
        <Field
          label={apiMode ? "Class" : !academic || academic.mode !== "college" ? "Class" : "Year"}
          required
          hint={
            apiMode
              ? classOptions.length > 0
                ? `${classOptions.length} class${classOptions.length === 1 ? "" : "es"} from this institute`
                : "Create classes and sections first"
              : undefined
          }
        >
          {apiMode ? (
            <Select
              value={draft.className}
              onChange={(event) => {
                const nextClassId = event.target.value;
                const nextClass = classOptions.find(
                  (item) => item.value === nextClassId || item.classId === nextClassId,
                );
                const nextSection = nextClass?.sections[0];
                setDraft({
                  ...draft,
                  className: nextClassId,
                  section: nextSection?.sectionId ?? nextSection?.value ?? "",
                });
              }}
            >
              {classOptions.length > 0 ? (
                classOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              ) : (
                <option value="">No classes available</option>
              )}
            </Select>
          ) : !academic ? (
            <TextInput value={draft.className} readOnly placeholder="No classes available" />
          ) : (
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
          )}
        </Field>
        <Field
          label="Section"
          required={apiMode}
          hint={
            apiMode
              ? sectionsForClass.length > 0
                ? `${sectionsForClass.length} section${sectionsForClass.length === 1 ? "" : "s"} in selected class`
                : selectedClass
                  ? "Selected class has no sections yet"
                  : "Select a class first"
              : "Optional"
          }
        >
          {apiMode ? (
            <Select
              value={draft.section}
              disabled={sectionsForClass.length === 0}
              onChange={(event) => setDraft({ ...draft, section: event.target.value })}
            >
              {sectionsForClass.length > 0 ? (
                sectionsForClass.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              ) : (
                <option value="">No sections available</option>
              )}
            </Select>
          ) : !academic ? (
            <TextInput value={draft.section} readOnly placeholder="No sections available" />
          ) : (
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
          )}
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
            max={new Date().toISOString().slice(0, 10)}
            placeholder="YYYY-MM-DD"
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
        <Field
          label="Roll number"
          required={apiMode}
          hint={
            apiMode
              ? "Required · places the student on the class & section roster"
              : "Optional · used in class & section roster order"
          }
        >
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
            {apiMode
              ? " Parent can sign into Connect with this phone after create."
              : null}
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
        <Field label="Parent phone" required hint="Exactly 10 digits · matches existing parents">
          <TextInput
            value={draft.parentPhone}
            onChange={(event) => {
              setSelectedExistingParentId(null);
              setDraft({ ...draft, parentPhone: normalizePhone(event.target.value) });
            }}
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
          />
        </Field>
        {apiMode && phoneDigits(draft.parentPhone).length === 10 ? (
          <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3">
            {parentLookupBusy ? (
              <p className="text-xs text-muted-foreground">Checking for existing parent…</p>
            ) : matchedParents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Existing parent found — select to link this child as a sibling
                </p>
                {matchedParents.map((parent) => {
                  const selected = selectedExistingParentId === parent.id;
                  return (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => applyExistingParent(parent)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="block font-semibold">{parent.name}</span>
                      <span className="text-muted-foreground">
                        {phoneDigits(parent.phone)}
                        {parent.email ? ` · ${parent.email}` : ""}
                        {parent.links?.length
                          ? ` · ${parent.links.length} linked child${parent.links.length === 1 ? "" : "ren"}`
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No existing parent with this phone — a new parent will be created.
              </p>
            )}
          </div>
        ) : null}
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

      {!apiMode ? (
        <>
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

          {draft.createConnectAccount ? (
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
                <Field
                  label="Admin demo password"
                  required
                  hint="Student changes it after OTP on first login"
                >
                  <TextInput
                    value={draft.temporaryPassword}
                    onChange={(event) =>
                      setDraft({ ...draft, temporaryPassword: event.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      </>
      )}

      {errors.length > 0 ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="text-xs font-semibold text-destructive">Complete required fields</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  );
}
