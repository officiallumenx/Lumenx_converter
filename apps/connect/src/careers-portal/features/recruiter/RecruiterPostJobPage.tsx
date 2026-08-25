import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
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
import { toast } from "sonner";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { JOB_CATEGORY_LABEL, JOB_EXPERIENCE_OPTIONS, LOCATIONS } from "@/lib/careers/jobs-data";
import {
  createRecruiterJob,
  getRecruiterJobById,
  updateRecruiterJob,
  type RecruiterJobInput,
} from "@/lib/careers/recruiter-jobs-store";
import type {
  EmploymentType,
  JobCategory,
  RecruiterJobStatus,
  WorkMode,
} from "@/lib/careers/types";

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display text-sm font-bold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function RecruiterPostJobPage({ editJobId }: { editJobId?: string }) {
  const isEdit = !!editJobId;
  const { user } = useCareersAuth();
  const nav = useNavigate();
  const [ready, setReady] = useState(!isEdit);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState<JobCategory>("human_resources");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
  const [workMode, setWorkMode] = useState<WorkMode>("onsite");
  const [experienceRequired, setExperienceRequired] = useState<string>(
    JOB_EXPERIENCE_OPTIONS[3]!.value,
  );
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [salaryDisplay, setSalaryDisplay] = useState("");
  const [deadline, setDeadline] = useState("");
  const [overview, setOverview] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [skills, setSkills] = useState("");
  const [benefits, setBenefits] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [jobStatus, setJobStatus] = useState<RecruiterJobStatus>("open");

  useEffect(() => {
    if (!isEdit || !editJobId || !user?.organizationId) return;

    const job = getRecruiterJobById(editJobId);
    if (!job || job.instituteId !== user.organizationId || !job.postedByRecruiterId) {
      toast.error("Job not found or you cannot edit this listing");
      nav({ to: "/careers/recruiter/jobs" });
      return;
    }

    const defaultLocation = `${job.city}, ${job.state}`;
    setTitle(job.title);
    setDepartment(job.department);
    setCategory(job.category);
    setEmploymentType(job.employmentType);
    setWorkMode(job.workMode);
    setExperienceRequired(job.experienceRequired);
    setCity(job.city);
    setState(job.state);
    setLocationDetail(job.location !== defaultLocation ? job.location : "");
    setSalaryDisplay(
      !job.salaryDisplay || job.salaryDisplay === "Competitive" ? "" : job.salaryDisplay,
    );
    setDeadline(job.deadline);
    setOverview(job.overview);
    setDescription(job.description ?? "");
    setResponsibilities(listToLines(job.responsibilities));
    setQualifications(listToLines(job.qualifications));
    setSkills(job.skills.join(", "));
    setBenefits(listToLines(job.benefits));
    setJobStatus(job.recruiterJobStatus ?? "draft");
    setReady(true);
  }, [isEdit, editJobId, user?.organizationId, nav]);

  if (!user?.organizationId) return null;
  const organizationId = user.organizationId;
  if (isEdit && !ready) return null;

  const selectedExperience = JOB_EXPERIENCE_OPTIONS.find((o) => o.value === experienceRequired);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title.trim() ||
      !overview.trim() ||
      !description.trim() ||
      !city.trim() ||
      !state.trim() ||
      !deadline
    ) {
      toast.error("Fill in title, overview, full description, location, and deadline");
      return;
    }
    if (linesToList(responsibilities).length === 0) {
      toast.error("Add at least one responsibility");
      return;
    }
    if (linesToList(qualifications).length === 0) {
      toast.error("Add at least one qualification");
      return;
    }
    if (linesToList(benefits).length === 0) {
      toast.error("Add at least one benefit");
      return;
    }

    const input: RecruiterJobInput = {
      title,
      department: department || "General",
      category,
      employmentType,
      workMode,
      experienceRequired,
      city,
      state,
      overview,
      description,
      responsibilities: linesToList(responsibilities),
      qualifications: linesToList(qualifications),
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      benefits: linesToList(benefits),
      deadline,
      salaryDisplay: salaryDisplay || undefined,
      location: locationDetail || undefined,
      jobStatus: isEdit ? jobStatus : publishNow ? "open" : "draft",
    };

    if (isEdit && editJobId) {
      const updated = updateRecruiterJob(editJobId, organizationId, input);
      if (!updated) {
        toast.error("Could not save changes");
        return;
      }
      toast.success("Job updated");
      return;
    }

    const created = createRecruiterJob(
      user.id,
      organizationId,
      user.organizationName ?? "Organization",
      input,
    );
    toast.success(
      publishNow
        ? "Job published — you can keep editing below"
        : "Job saved as draft — you can keep editing below",
    );
    nav({ to: "/careers/recruiter/jobs/$jobId/edit", params: { jobId: created.id } });
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-2xl">
      <CareersPageHeader
        title={isEdit ? "Edit job" : "Post a job"}
        subtitle={
          isEdit
            ? `Update listing for ${user.organizationName ?? "your company"}`
            : `Listing for ${user.organizationName ?? "your company"} — appears on the public job board when published`
        }
        backTo="/careers/recruiter/jobs"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection
          title="Role basics"
          hint="Title, department, and how candidates will find this role"
        >
          <div className="space-y-2">
            <Label>Job title *</Label>
            <Input
              placeholder="e.g. Senior Product Manager"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="Engineering, HR, Sales…"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role type</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as JobCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(JOB_CATEGORY_LABEL) as [JobCategory, string][]).map(
                    ([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Employment type</Label>
              <Select
                value={employmentType}
                onValueChange={(v) => setEmploymentType(v as EmploymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work mode</Label>
              <Select value={workMode} onValueChange={(v) => setWorkMode(v as WorkMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Experience & compensation"
          hint="Shown prominently on the job listing — be specific"
        >
          <div className="space-y-2">
            <Label>Experience required *</Label>
            <Select value={experienceRequired} onValueChange={setExperienceRequired}>
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {JOB_EXPERIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedExperience && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                Candidates will see:{" "}
                <strong className="text-foreground">{selectedExperience.value}</strong> experience
                required
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Salary / CTC (display text)</Label>
              <Input
                placeholder="₹8–12 LPA · ₹50k/month"
                value={salaryDisplay}
                onChange={(e) => setSalaryDisplay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Apply by *</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Location" hint="Where the role is based">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input list="cities" value={city} onChange={(e) => setCity(e.target.value)} />
              <datalist id="cities">
                {LOCATIONS.cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Office / campus address (optional)</Label>
            <Input
              placeholder="e.g. Green Park Campus, Block B"
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection
          title="Overview"
          hint="Short summary (2–3 sentences) — shown on job cards and search results"
        >
          <div className="space-y-2">
            <Label>Role overview *</Label>
            <Textarea
              rows={3}
              placeholder="Brief pitch: what the role is and why someone should apply…"
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              {overview.length}/280 characters recommended
            </p>
          </div>
        </FormSection>

        <FormSection
          title="Full job description"
          hint="Detailed description — shown on the job detail page"
        >
          <div className="space-y-2">
            <Label>Job description *</Label>
            <Textarea
              rows={6}
              placeholder="Describe the role in detail: team context, day-to-day work, growth opportunities, reporting structure…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title="Responsibilities & qualifications">
          <div className="space-y-2">
            <Label>Key responsibilities *</Label>
            <Textarea
              rows={5}
              placeholder={
                "One responsibility per line, e.g.\nPlan and deliver product roadmap\nMentor junior team members\nStakeholder reporting"
              }
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Required qualifications *</Label>
            <Textarea
              rows={4}
              placeholder={
                "One qualification per line, e.g.\nBachelor's in relevant field\n3+ years in similar role\nStrong communication skills"
              }
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Skills (comma-separated)</Label>
            <Input
              placeholder="React, Project management, Excel…"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection
          title="Benefits & perks"
          hint="What candidates get — health, leave, bonuses, learning, etc."
        >
          <div className="space-y-2">
            <Label>Benefits *</Label>
            <Textarea
              rows={4}
              placeholder={
                "One benefit per line, e.g.\nHealth insurance for family\nAnnual performance bonus\nFlexible work hours\nLearning & certification budget"
              }
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
            />
          </div>
        </FormSection>

        {isEdit ? (
          <FormSection
            title="Listing status"
            hint="Control whether this job appears on the public board"
          >
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={jobStatus}
                onValueChange={(v) => setJobStatus(v as RecruiterJobStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft — not visible on job board</SelectItem>
                  <SelectItem value="open">Open — live on job board</SelectItem>
                  <SelectItem value="closed">Closed — hidden from new applicants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSection>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <input
              id="publishNow"
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="publishNow" className="font-normal cursor-pointer">
              Publish immediately on job board
            </Label>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit">
            {isEdit ? "Save changes" : publishNow ? "Publish job" : "Save draft"}
          </Button>
          {isEdit && (
            <Button type="button" variant="outline" asChild>
              <Link to="/careers/jobs/$jobId" params={{ jobId: editJobId! }}>
                Preview listing
              </Link>
            </Button>
          )}
          <Button type="button" variant="outline" asChild>
            <Link to="/careers/recruiter/jobs">{isEdit ? "Back to my jobs" : "Cancel"}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
