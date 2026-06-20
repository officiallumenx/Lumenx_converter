import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { ApplicationStatusTimeline, DocumentUploadCard } from "@/admissions-portal/shared/ui/AdmissionsShellWidgets";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import {
  APPLY_STEPS,
  academicStepSchema,
  addressStepSchema,
  parentStepSchema,
  programStepSchema,
  studentStepSchema,
} from "@/lib/admissions/schemas";
import type { ApplicationDraft, DocumentType } from "@/lib/admissions/types";
import {
  getDraft,
  getProgramById,
  getPrograms,
  saveDraft,
  submitApplication,
} from "@/lib/admissions/repositories";
import { getInstituteById } from "@/lib/admissions/institutes-data";

const DOC_TYPES: { type: DocumentType; label: string }[] = [
  { type: "birth_certificate", label: "Birth Certificate" },
  { type: "transfer_certificate", label: "Transfer Certificate" },
  { type: "marks_memo", label: "Previous Marks Memo" },
  { type: "student_photo", label: "Student Photo" },
  { type: "parent_id", label: "Parent ID" },
  { type: "additional", label: "Additional Documents" },
];

const emptyDraft = (): ApplicationDraft => ({
  step: 0,
  student: {},
  parent: {},
  address: { country: "India" },
  academic: {},
  academicYear: "2026–27",
  documents: {},
});

export function ApplyWizardPage({ programId, instituteId }: { programId?: string; instituteId?: string }) {
  const { user } = useAdmissionsAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ApplicationDraft>(emptyDraft);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const programs = getPrograms(instituteId);
  const institute = instituteId ? getInstituteById(instituteId) : undefined;

  useEffect(() => {
    if (!user) return;
    const saved = getDraft(user.id);
    if (saved) setDraft(saved);
    else {
      setDraft((d) => ({
        ...d,
        ...(programId ? { programId } : {}),
        ...(instituteId ? { instituteId } : {}),
      }));
    }
  }, [user, programId, instituteId]);

  useEffect(() => {
    if (user && step < 7) saveDraft(user.id, { ...draft, step });
  }, [draft, step, user]);

  const selectedProgram = useMemo(
    () => (draft.programId ? getProgramById(draft.programId) : undefined),
    [draft.programId],
  );

  const update = (patch: Partial<ApplicationDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const validateStep = (): boolean => {
    try {
      if (step === 0) studentStepSchema.parse(draft.student);
      if (step === 1) parentStepSchema.parse(draft.parent);
      if (step === 2) addressStepSchema.parse(draft.address);
      if (step === 3) academicStepSchema.parse(draft.academic);
      if (step === 4) programStepSchema.parse({ programId: draft.programId, grade: draft.grade, academicYear: draft.academicYear });
      return true;
    } catch (e) {
      const msg = e instanceof z.ZodError ? e.errors[0]?.message : "Please complete all fields";
      toast.error(msg);
      return false;
    }
  };

  const next = () => {
    if (step === 6) {
      if (!user) return;
      const prog = getProgramById(draft.programId!);
      const docs = Object.entries(draft.documents).map(([type, v]) => ({
        id: `doc-${type}`,
        type: type as DocumentType,
        label: DOC_TYPES.find((d) => d.type === type)?.label ?? type,
        fileName: v?.fileName,
        status: "uploaded" as const,
        uploadedAt: new Date().toISOString().slice(0, 10),
      }));
      const app = submitApplication(user.id, {
        instituteId: draft.instituteId ?? "ins-lumenx-academy",
        programId: draft.programId!,
        programName: prog?.name ?? "",
        grade: draft.grade!,
        academicYear: draft.academicYear ?? "2026–27",
        student: studentStepSchema.parse(draft.student),
        parent: parentStepSchema.parse(draft.parent),
        address: addressStepSchema.parse(draft.address),
        academic: academicStepSchema.parse(draft.academic),
        documents: docs,
      });
      setSubmittedId(app.id);
      setStep(7);
      toast.success("Application submitted!");
      return;
    }
    if (step < 6 && !validateStep()) return;
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  if (step === 7 && submittedId) {
    return (
      <div className="mx-auto max-w-md py-12 text-center animate-in fade-in">
        <CheckCircle2 className="mx-auto size-16 text-success" />
        <h1 className="mt-4 font-display text-2xl font-bold">Application submitted!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your application ID</p>
        <p className="mt-1 font-mono text-lg font-bold text-primary">{submittedId}</p>
        <p className="mt-4 text-sm text-muted-foreground">Track status and upload documents anytime.</p>
        <div className="mt-8 flex flex-col gap-2">
          <Button asChild><Link to="/admissions/applications/$applicationId" params={{ applicationId: submittedId }}>View status</Link></Button>
          <Button variant="outline" asChild><Link to="/admissions/applications">My applications</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader title="Apply for admission" subtitle={`Step ${step + 1} of 7 · ${APPLY_STEPS[step]}`} backTo="/admissions/programs" />

      {institute && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          Applying to <strong>{institute.name}</strong> · {institute.city}, {institute.state}
        </div>
      )}

      <div className="mb-6 flex gap-1">
        {APPLY_STEPS.slice(0, 7).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        {step === 0 && (
          <>
            <Field label="Student name"><Input value={draft.student.name ?? ""} onChange={(e) => update({ student: { ...draft.student, name: e.target.value } })} /></Field>
            <Field label="Gender">
              <Select value={draft.student.gender ?? ""} onValueChange={(v) => update({ student: { ...draft.student, gender: v } })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Male", "Female", "Other"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth"><Input type="date" value={draft.student.dateOfBirth ?? ""} onChange={(e) => update({ student: { ...draft.student, dateOfBirth: e.target.value } })} /></Field>
            <Field label="Nationality"><Input value={draft.student.nationality ?? "Indian"} onChange={(e) => update({ student: { ...draft.student, nationality: e.target.value } })} /></Field>
            <Field label="Blood group">
              <Select value={draft.student.bloodGroup ?? ""} onValueChange={(v) => update({ student: { ...draft.student, bloodGroup: v } })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Photo">
              <Input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) update({ student: { ...draft.student, photoDataUrl: f.name } });
              }} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Father's name"><Input value={draft.parent.fatherName ?? ""} onChange={(e) => update({ parent: { ...draft.parent, fatherName: e.target.value } })} /></Field>
            <Field label="Mother's name"><Input value={draft.parent.motherName ?? ""} onChange={(e) => update({ parent: { ...draft.parent, motherName: e.target.value } })} /></Field>
            <Field label="Guardian name"><Input value={draft.parent.guardianName ?? ""} onChange={(e) => update({ parent: { ...draft.parent, guardianName: e.target.value } })} /></Field>
            <Field label="Mobile"><Input value={draft.parent.mobile ?? user?.phone ?? ""} onChange={(e) => update({ parent: { ...draft.parent, mobile: e.target.value } })} /></Field>
            <Field label="Email"><Input type="email" value={draft.parent.email ?? user?.email ?? ""} onChange={(e) => update({ parent: { ...draft.parent, email: e.target.value } })} /></Field>
            <Field label="Occupation"><Input value={draft.parent.occupation ?? ""} onChange={(e) => update({ parent: { ...draft.parent, occupation: e.target.value } })} /></Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Address"><Input value={draft.address.address ?? ""} onChange={(e) => update({ address: { ...draft.address, address: e.target.value } })} /></Field>
            <Field label="City"><Input value={draft.address.city ?? ""} onChange={(e) => update({ address: { ...draft.address, city: e.target.value } })} /></Field>
            <Field label="State"><Input value={draft.address.state ?? ""} onChange={(e) => update({ address: { ...draft.address, state: e.target.value } })} /></Field>
            <Field label="Country"><Input value={draft.address.country ?? "India"} onChange={(e) => update({ address: { ...draft.address, country: e.target.value } })} /></Field>
            <Field label="Postal code"><Input value={draft.address.postalCode ?? ""} onChange={(e) => update({ address: { ...draft.address, postalCode: e.target.value } })} /></Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Current school"><Input value={draft.academic.currentSchool ?? ""} onChange={(e) => update({ academic: { ...draft.academic, currentSchool: e.target.value } })} /></Field>
            <Field label="Current grade"><Input value={draft.academic.currentGrade ?? ""} onChange={(e) => update({ academic: { ...draft.academic, currentGrade: e.target.value } })} /></Field>
            <Field label="Previous results"><Input value={draft.academic.previousResults ?? ""} onChange={(e) => update({ academic: { ...draft.academic, previousResults: e.target.value } })} /></Field>
            <Field label="Academic performance"><Input value={draft.academic.performance ?? ""} onChange={(e) => update({ academic: { ...draft.academic, performance: e.target.value } })} /></Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Program">
              <Select value={draft.programId ?? ""} onValueChange={(v) => update({ programId: v, grade: "" })}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => {
                    const inst = getInstituteById(p.instituteId);
                    const label = instituteId ? p.name : `${inst?.name ?? "Institute"} — ${p.name}`;
                    return <SelectItem key={p.id} value={p.id}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class / Grade">
              <Select value={draft.grade ?? ""} onValueChange={(v) => update({ grade: v })} disabled={!selectedProgram}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {(selectedProgram?.grades ?? []).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Academic year"><Input value={draft.academicYear ?? "2026–27"} onChange={(e) => update({ academicYear: e.target.value })} /></Field>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            {DOC_TYPES.map((d) => (
              <DocumentUploadCard
                key={d.type}
                label={d.label}
                fileName={draft.documents[d.type]?.fileName}
                status={draft.documents[d.type] ? "uploaded" : undefined}
                onUpload={(f) => update({ documents: { ...draft.documents, [d.type]: { fileName: f.name } } })}
              />
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3 text-sm">
            <ReviewRow label="Student" value={draft.student.name} onEdit={() => setStep(0)} />
            <ReviewRow label="Program" value={`${selectedProgram?.name} · ${draft.grade}`} onEdit={() => setStep(4)} />
            <ReviewRow label="Parent mobile" value={draft.parent.mobile} onEdit={() => setStep(1)} />
            <ReviewRow label="City" value={draft.address.city} onEdit={() => setStep(2)} />
            <ReviewRow label="Documents" value={`${Object.keys(draft.documents).length} uploaded`} onEdit={() => setStep(5)} />
            <p className="text-xs text-muted-foreground pt-2">By submitting, you confirm all information is accurate.</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && step < 7 && (
          <Button variant="outline" onClick={back}><ChevronLeft className="size-4" /> Back</Button>
        )}
        <Button className="flex-1" onClick={next}>
          {step === 6 ? "Submit application" : "Continue"} <ChevronRight className="size-4 ml-1" />
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

function ReviewRow({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "—"}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
    </div>
  );
}
