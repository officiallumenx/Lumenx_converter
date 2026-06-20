import { Link } from "@tanstack/react-router";
import { Badge, Button } from "@lumenx/ui";
import { MapPin, Calendar, Share2, IndianRupee, Building2, Briefcase } from "lucide-react";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { SaveJobButton } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { toast } from "sonner";
import { JOB_CATEGORY_LABEL } from "@/lib/careers/jobs-data";
import { getJobById } from "@/lib/careers/repositories";

export function JobDetailPage({ jobId }: { jobId: string }) {
  const { user } = useCareersAuth();
  const job = getJobById(jobId);

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job not found.</p>
        <Button className="mt-4" asChild><Link to="/careers/jobs">Browse jobs</Link></Button>
      </div>
    );
  }

  const shareJob = async () => {
    const url = window.location.href;
    const text = `${job.title} at ${job.instituteName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text, url });
      } catch {
        void navigator.clipboard?.writeText(url);
        toast.success("Link copied");
      }
    } else {
      void navigator.clipboard?.writeText(url);
      toast.success("Link copied");
    }
  };

  const applyTo = user
    ? { to: "/careers/apply" as const, search: { job: job.id } }
    : { to: "/careers/login" as const, search: { redirect: "/careers/apply", job: job.id } };

  return (
    <div className="animate-in fade-in duration-300">
      <CareersPageHeader title={job.title} subtitle={`${job.instituteName} · ${job.department}`} backTo="/careers/jobs" />

      <div className={`mb-6 h-3 rounded-full bg-gradient-to-r ${job.imageGradient}`} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="secondary">{JOB_CATEGORY_LABEL[job.category]}</Badge>
        <Badge variant="outline" className="capitalize">{job.employmentType.replace(/_/g, " ")}</Badge>
        <Badge variant="outline" className="capitalize">{job.workMode}</Badge>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <Briefcase className="size-5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Experience required</p>
          <p className="text-sm font-semibold">{job.experienceRequired}</p>
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <IndianRupee className="size-4" /> {job.salaryDisplay}
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Building2 className="size-4" />
        {job.instituteName}
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <MapPin className="size-4" /> {job.location} ({job.city}, {job.state})
      </p>

      <p className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Calendar className="size-4" /> Apply by {new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <Button size="lg" asChild><Link to={applyTo.to} search={applyTo.search}>Apply now</Link></Button>
        <SaveJobButton jobId={job.id} />
        <Button variant="outline" size="lg" onClick={shareJob}><Share2 className="size-4 mr-2" /> Share</Button>
      </div>

      <section className="space-y-6">
        <div>
          <h2 className="font-display text-lg font-bold">Overview</h2>
          <p className="mt-2 text-sm text-muted-foreground">{job.overview}</p>
        </div>
        {job.description && (
          <div>
            <h2 className="font-display text-lg font-bold">Job description</h2>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
          </div>
        )}
        <div>
          <h2 className="font-display text-lg font-bold">Responsibilities</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {job.responsibilities.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Qualifications</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {job.qualifications.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Skills</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {job.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Benefits</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {job.benefits.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
