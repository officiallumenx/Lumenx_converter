import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import { Briefcase, Building2, FolderOpen, Plus, Sparkles, Users } from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { SectionCard } from "@/components/app/SectionCard";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { useCareersApplications } from "@/hooks/use-careers-applications";
import { useCareersJobs } from "@/hooks/use-careers-jobs";
import { useCareersTalent } from "@/hooks/use-careers-talent";
import { statusLabel, statusTone } from "@/lib/careers/status-utils";

export function RecruiterWorkspacePage() {
  const { user } = useCareersAuth();
  const { jobs, loading: jobsLoading } = useCareersJobs({
    recruiterScope: true,
    openOnly: false,
  });
  const { applications: apps, loading: appsLoading } = useCareersApplications({
    scope: "recruiter",
  });
  const { talent } = useCareersTalent();

  if (!user || user.accountType !== "recruiter" || !user.organizationId) return null;

  const openJobs = jobs.filter((j) => j.recruiterJobStatus === "open");
  const inInterview = apps.filter(
    (a) => a.status === "interview_scheduled" || a.status === "interview_completed",
  ).length;
  const offers = apps.filter(
    (a) => a.status === "offer_sent" || a.status === "offer_accepted",
  ).length;

  if (jobsLoading || appsLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading workspace…</div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <CareersPageHeader
        title="Recruiter workspace"
        subtitle={`Hiring hub for ${user.organizationName ?? "your organization"}`}
      />

      <div className="rounded-2xl border border-border p-4 flex flex-wrap items-center gap-3">
        <Building2 className="size-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{user.organizationName ?? "Organization"}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {user.organizationType?.replace(/_/g, " ") ?? "Business"} · Recruiter account
          </p>
        </div>
        <Badge variant="secondary">Recruiter</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open listings" value={String(openJobs.length)} icon={Briefcase} />
        <StatCard label="Applicants" value={String(apps.length)} icon={Users} />
        <StatCard
          label="In interview"
          value={String(inInterview)}
          icon={FolderOpen}
          tone={inInterview > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Offers"
          value={String(offers)}
          icon={Sparkles}
          tone={offers > 0 ? "success" : "default"}
        />
      </div>

      <SectionCard title="Quick actions">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/recruiter/jobs/new">
              <Plus className="size-4 mr-2" /> Post a job
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/recruiter/applicants">Review applications</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/recruiter/talent">Discover talent ({talent.length})</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/jobs">Browse market</Link>
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Recent applicants" link="/recruiter/applicants" linkLabel="View all">
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="space-y-2">
            {apps.slice(0, 5).map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{app.personal.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {app.jobTitle} · {app.id}
                  </p>
                </div>
                <Badge variant={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
