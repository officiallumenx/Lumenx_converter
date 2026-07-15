import { useEffect, useMemo, useState } from "react";

import { Link } from "@tanstack/react-router";

import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@lumenx/ui";

import { Briefcase, CheckCircle2, FileText, MapPin, User } from "lucide-react";

import { toast } from "sonner";

import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";

import { DocumentUploadCard } from "@/careers-portal/shared/ui/CareersShellWidgets";

import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";

import {
  buildApplicationDraftFromProfile,
  getMissingQuickApplyFields,
  jobHasApplicationExtras,
  validateApplicationExtras,
  type QuickApplyField,
} from "@/lib/careers/apply-utils";

import type { ApplicationDraft, CareerDocumentType } from "@/lib/careers/types";

import { clearDraft, getJobById, getJobs, submitApplication } from "@/lib/careers/repositories";

import { getCandidateProfile } from "@/lib/careers/profile-repository";

const GAP_LABELS: Record<QuickApplyField, string> = {
  resume: "Resume / CV",

  city: "City",

  state: "State",

  email: "Email",

  mobile: "Mobile number",
};

export function ApplyWizardPage({ jobId }: { jobId?: string }) {
  const { user } = useCareersAuth();

  const [draft, setDraft] = useState<ApplicationDraft | null>(null);

  const [pickedJobId, setPickedJobId] = useState(jobId ?? "");

  const [extras, setExtras] = useState<Record<string, string>>({});

  const [coverLetter, setCoverLetter] = useState("");

  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const jobs = getJobs();

  const activeJobId = jobId ?? pickedJobId;

  const selectedJob = useMemo(
    () => (activeJobId ? getJobById(activeJobId) : undefined),
    [activeJobId],
  );

  const profile = user ? getCandidateProfile(user.id) : null;

  useEffect(() => {
    if (!user || !profile) return;

    clearDraft(user.id);

    const built = buildApplicationDraftFromProfile(
      jobId,
      profile,
      user.name,
      user.email,
      user.phone,
    );

    setDraft({ ...built, jobId: jobId ?? built.jobId });

    if (jobId) setPickedJobId(jobId);
  }, [user, jobId, profile?.updatedAt]);

  const missing =
    profile && user && draft
      ? getMissingQuickApplyFields(profile, user.email, user.phone, draft)
      : [];

  const needsExtras = selectedJob ? jobHasApplicationExtras(selectedJob) : false;

  const update = (patch: Partial<ApplicationDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const handleSubmit = () => {
    if (!user || !draft || !selectedJob || !activeJobId) return;

    if (missing.length > 0) {
      toast.error("Complete the required fields below before submitting");

      return;
    }

    const extraError = validateApplicationExtras(selectedJob, extras, coverLetter, draft);

    if (extraError) {
      toast.error(extraError);

      return;
    }

    const docTypes: CareerDocumentType[] = [
      "resume",
      "certificates",
      "experience_letters",
      "identity_proof",
      "profile_photo",
      "demo_teaching_video",
      "additional",
    ];

    const docs = docTypes

      .filter((type) => draft.documents?.[type])

      .map((type) => ({
        id: `doc-${type}`,

        type,

        label: type.replace(/_/g, " "),

        fileName: draft.documents![type]!.fileName,

        status: "uploaded" as const,

        uploadedAt: new Date().toISOString().slice(0, 10),
      }));

    const salary = extras.expectedSalary?.trim() || draft.professional?.expectedSalary || "—";

    const app = submitApplication(user.id, {
      jobId: activeJobId,

      jobTitle: selectedJob.title,

      instituteName: selectedJob.instituteName,

      instituteId: selectedJob.instituteId,

      personal: {
        name: draft.personal?.name ?? user.name,

        email: draft.personal?.email ?? user.email ?? "",

        mobile: draft.personal?.mobile ?? user.phone ?? "",

        gender: "Prefer not to say",

        dateOfBirth: "—",
      },

      address: {
        address: draft.address?.address ?? profile?.address ?? "—",

        city: draft.address?.city ?? profile?.city ?? "—",

        state: draft.address?.state ?? profile?.state ?? "—",

        country: draft.address?.country ?? "India",

        postalCode: draft.address?.postalCode ?? profile?.postalCode ?? "—",
      },

      professional: {
        highestQualification: draft.professional?.highestQualification ?? "—",

        experienceYears: draft.professional?.experienceYears ?? "0",

        currentEmployer: draft.professional?.currentEmployer ?? "—",

        currentRole: draft.professional?.currentRole ?? profile?.headline ?? "—",

        expectedSalary: salary,

        noticePeriod: draft.professional?.noticePeriod ?? "Immediate",
      },

      skills: {
        teachingSubjects: draft.skills?.teachingSubjects ?? "",

        sportsSpecialization: draft.skills?.sportsSpecialization ?? "",

        labSpecialization: draft.skills?.labSpecialization ?? "",

        technicalSkills: draft.skills?.technicalSkills ?? profile?.skills.join(", ") ?? "General",

        languagesKnown: draft.skills?.languagesKnown ?? "English",

        grades: draft.skills?.grades ?? "",

        boards: draft.skills?.boards ?? "",
      },

      documents: docs,
    });

    setSubmittedId(app.id);

    toast.success("Application submitted!");
  };

  if (submittedId) {
    return (
      <div className="mx-auto max-w-lg text-center animate-in fade-in py-8">
        <CheckCircle2 className="mx-auto size-16 text-success" />

        <h1 className="mt-4 font-display text-2xl font-bold">Application submitted</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Your application for {selectedJob?.title} at {selectedJob?.instituteName} has been
          received.
        </p>

        <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 font-mono text-sm">
          Application ID: {submittedId}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/careers/applications/$applicationId" params={{ applicationId: submittedId }}>
              Track application
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link to="/careers/jobs">Browse more jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !draft || !profile) return null;

  return (
    <div className="animate-in fade-in duration-300 max-w-2xl">
      <CareersPageHeader
        title={selectedJob ? `Apply to ${selectedJob.title}` : "Apply for a job"}
        subtitle={
          selectedJob
            ? "Review your profile and submit — no need to re-enter role details"
            : "Pick a role, then apply using your saved profile"
        }
        backTo={selectedJob ? `/careers/jobs/${selectedJob.id}` : "/careers/jobs"}
      />

      {!jobId && (
        <div className="mb-6 space-y-2">
          <Label>Select job</Label>

          <Select
            value={pickedJobId}
            onValueChange={(v) => {
              setPickedJobId(v);

              update({ jobId: v });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a position" />
            </SelectTrigger>

            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title} — {j.instituteName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedJob && (
        <div className="mb-6 rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="font-semibold">{selectedJob.title}</p>

              <p className="text-sm text-muted-foreground">
                {selectedJob.instituteName} · {selectedJob.department}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{selectedJob.experienceRequired}</Badge>

                <Badge variant="outline" className="capitalize">
                  {selectedJob.workMode}
                </Badge>

                <Badge variant="outline" className="capitalize">
                  {selectedJob.employmentType.replace(/_/g, " ")}
                </Badge>
              </div>

              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {selectedJob.city}, {selectedJob.state}
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedJob && missing.length === 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <User className="size-4 text-primary" /> Applying as
          </p>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Name:</span> {user.name}
            </p>

            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>

            <p>
              <span className="text-muted-foreground">Mobile:</span> {user.phone}
            </p>

            <p>
              <span className="text-muted-foreground">Location:</span> {profile.city},{" "}
              {profile.state}
            </p>

            <p className="sm:col-span-2 flex items-center gap-1">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Resume:</span>{" "}
              {profile.resumeFileName ?? "On profile"}
            </p>

            {profile.headline && (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Headline:</span> {profile.headline}
              </p>
            )}
          </div>

          <Button variant="link" className="h-auto p-0 text-xs" asChild>
            <Link to="/careers/profile">Update profile before applying</Link>
          </Button>
        </div>
      )}

      {selectedJob && missing.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
          <p className="text-sm font-medium">A few details are needed before you can apply</p>

          {missing.includes("email") && (
            <div className="space-y-2">
              <Label>{GAP_LABELS.email}</Label>

              <Input
                type="email"
                value={draft.personal?.email ?? ""}
                onChange={(e) => update({ personal: { ...draft.personal, email: e.target.value } })}
              />
            </div>
          )}

          {missing.includes("mobile") && (
            <div className="space-y-2">
              <Label>{GAP_LABELS.mobile}</Label>

              <Input
                value={draft.personal?.mobile ?? ""}
                onChange={(e) =>
                  update({ personal: { ...draft.personal, mobile: e.target.value } })
                }
              />
            </div>
          )}

          {missing.includes("city") && (
            <div className="space-y-2">
              <Label>{GAP_LABELS.city}</Label>

              <Input
                value={draft.address?.city ?? ""}
                onChange={(e) => update({ address: { ...draft.address, city: e.target.value } })}
              />
            </div>
          )}

          {missing.includes("state") && (
            <div className="space-y-2">
              <Label>{GAP_LABELS.state}</Label>

              <Input
                value={draft.address?.state ?? ""}
                onChange={(e) => update({ address: { ...draft.address, state: e.target.value } })}
              />
            </div>
          )}

          {missing.includes("resume") && (
            <DocumentUploadCard
              label={GAP_LABELS.resume}
              fileName={draft.documents?.resume?.fileName}
              onUpload={(f) =>
                update({ documents: { ...draft.documents, resume: { fileName: f.name } } })
              }
            />
          )}
        </div>
      )}

      {selectedJob && needsExtras && (
        <div className="mb-6 rounded-2xl border border-border p-4 space-y-4">
          <p className="text-sm font-medium">Additional information requested by the recruiter</p>

          {selectedJob.applicationExtras?.coverLetter && (
            <div className="space-y-2">
              <Label>Cover letter</Label>

              <Textarea
                rows={4}
                placeholder="Brief note on why you're a fit for this role…"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          )}

          {selectedJob.applicationExtras?.portfolioUrl && (
            <div className="space-y-2">
              <Label>Portfolio URL</Label>

              <Input
                type="url"
                placeholder="https://…"
                value={extras.portfolioUrl ?? ""}
                onChange={(e) => setExtras((x) => ({ ...x, portfolioUrl: e.target.value }))}
              />
            </div>
          )}

          {selectedJob.applicationExtras?.expectedSalary && (
            <div className="space-y-2">
              <Label>Expected salary (annual)</Label>

              <Input
                placeholder="e.g. ₹8 LPA"
                value={extras.expectedSalary ?? ""}
                onChange={(e) => setExtras((x) => ({ ...x, expectedSalary: e.target.value }))}
              />
            </div>
          )}

          {selectedJob.applicationExtras?.demoVideo && (
            <DocumentUploadCard
              label="Demo teaching video"
              fileName={draft.documents?.demo_teaching_video?.fileName}
              onUpload={(f) =>
                update({
                  documents: { ...draft.documents, demo_teaching_video: { fileName: f.name } },
                })
              }
            />
          )}

          {selectedJob.applicationExtras?.customQuestions?.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label>
                {q.label}
                {q.required ? " *" : ""}
              </Label>

              <Input
                value={extras[q.id] ?? ""}
                onChange={(e) => setExtras((x) => ({ ...x, [q.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={handleSubmit}
          disabled={missing.length > 0}
        >
          Submit application
        </Button>
      )}

      {!selectedJob && !jobId && (
        <p className="text-sm text-muted-foreground">Select a job above to continue.</p>
      )}
    </div>
  );
}
