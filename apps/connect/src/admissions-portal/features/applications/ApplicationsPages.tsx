import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { Badge } from "@lumenx/ui";
import { FilePlus } from "lucide-react";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { ApplicationTimelineV2 } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { getApplicationsForUser, getApplicationById } from "@/lib/admissions/repositories";
import { statusLabel } from "@/lib/admissions/mock-data";
import { statusTone } from "@/lib/admissions/status-utils";

export function MyApplicationsPage() {
  const { user } = useAdmissionsAuth();
  const apps = user ? getApplicationsForUser(user.id) : [];

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={<FilePlus className="size-6" />}
        title="No applications yet"
        hint="Start your admission journey with a new application."
        action={<Button asChild><Link to="/admissions/apply">Apply now</Link></Button>}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader title="My applications" subtitle={`${apps.length} application${apps.length !== 1 ? "s" : ""}`} />
      <div className="space-y-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            to="/admissions/applications/$applicationId"
            params={{ applicationId: app.id }}
            className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition-all motion-safe:hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{app.id}</p>
                <p className="font-semibold">{app.student.name}</p>
                <p className="text-sm text-muted-foreground">{app.programName} · {app.grade}</p>
              </div>
              <Badge variant={statusTone(app.status)}>
                {statusLabel(app.status)}
              </Badge>
            </div>
            {app.submittedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted {new Date(app.submittedAt).toLocaleDateString("en-IN")}
              </p>
            )}
          </Link>
        ))}
      </div>
      <Button className="mt-6 w-full" asChild>
        <Link to="/admissions/apply"><FilePlus className="size-4 mr-2" /> New application</Link>
      </Button>
    </div>
  );
}

export function ApplicationStatusPage({ applicationId }: { applicationId: string }) {
  const app = getApplicationById(applicationId);

  if (!app) {
    return (
      <EmptyState title="Application not found" hint="Check the ID or return to your list." action={<Button asChild><Link to="/admissions/applications">My applications</Link></Button>} />
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader title={app.student.name} subtitle={`${app.id} · ${app.programName}`} backTo="/admissions/applications" />

      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current status</span>
          <Badge variant={statusTone(app.status) as "default" | "secondary" | "destructive" | "outline"}>{statusLabel(app.status)}</Badge>
        </div>
      </div>

      {app.requiredActions && app.requiredActions.length > 0 && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium">Required actions</p>
          <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
            {app.requiredActions.map((a) => <li key={a}>{a}</li>)}
          </ul>
          <Button className="mt-3" size="sm" variant="outline" asChild>
            <Link to="/admissions/documents">Document center</Link>
          </Button>
        </div>
      )}

      <h2 className="mb-4 text-sm font-semibold">Application timeline</h2>
      <ApplicationTimelineV2 events={app.timeline} currentStatus={app.status} />

      {app.interview && (
        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="font-semibold">Interview</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{app.interview.date}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Time</dt><dd>{app.interview.time}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Location</dt><dd className="text-right max-w-[60%]">{app.interview.location}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{app.interview.instructions}</p>
        </div>
      )}

      {app.adminNotes && app.adminNotes.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">Notes from admissions</h2>
          {app.adminNotes.map((n, i) => (
            <p key={i} className="mt-2 text-sm text-muted-foreground">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
