import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import { Briefcase, Building2, FolderOpen, Plus, Sparkles, Users } from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { SectionCard } from "@/components/app/SectionCard";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { getApplicationsForOrganization } from "@/lib/careers/repositories";
import { getRecruiterJobsForOrg } from "@/lib/careers/recruiter-jobs-store";
import { discoverTalentForOrg } from "@/lib/careers/recruiter-talent";
import { statusLabel, statusTone } from "@/lib/careers/status-utils";

export function RecruiterWorkspacePage() {
  const { user } = useCareersAuth();
  if (!user || user.accountType !== "recruiter" || !user.organizationId) return null;

  const orgId = user.organizationId;
  const jobs = getRecruiterJobsForOrg(orgId);
  const openJobs = jobs.filter((j) => j.recruiterJobStatus === "open");
  const apps = getApplicationsForOrganization(orgId);
  const talent = discoverTalentForOrg(orgId, apps);
  const inInterview = apps.filter(
    (a) => a.status === "interview_scheduled" || a.status === "interview_completed",
  ).length;
  const offers = apps.filter(
    (a) => a.status === "offer_sent" || a.status === "offer_accepted",
  ).length;

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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button className="h-auto py-3 justify-start" asChild>
            <Link to="/careers/recruiter/jobs/new">
              <Plus className="size-4 mr-2 shrink-0" />
              Post a job
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-3 justify-start" asChild>
            <Link to="/careers/recruiter/jobs">
              <Briefcase className="size-4 mr-2 shrink-0" />
              Manage listings
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-3 justify-start" asChild>
            <Link to="/careers/recruiter/applicants">
              <FolderOpen className="size-4 mr-2 shrink-0" />
              Applicant pipeline
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-3 justify-start" asChild>
            <Link to="/careers/recruiter/talent">
              <Users className="size-4 mr-2 shrink-0" />
              Discover talent ({talent.length})
            </Link>
          </Button>
        </div>
      </SectionCard>

      {apps.length > 0 && (
        <SectionCard
          title="Recent applicants"
          link="/careers/recruiter/applicants"
          linkLabel="View pipeline"
        >
          <div className="space-y-2">
            {apps.slice(0, 5).map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{app.personal.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.jobTitle}</p>
                </div>
                <Badge variant={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
