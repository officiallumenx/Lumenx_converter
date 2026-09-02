import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SimpleFileUpload,
  type SimpleUploadValue,
} from "@lumenx/ui";
import { isAllowedSimpleUploadName, toLocalIsoDate } from "@lumenx/utils";
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { DocumentUploadCard } from "@/admissions-portal/shared/ui/AdmissionsShellWidgets";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import {
  APPLY_STEPS,
  academicStepSchema,
  addressStepSchema,
  parentStepSchema,
  programStepSchema,
  studentStepSchema,
} from "@/lib/admissions/schemas";
import type {
  AdmissionType,
  ApplicationDraft,
  ChildApplicationDraft,
  DocumentType,
} from "@/lib/admissions/types";
import {
  getDraft,
  getProgramById,
  getPrograms,
  hasDuplicateActiveApplicationForInstitute,
  requiredDocumentsForAdmissionType,
  saveDraft,
  submitApplication,
} from "@/lib/admissions/repositories";
import { getInstituteById } from "@/lib/admissions/institutes-data";
import { getAdmissionForm } from "@/lib/admissions/institute-admin";
import type { AdmissionFormField } from "@/lib/admissions/types";

const DOC_TYPES: { type: DocumentType; label: string }[] = [
  { type: "birth_certificate", label: "Birth Certificate" },
  { type: "transfer_certificate", label: "Transfer Certificate" },
  { type: "marks_memo", label: "Previous Marks Memo" },
  { type: "student_photo", label: "Student Photo" },
  { type: "parent_id", label: "Parent ID" },
  { type: "additional", label: "Additional Documents" },
];

const ADMISSION_TYPES: { value: AdmissionType; label: string }[] = [
  { value: "first_time_schooling", label: "First Time Schooling" },
  { value: "transfer_admission", label: "Transfer Admission" },
];

const MOBILE_REGEX = /^\+?[0-9][0-9\s-]{7,14}$/;
const POSTAL_CODE_REGEX = /^[A-Za-z0-9 -]{4,10}$/;

function newChildDraft(seed?: {
  programId?: string;
  instituteId?: string;
}): ChildApplicationDraft {
  return {
    id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admissionType: "first_time_schooling",
    student: {},
    academic: {},
    programId: seed?.programId,
    instituteId: seed?.instituteId,
    grade: "",
    academicYear: "2026–27",
    documents: {},
    customAnswers: {},
  };
}

function emptyDraft(seed?: { programId?: string; instituteId?: string }): ApplicationDraft {
  const child = newChildDraft(seed);
  return {
    step: 0,
    parent: {},
    address: { country: "India" },
    children: [child],
    activeChildId: child.id,
    student: {},
    academic: {},
    documents: {},
  };
}

function migrateDraft(
  saved: ApplicationDraft | null,
  seed?: { programId?: string; instituteId?: string },
): ApplicationDraft {
  if (!saved) return emptyDraft(seed);
  if (saved.children && saved.children.length > 0) {
    return {
      ...saved,
      activeChildId: saved.activeChildId ?? saved.children[0]!.id,
    };
  }
  const migratedChild = newChildDraft({
    programId: saved.programId ?? seed?.programId,
    instituteId: saved.instituteId ?? seed?.instituteId,
  });
  migratedChild.student = saved.student ?? {};
  migratedChild.academic = saved.academic ?? {};
  migratedChild.programId = saved.programId ?? migratedChild.programId;
  migratedChild.instituteId = saved.instituteId ?? migratedChild.instituteId;
  migratedChild.grade = saved.grade ?? "";
  migratedChild.academicYear = saved.academicYear ?? "2026–27";
  migratedChild.documents = saved.documents ?? {};
  migratedChild.customAnswers = saved.customAnswers ?? {};
  return {
    ...saved,
    children: [migratedChild],
    activeChildId: migratedChild.id,
    parent: saved.parent ?? {},
    address: saved.address ?? { country: "India" },
  };
}

function docLabel(type: DocumentType): string {
  return DOC_TYPES.find((d) => d.type === type)?.label ?? type;
}

function hasAllowedDocumentExtension(fileName: string): boolean {
  return isAllowedSimpleUploadName(fileName, "document");
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function ApplyWizardPage({
  programId,
  instituteId,
}: {
  programId?: string;
  instituteId?: string;
}) {
  const { user } = useAdmissionsAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ApplicationDraft>(() =>
    emptyDraft({ programId, instituteId }),
  );
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const programs = getPrograms(instituteId);

  useEffect(() => {
    if (!user) return;
    const saved = getDraft(user.id);
    const nextDraft = migrateDraft(saved, { programId, instituteId });
    if (!nextDraft.parent.mobile && user.phone) nextDraft.parent.mobile = user.phone;
    if (!nextDraft.parent.email && user.email) nextDraft.parent.email = user.email;
    setDraft(nextDraft);
    setStep(Math.min(nextDraft.step ?? 0, 6));
  }, [user, programId, instituteId]);

  useEffect(() => {
    if (user && step < 7) saveDraft(user.id, { ...draft, step });
  }, [draft, step, user]);

  const children = draft.children ?? [];
  const activeChild =
    children.find((c) => c.id === draft.activeChildId) ?? children[0] ?? null;

  const selectedProgram = useMemo(
    () => (activeChild?.programId ? getProgramById(activeChild.programId) : undefined),
    [activeChild?.programId],
  );

  const activeInstitute =
    (activeChild?.instituteId && getInstituteById(activeChild.instituteId)) ||
    (instituteId ? getInstituteById(instituteId) : undefined);

  const formInstituteId =
    activeChild?.instituteId || selectedProgram?.instituteId || instituteId || "";

  const customFields = useMemo(() => {
    if (!formInstituteId) return [] as AdmissionFormField[];
    return getAdmissionForm(formInstituteId).fields;
  }, [formInstituteId]);

  const requiredDocs = useMemo(
    () =>
      activeChild
        ? requiredDocumentsForAdmissionType(activeChild.admissionType)
        : ([] as DocumentType[]),
    [activeChild?.admissionType],
  );

  const updateDraft = (patch: Partial<ApplicationDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const updateActiveChild = (patch: Partial<ChildApplicationDraft>) => {
    if (!activeChild) return;
    setDraft((prev) => ({
      ...prev,
      children: (prev.children ?? []).map((child) =>
        child.id === activeChild.id ? { ...child, ...patch } : child,
      ),
    }));
  };

  const setCustomAnswer = (fieldId: string, value: string) => {
    if (!activeChild) return;
    updateActiveChild({
      customAnswers: { ...(activeChild.customAnswers ?? {}), [fieldId]: value },
    });
  };

  const setDoc = (type: DocumentType, value: SimpleUploadValue | null) => {
    if (!activeChild) return;
    if (!value) {
      const next = { ...(activeChild.documents ?? {}) };
      delete next[type];
      updateActiveChild({ documents: next });
      return;
    }
    updateActiveChild({
      documents: {
        ...(activeChild.documents ?? {}),
        [type]: { fileName: value.fileName, dataUrl: value.dataUrl },
      },
    });
  };

  const addChild = () => {
    const child = newChildDraft();
    setDraft((prev) => ({
      ...prev,
      children: [...(prev.children ?? []), child],
      activeChildId: child.id,
    }));
    toast.success("New child added. Enter student details separately.");
  };

  const removeChild = (childId: string) => {
    if (children.length <= 1) return;
    const next = children.filter((c) => c.id !== childId);
    setDraft((prev) => ({
      ...prev,
      children: next,
      activeChildId: prev.activeChildId === childId ? next[0]?.id : prev.activeChildId,
    }));
  };

  const validateCustomFieldValue = (
    field: AdmissionFormField,
    value: string,
  ): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (field.type === "email" && !z.string().email().safeParse(trimmed).success) {
      return `${field.label} must be a valid email`;
    }

    if (field.type === "phone") {
      const digits = trimmed.replace(/\D/g, "");
      if (!MOBILE_REGEX.test(trimmed) || digits.length < 10) {
        return `${field.label} must be a valid mobile number`;
      }
    }

    if (field.type === "number" && !z.coerce.number().finite().safeParse(trimmed).success) {
      return `${field.label} must be a valid number`;
    }

    if (field.type === "date" && !isValidIsoDate(trimmed)) {
      return `${field.label} must be a valid date`;
    }

    if (field.type.startsWith("file_") && !hasAllowedDocumentExtension(trimmed)) {
      return `${field.label} must be PDF, JPG, JPEG, or PNG`;
    }

    return null;
  };

  const validateCustomFields = (child: ChildApplicationDraft): boolean => {
    const instituteForChild =
      child.instituteId || (child.programId ? getProgramById(child.programId)?.instituteId : "");
    const fields = instituteForChild ? getAdmissionForm(instituteForChild).fields : [];
    for (const field of fields) {
      const value = (child.customAnswers?.[field.id] ?? "").trim();
      if (!field.required) continue;
      if (!value) {
        toast.error(`${field.label} is required`);
        return false;
      }
      const formatError = validateCustomFieldValue(field, value);
      if (formatError) {
        toast.error(formatError);
        return false;
      }
    }
    for (const field of fields) {
      const value = child.customAnswers?.[field.id] ?? "";
      const formatError = validateCustomFieldValue(field, value);
      if (formatError) {
        toast.error(formatError);
        return false;
      }
    }
    return true;
  };

  const validateCurrentStep = (): boolean => {
    if (!activeChild) return false;
    try {
      if (step === 0) studentStepSchema.parse(activeChild.student);
      if (step === 1) parentStepSchema.parse(draft.parent);
      if (step === 2) addressStepSchema.parse(draft.address);
      if (step === 3) academicStepSchema.parse(activeChild.academic);
      if (step === 4) {
        programStepSchema.parse({
          programId: activeChild.programId,
          grade: activeChild.grade,
          academicYear: activeChild.academicYear,
        });
        if (!validateCustomFields(activeChild)) return false;
      }
      if (step === 5) {
        for (const docType of requiredDocs) {
          const fileName = activeChild.documents?.[docType]?.fileName;
          if (!fileName) {
            toast.error(`${docLabel(docType)} is required for this admission type`);
            return false;
          }
          if (!hasAllowedDocumentExtension(fileName)) {
            toast.error(`${docLabel(docType)} must be PDF, JPG, JPEG, or PNG`);
            return false;
          }
        }
      }
      return true;
    } catch (e) {
      const msg = e instanceof z.ZodError ? e.errors[0]?.message : "Please complete all fields";
      toast.error(msg);
      return false;
    }
  };

  const validateChildForSubmit = (child: ChildApplicationDraft): string | null => {
    try {
      studentStepSchema.parse(child.student);
      academicStepSchema.parse(child.academic);
      programStepSchema.parse({
        programId: child.programId,
        grade: child.grade,
        academicYear: child.academicYear,
      });
      parentStepSchema.parse(draft.parent);
      addressStepSchema.parse(draft.address);
      if (
        !MOBILE_REGEX.test((draft.parent.mobile ?? "").trim()) ||
        (draft.parent.mobile ?? "").replace(/\D/g, "").length < 10
      ) {
        return "Parent mobile number format is invalid";
      }
      if (!POSTAL_CODE_REGEX.test((draft.address.postalCode ?? "").trim())) {
        return "Postal code format is invalid";
      }
      if (!isValidIsoDate((child.student.dateOfBirth ?? "").trim())) {
        return "Date of birth format is invalid";
      }
      if (!validateCustomFields(child)) return "Missing institute field answers";
      const required = requiredDocumentsForAdmissionType(child.admissionType);
      for (const docType of required) {
        const fileName = child.documents?.[docType]?.fileName;
        if (!fileName) {
          return `${docLabel(docType)} is required`;
        }
        if (!hasAllowedDocumentExtension(fileName)) {
          return `${docLabel(docType)} must be PDF, JPG, JPEG, or PNG`;
        }
      }
      const optionalDoc = child.documents?.additional?.fileName;
      if (optionalDoc && !hasAllowedDocumentExtension(optionalDoc)) {
        return "Additional document must be PDF, JPG, JPEG, or PNG";
      }
      return null;
    } catch (e) {
      if (e instanceof z.ZodError) return e.errors[0]?.message ?? "Missing required details";
      return "Missing required details";
    }
  };

  const submitAllChildren = () => {
    if (!user) return;
    if (children.length === 0) {
      toast.error("Add at least one child");
      return;
    }

    const createdIds: string[] = [];
    for (const child of children) {
      const issue = validateChildForSubmit(child);
      if (issue) {
        toast.error(`${child.student.name || "Child"}: ${issue}`);
        return;
      }
      const program = child.programId ? getProgramById(child.programId) : undefined;
      const resolvedInstituteId = child.instituteId ?? program?.instituteId ?? "ins-lumenx-academy";
      const studentName = child.student.name ?? "";
      const dateOfBirth = child.student.dateOfBirth ?? "";

      if (
        hasDuplicateActiveApplicationForInstitute(
          user.id,
          resolvedInstituteId,
          studentName,
          dateOfBirth,
        )
      ) {
        toast.error("You already have an active application for this institute.");
        return;
      }

      try {
        const docs = Object.entries(child.documents ?? {}).map(([type, value]) => ({
          id: `doc-${type}-${Date.now()}`,
          type: type as DocumentType,
          label: docLabel(type as DocumentType),
          fileName: value?.fileName,
          status: "uploaded" as const,
          uploadedAt: new Date().toISOString().slice(0, 10),
          previewDataUrl: value?.dataUrl,
        }));
        const app = submitApplication(user.id, {
          instituteId: resolvedInstituteId,
          admissionType: child.admissionType,
          programId: child.programId!,
          programName: program?.name ?? "",
          grade: child.grade!,
          academicYear: child.academicYear ?? "2026–27",
          student: studentStepSchema.parse(child.student),
          parent: parentStepSchema.parse(draft.parent),
          address: addressStepSchema.parse(draft.address),
          academic: academicStepSchema.parse(child.academic),
          documents: docs,
          customAnswers: child.customAnswers,
        });
        createdIds.push(app.id);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "DUPLICATE_ACTIVE_INSTITUTE_APPLICATION"
        ) {
          toast.error("You already have an active application for this institute.");
          return;
        }
        toast.error("Could not submit applications. Please try again.");
        return;
      }
    }
    setSubmittedIds(createdIds);
    setStep(7);
    toast.success(
      createdIds.length === 1
        ? "Application submitted!"
        : `${createdIds.length} applications submitted!`,
    );
  };

  const next = () => {
    if (step === 6) {
      submitAllChildren();
      return;
    }
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(6, s + 1));
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  if (step === 7 && submittedIds.length > 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center animate-in fade-in">
        <CheckCircle2 className="mx-auto size-16 text-success" />
        <h1 className="mt-4 font-display text-2xl font-bold">Application submitted!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {submittedIds.length} application{submittedIds.length > 1 ? "s" : ""} created
        </p>
        <div className="mt-3 rounded-xl border border-border bg-card p-3 text-left">
          {submittedIds.map((id) => (
            <p key={id} className="font-mono text-sm text-primary">
              {id}
            </p>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2">
          <Button asChild>
            <Link to="/admissions/applications">View my applications</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admissions/apply">Apply for another child</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title="Apply for admission"
        subtitle={`Step ${step + 1} of 7 · ${APPLY_STEPS[step]}`}
        backTo="/admissions/programs"
      />

      {activeInstitute && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          Applying to <strong>{activeInstitute.name}</strong> · {activeInstitute.city},{" "}
          {activeInstitute.state}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Children</p>
          <Button size="sm" variant="outline" onClick={addChild}>
            <Plus className="size-4 mr-1" /> Add child
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Parent information is shared. Student information is entered separately for each child.
        </p>
        <div className="flex flex-wrap gap-2">
          {children.map((child, idx) => (
            <button
              key={child.id}
              type="button"
              onClick={() => updateDraft({ activeChildId: child.id })}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                child.id === activeChild?.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              <UserRound className="size-3.5" />
              {child.student.name?.trim() ? child.student.name : `Child ${idx + 1}`}
            </button>
          ))}
        </div>
        {children.length > 1 && activeChild ? (
          <div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeChild(activeChild.id)}
              className="text-destructive hover:text-destructive"
            >
              Remove selected child
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-6 flex gap-1">
        {APPLY_STEPS.slice(0, 7).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {!activeChild ? null : (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          {step === 0 && (
            <>
              <Field label="Admission type">
                <Select
                  value={activeChild.admissionType}
                  onValueChange={(v) =>
                    updateActiveChild({ admissionType: v as AdmissionType, documents: {} })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMISSION_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Student name">
                <Input
                  value={activeChild.student.name ?? ""}
                  onChange={(e) =>
                    updateActiveChild({ student: { ...activeChild.student, name: e.target.value } })
                  }
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={activeChild.student.gender ?? ""}
                  onValueChange={(v) =>
                    updateActiveChild({ student: { ...activeChild.student, gender: v } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Male", "Female", "Other"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth">
                <ConnectDatePicker
                  label="Date of birth"
                  hideLabel
                  value={activeChild.student.dateOfBirth ?? ""}
                  max={toLocalIsoDate(new Date())}
                  onChange={(iso) =>
                    updateActiveChild({
                      student: { ...activeChild.student, dateOfBirth: iso },
                    })
                  }
                />
              </Field>
              <Field label="Nationality">
                <Input
                  value={activeChild.student.nationality ?? "Indian"}
                  onChange={(e) =>
                    updateActiveChild({
                      student: { ...activeChild.student, nationality: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Blood group">
                <Select
                  value={activeChild.student.bloodGroup ?? ""}
                  onValueChange={(v) =>
                    updateActiveChild({ student: { ...activeChild.student, bloodGroup: v } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Father's name">
                <Input
                  value={draft.parent.fatherName ?? ""}
                  onChange={(e) =>
                    updateDraft({ parent: { ...draft.parent, fatherName: e.target.value } })
                  }
                />
              </Field>
              <Field label="Mother's name">
                <Input
                  value={draft.parent.motherName ?? ""}
                  onChange={(e) =>
                    updateDraft({ parent: { ...draft.parent, motherName: e.target.value } })
                  }
                />
              </Field>
              <Field label="Guardian name">
                <Input
                  value={draft.parent.guardianName ?? ""}
                  onChange={(e) =>
                    updateDraft({ parent: { ...draft.parent, guardianName: e.target.value } })
                  }
                />
              </Field>
              <Field label="Mobile">
                <Input
                  value={draft.parent.mobile ?? user?.phone ?? ""}
                  onChange={(e) =>
                    updateDraft({ parent: { ...draft.parent, mobile: e.target.value } })
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={draft.parent.email ?? user?.email ?? ""}
                  onChange={(e) =>
                    updateDraft({ parent: { ...draft.parent, email: e.target.value } })
                  }
                />
              </Field>
              <Field label="Occupation">
                <Input
                  value={draft.parent.occupation ?? ""}
                  onChange={(e) =>
                    updateDraft({ parent: { ...draft.parent, occupation: e.target.value } })
                  }
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Address">
                <Input
                  value={draft.address.address ?? ""}
                  onChange={(e) => updateDraft({ address: { ...draft.address, address: e.target.value } })}
                />
              </Field>
              <Field label="City">
                <Input
                  value={draft.address.city ?? ""}
                  onChange={(e) => updateDraft({ address: { ...draft.address, city: e.target.value } })}
                />
              </Field>
              <Field label="State">
                <Input
                  value={draft.address.state ?? ""}
                  onChange={(e) => updateDraft({ address: { ...draft.address, state: e.target.value } })}
                />
              </Field>
              <Field label="Country">
                <Input
                  value={draft.address.country ?? "India"}
                  onChange={(e) => updateDraft({ address: { ...draft.address, country: e.target.value } })}
                />
              </Field>
              <Field label="Postal code">
                <Input
                  value={draft.address.postalCode ?? ""}
                  onChange={(e) =>
                    updateDraft({ address: { ...draft.address, postalCode: e.target.value } })
                  }
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Current school">
                <Input
                  value={activeChild.academic.currentSchool ?? ""}
                  onChange={(e) =>
                    updateActiveChild({
                      academic: { ...activeChild.academic, currentSchool: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Current grade">
                <Input
                  value={activeChild.academic.currentGrade ?? ""}
                  onChange={(e) =>
                    updateActiveChild({
                      academic: { ...activeChild.academic, currentGrade: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Previous results">
                <Input
                  value={activeChild.academic.previousResults ?? ""}
                  onChange={(e) =>
                    updateActiveChild({
                      academic: { ...activeChild.academic, previousResults: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Academic performance">
                <Input
                  value={activeChild.academic.performance ?? ""}
                  onChange={(e) =>
                    updateActiveChild({
                      academic: { ...activeChild.academic, performance: e.target.value },
                    })
                  }
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Program">
                <Select
                  value={activeChild.programId ?? ""}
                  onValueChange={(v) => {
                    const prog = getProgramById(v);
                    updateActiveChild({
                      programId: v,
                      grade: "",
                      instituteId: prog?.instituteId ?? activeChild.instituteId,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => {
                      const inst = getInstituteById(p.instituteId);
                      const seatLabel =
                        p.seatsAvailable > 0
                          ? `${p.seatsAvailable} seats`
                          : "Seats Full · Waitlist Available";
                      const label = instituteId
                        ? `${p.name} · ${seatLabel}`
                        : `${inst?.name ?? "Institute"} — ${p.name} · ${seatLabel}`;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Class / Grade">
                <Select
                  value={activeChild.grade ?? ""}
                  onValueChange={(v) => updateActiveChild({ grade: v })}
                  disabled={!selectedProgram}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedProgram?.grades ?? []).map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Academic year">
                <Input
                  value={activeChild.academicYear ?? "2026–27"}
                  onChange={(e) => updateActiveChild({ academicYear: e.target.value })}
                />
              </Field>

              {customFields.length > 0 ? (
                <div className="pt-4 mt-2 border-t border-border space-y-4">
                  <div>
                    <p className="text-sm font-medium">Institute questions</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Extra fields set by this school’s application form
                    </p>
                  </div>
                  {customFields.map((field) => (
                    <CustomFormField
                      key={field.id}
                      field={field}
                      value={activeChild.customAnswers?.[field.id] ?? ""}
                      onChange={(v) => setCustomAnswer(field.id, v)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Required documents</p>
              {requiredDocs.map((type) => (
                <DocumentUploadCard
                  key={type}
                  label={`${docLabel(type)} *`}
                  fileName={activeChild.documents[type]?.fileName}
                  dataUrl={activeChild.documents[type]?.dataUrl}
                  status={activeChild.documents[type] ? "uploaded" : undefined}
                  onChange={(v) => setDoc(type, v)}
                />
              ))}
              <p className="pt-2 text-sm font-medium">Optional</p>
              <DocumentUploadCard
                label={docLabel("additional")}
                fileName={activeChild.documents.additional?.fileName}
                dataUrl={activeChild.documents.additional?.dataUrl}
                status={activeChild.documents.additional ? "uploaded" : undefined}
                onChange={(v) => setDoc("additional", v)}
              />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3 text-sm">
              <p className="text-sm font-medium">Complete application review</p>
              <ReviewRow
                label="Children"
                value={`${children.length} child application(s)`}
                onEdit={() => updateDraft({ activeChildId: children[0]?.id })}
              />
              <ReviewRow
                label="Parent mobile"
                value={draft.parent.mobile}
                onEdit={() => setStep(1)}
              />
              <ReviewRow
                label="Parent email"
                value={draft.parent.email}
                onEdit={() => setStep(1)}
              />
              <ReviewRow
                label="Address"
                value={`${draft.address.address ?? "—"}, ${draft.address.city ?? "—"}`}
                onEdit={() => setStep(2)}
              />
              {children.map((child, index) => {
                const p = child.programId ? getProgramById(child.programId) : undefined;
                const required = requiredDocumentsForAdmissionType(child.admissionType);
                const uploadedRequired = required.filter((d) => child.documents[d]?.fileName).length;
                return (
                  <div key={child.id} className="rounded-xl border border-border p-3">
                    <p className="font-medium">{child.student.name || `Child ${index + 1}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ADMISSION_TYPES.find((t) => t.value === child.admissionType)?.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p?.name || "Program not selected"} · {child.grade || "Grade not selected"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DOB: {child.student.dateOfBirth || "—"} · Gender: {child.student.gender || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current school: {child.academic.currentSchool || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Required docs: {uploadedRequired}/{required.length}
                    </p>
                    {Object.keys(child.customAnswers ?? {}).length > 0 ? (
                      <div className="mt-2 rounded-lg border border-border/70 bg-muted/20 p-2">
                        <p className="text-xs font-medium">Institute answers</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {Object.entries(child.customAnswers ?? {}).map(([key, value]) => (
                            <li key={key}>
                              {key}: {value || "—"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div className="rounded-xl border border-border p-3">
                <p className="font-medium">Documents</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Documents are listed at the bottom with preview support.
                </p>
                <div className="mt-3 space-y-2">
                  {children.map((child, childIndex) => {
                    const docs = Object.entries(child.documents ?? {}).filter(
                      ([, value]) => Boolean(value?.fileName),
                    );
                    return (
                      <div key={child.id} className="rounded-lg border border-border/70 p-2">
                        <p className="text-xs font-medium mb-1">
                          {child.student.name || `Child ${childIndex + 1}`}
                        </p>
                        {docs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No documents uploaded.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {docs.map(([docType, value]) => (
                              <div
                                key={`${child.id}-${docType}`}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="truncate">
                                  {docLabel(docType as DocumentType)}: {value?.fileName}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (!value?.dataUrl) {
                                      toast.error("Preview unavailable. Please re-upload this file.");
                                      return;
                                    }
                                    window.open(value.dataUrl, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  Preview
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                By submitting, you confirm all information is accurate.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {step > 0 && step < 7 && (
          <Button variant="outline" onClick={back}>
            <ChevronLeft className="size-4" /> Back
          </Button>
        )}
        <Button className="flex-1" onClick={next} disabled={!activeChild}>
          {step === 6 ? "Submit application(s)" : "Continue"}{" "}
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CustomFormField({
  field,
  value,
  onChange,
}: {
  field: AdmissionFormField;
  value: string;
  onChange: (value: string) => void;
}) {
  const labelNode = (
    <Label className="text-xs text-muted-foreground">
      {field.label}
      {field.required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helpText ? (
          <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.helpText ? (
          <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type.startsWith("file_")) {
    const mimeGuess = value.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg";
    const uploadValue: SimpleUploadValue | null = value
      ? { fileName: value, mimeType: mimeGuess, size: 0, dataUrl: "" }
      : null;
    return (
      <div className="space-y-1.5">
        {labelNode}
        <SimpleFileUpload
          kind="document"
          value={uploadValue}
          onChange={(next) => onChange(next?.fileName ?? "")}
        />
        {field.helpText ? (
          <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : "text";

  return (
    <div className="space-y-1.5">
      {labelNode}
      <Input
        type={inputType}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.helpText ? (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      ) : null}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "—"}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}
