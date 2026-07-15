import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import {
  FilePlus,
  FolderOpen,
  Bell,
  Calendar,
  FileText,
  Heart,
  GraduationCap,
  Upload,
  MessageSquare,
  Phone,
} from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { SectionCard } from "@/components/app/SectionCard";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { getApplicationsForUser, unreadNotificationCount } from "@/lib/admissions/repositories";
import { getSavedInstituteIds, getSavedProgramIds } from "@/lib/admissions/saved-store";
import { getInstituteById } from "@/lib/admissions/institutes-data";
import { getProgramByIdV2 } from "@/lib/admissions/programs-data";
import { statusLabel, statusTone } from "@/lib/admissions/status-utils";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";

export function ApplicantDashboardPage() {
  const { user } = useAdmissionsAuth();
  if (!user) return null;

  const apps = getApplicationsForUser(user.id);
  const unread = unreadNotificationCount(user.id);
  const pendingDocs = apps.filter((a) =>
    a.documents.some(
      (d) =>
        d.status === "resubmission_required" ||
        d.status === "requires_resubmission" ||
        d.status === "not_uploaded",
    ),
  ).length;
  const upcomingInterviews = apps.filter((a) => a.interview?.status === "scheduled").length;
  const savedInstitutes = getSavedInstituteIds(user.id);
  const savedPrograms = getSavedProgramIds(user.id);

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <AdmissionsPageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Your admission command center"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Applications" value={String(apps.length)} icon={FolderOpen} />
        <StatCard
          label="Pending documents"
          value={String(pendingDocs)}
          icon={Upload}
          tone={pendingDocs > 0 ? "warning" : "default"}
        />
        <StatCard label="Interviews" value={String(upcomingInterviews)} icon={Calendar} />
        <StatCard
          label="Notifications"
          value={String(unread)}
          icon={Bell}
          tone={unread > 0 ? "warning" : "default"}
        />
      </div>

      <SectionCard title="Quick actions">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Apply now", to: "/admissions/apply", icon: FilePlus },
            { label: "Upload documents", to: "/admissions/documents", icon: Upload },
            { label: "Track status", to: "/admissions/applications", icon: FolderOpen },
            { label: "Contact admissions", to: "/admissions/inquiries", icon: MessageSquare },
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

      <SectionCard title="Recent applications" link="/admissions/applications" linkLabel="View all">
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No applications yet.{" "}
            <Link to="/admissions/apply" className="text-primary hover:underline">
              Start applying
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {apps.slice(0, 3).map((app) => (
              <Link
                key={app.id}
                to="/admissions/applications/$applicationId"
                params={{ applicationId: app.id }}
                className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{app.student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.programName} · {app.id}
                  </p>
                </div>
                <Badge variant={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {(savedInstitutes.length > 0 || savedPrograms.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {savedInstitutes.length > 0 && (
            <SectionCard title="Saved institutes">
              <ul className="space-y-2 text-sm">
                {savedInstitutes.map((id) => {
                  const inst = getInstituteById(id);
                  return inst ? (
                    <li key={id}>
                      <Link
                        to="/admissions/institutes/$instituteId"
                        params={{ instituteId: id }}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <Heart className="size-3 text-destructive fill-destructive" /> {inst.name}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </SectionCard>
          )}
          {savedPrograms.length > 0 && (
            <SectionCard title="Saved programs">
              <ul className="space-y-2 text-sm">
                {savedPrograms.map((id) => {
                  const prog = getProgramByIdV2(id);
                  return prog ? (
                    <li key={id}>
                      <Link
                        to="/admissions/programs/$programId"
                        params={{ programId: id }}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <GraduationCap className="size-3" /> {prog.name}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4 text-primary" />
          <span>Need help? Ask the admissions team</span>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/admissions/inquiries">Open inquiry center</Link>
        </Button>
      </div>
    </div>
  );
}
