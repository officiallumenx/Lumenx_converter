import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import {
  Briefcase,
  Bookmark,
  Calendar,
  FileText,
  Bell,
  User,
  Upload,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { SectionCard } from "@/components/app/SectionCard";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { JobCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { ProfileStrengthBadge } from "@/careers-portal/shared/ui/v2/CareersV2Widgets";
import {
  getApplicationsForUser,
  getSavedJobs,
  unreadNotificationCount,
} from "@/lib/careers/repositories";
import {
  getCandidateProfile,
  computeProfileCompletion,
  computeProfileStrength,
  profileStrengthLabel,
} from "@/lib/careers/profile-repository";
import { getTalentPoolEntries, isInTalentPool } from "@/lib/careers/talent-pool-store";
import { getRecommendedJobs } from "@/lib/careers/recommendations";
import { statusLabel, statusTone } from "@/lib/careers/status-utils";

export function CandidateDashboardPage() {
  const { user } = useCareersAuth();
  if (!user) return null;

  const apps = getApplicationsForUser(user.id);
  const saved = getSavedJobs(user.id);
  const unread = unreadNotificationCount(user.id);
  const profile = getCandidateProfile(user.id);
  const pct = computeProfileCompletion(profile);
  const strength = profileStrengthLabel(computeProfileStrength(profile));
  const talentPool = getTalentPoolEntries(user.id);
  const pendingDocs = apps.filter((a) =>
    a.documents.some((d) => d.status === "requires_resubmission" || d.status === "uploaded"),
  ).length;
  const upcomingInterviews = apps.filter((a) => a.interview?.status === "scheduled").length;
  const recommended = getRecommendedJobs(profile, 3);

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <CareersPageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Your recruitment command center"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Applications" value={String(apps.length)} icon={FolderOpen} />
        <StatCard label="Saved jobs" value={String(saved.length)} icon={Bookmark} />
        <StatCard
          label="Interviews"
          value={String(upcomingInterviews)}
          icon={Calendar}
          tone={upcomingInterviews > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Notifications"
          value={String(unread)}
          icon={Bell}
          tone={unread > 0 ? "warning" : "default"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
        <User className="size-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Profile completion</p>
          <p className="text-xs text-muted-foreground">
            Stronger profiles get better recommendations
          </p>
        </div>
        <ProfileStrengthBadge strength={strength} percent={pct} />
        <Button size="sm" variant="outline" asChild>
          <Link to="/profile">Update profile</Link>
        </Button>
      </div>

      {isInTalentPool(user.id) && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              You&apos;re in {talentPool.length} talent pool{talentPool.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Employers may reach out for future opportunities matching your profile.
            </p>
          </div>
        </div>
      )}

      <SectionCard title="Quick actions">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Browse jobs", to: "/jobs", icon: Briefcase },
            { label: "Update profile", to: "/profile", icon: User },
            { label: "Upload documents", to: "/documents", icon: Upload },
            { label: "Track applications", to: "/applications", icon: FolderOpen },
          ].map((a) => (
            <Button key={a.to} variant="outline" className="h-auto py-3 justify-start" asChild>
              <Link to={a.to}>
                <a.icon className="size-4 mr-2 shrink-0" />
                {a.label}
              </Link>
            </Button>
          ))}
        </div>
      </SectionCard>

      {recommended.length > 0 && (
        <SectionCard title="Recommended for you" link="/jobs" linkLabel="View all">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map(({ job }) => (
              <JobCard key={job.id} job={job} compact />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Recent applications" link="/applications" linkLabel="View all">
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No applications yet.{" "}
            <Link to="/jobs" className="text-primary hover:underline">
              Browse jobs
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {apps.slice(0, 4).map((app) => (
              <Link
                key={app.id}
                to="/applications/$applicationId"
                params={{ applicationId: app.id }}
                className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{app.jobTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.instituteName} · {app.id}
                  </p>
                </div>
                <Badge variant={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {pendingDocs > 0 && (
        <SectionCard title="Pending documents">
          <p className="text-sm text-muted-foreground">
            {pendingDocs} application(s) need document attention.
          </p>
          <Button className="mt-3" size="sm" variant="outline" asChild>
            <Link to="/documents">
              <FileText className="size-4 mr-1" /> Document center
            </Link>
          </Button>
        </SectionCard>
      )}
    </div>
  );
}
