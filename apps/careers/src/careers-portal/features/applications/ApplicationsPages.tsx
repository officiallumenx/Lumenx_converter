import { Link } from "@tanstack/react-router";
import { Badge, Button } from "@lumenx/ui";
import { Calendar, MapPin, Video } from "lucide-react";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import {
  ApplicationTimelineV2,
  ApplicationProgressTracker,
  DocumentVerificationCard,
  DemoClassCard,
} from "@/careers-portal/shared/ui/v2/CareersV2Widgets";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { getInstituteProfile } from "@/lib/careers/institute-profiles";
import { useCareersApplication, useCareersApplications } from "@/hooks/use-careers-applications";
import {
  getStatusProgress,
  interviewModeLabel,
  statusLabel,
  statusTone,
} from "@/lib/careers/status-utils";

export function ApplicationsListPage() {
  const { user } = useCareersAuth();
  const { applications: apps, loading, status, errorMessage } = useCareersApplications({
    scope: "candidate",
  });

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading applications…</div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        {errorMessage ?? "Could not load applications."}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <CareersPageHeader
        title="My applications"
        subtitle={`${apps.length} application${apps.length === 1 ? "" : "s"}`}
      />

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No applications yet.</p>
          <Button className="mt-4" asChild>
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Link
              key={a.id}
              to="/applications/$applicationId"
              params={{ applicationId: a.id }}
              className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.jobTitle}</p>
                  <p className="text-sm text-muted-foreground">{a.instituteName}</p>
                </div>
                <Badge variant={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${getStatusProgress(a.status)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {new Date(a.updatedAt).toLocaleDateString("en-IN")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicationDetailPage({ applicationId }: { applicationId: string }) {
  const { application: app, status, errorMessage } = useCareersApplication(applicationId);
  const institute = app?.instituteId ? getInstituteProfile(app.instituteId) : undefined;

  if (status === "loading") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading application…</div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{errorMessage ?? "Could not load application."}</p>
        <Button className="mt-4" asChild>
          <Link to="/applications">Back to list</Link>
        </Button>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Application not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/applications">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <CareersPageHeader
        title={app.jobTitle}
        subtitle={`${app.instituteName} · ${app.id}`}
        backTo="/applications"
      />

      <Badge variant={statusTone(app.status)} className="mb-4">
        {statusLabel(app.status)}
      </Badge>

      <ApplicationProgressTracker status={app.status} />

      <section className="mb-8 mt-6">
        <h2 className="font-display text-lg font-bold mb-4">Timeline</h2>
        <ApplicationTimelineV2 events={app.timeline} currentStatus={app.status} />
      </section>

      {app.demoClass && (
        <section className="mb-8">
          <DemoClassCard demo={app.demoClass} />
        </section>
      )}

      {app.interview && (
        <section className="mb-8 rounded-2xl border border-border p-4">
          <h2 className="font-display text-lg font-bold mb-3">Interview</h2>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Calendar className="size-4" /> {app.interview.date} at {app.interview.time}
            </p>
            <p className="flex items-center gap-2">
              {app.interview.mode === "video" ? (
                <Video className="size-4" />
              ) : (
                <MapPin className="size-4" />
              )}
              {interviewModeLabel(app.interview.mode)} — {app.interview.location}
            </p>
            <p className="text-muted-foreground">{app.interview.instructions}</p>
            <Badge variant="outline" className="capitalize">
              {app.interview.status}
            </Badge>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-display text-lg font-bold mb-3">Documents</h2>
        <div className="space-y-2">
          {app.documents.map((d) => (
            <DocumentVerificationCard key={d.id} doc={d} />
          ))}
        </div>
      </section>

      {app.hrNotes && app.hrNotes.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-lg font-bold mb-3">HR notes</h2>
          <ul className="space-y-2">
            {app.hrNotes.map((n, i) => (
              <li key={i} className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
