import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import { Calendar, MapPin, Monitor, Phone, Video } from "lucide-react";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { getApplicationsForUser } from "@/lib/admissions/repositories";
import type { InterviewMode } from "@/lib/admissions/types";

const MODE_ICON: Record<InterviewMode, typeof MapPin> = {
  in_person: MapPin,
  phone: Phone,
  video: Video,
};

const MODE_LABEL: Record<InterviewMode, string> = {
  in_person: "In person",
  phone: "Phone",
  video: "Video",
};

export function InterviewsPage() {
  const { user } = useAdmissionsAuth();
  const apps = user ? getApplicationsForUser(user.id).filter((a) => a.interview) : [];

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader title="Interviews" subtitle="Dates, modes, and instructions" />

      {apps.length === 0 && (
        <EmptyState
          icon={<Calendar className="size-6" />}
          title="No interviews scheduled"
          hint="When an institute schedules an interview, details will appear here."
          action={
            <Button asChild>
              <Link to="/admissions/applications">My applications</Link>
            </Button>
          }
        />
      )}

      {apps.length > 0 && (
        <div className="space-y-4">
          {apps.map((app) => {
            const iv = app.interview!;
            const ModeIcon = MODE_ICON[iv.mode ?? "in_person"];
            return (
              <article
                key={app.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{app.student.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {app.programName} · {app.id}
                    </p>
                  </div>
                  <Badge variant={iv.status === "completed" ? "secondary" : "default"}>
                    {iv.status}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" /> {iv.date} · {iv.time}
                  </p>
                  <p className="flex items-center gap-2">
                    <ModeIcon className="size-4 text-primary" />{" "}
                    {MODE_LABEL[iv.mode ?? "in_person"]}
                  </p>
                  {iv.mode === "video" && iv.meetingLink && (
                    <p className="flex items-center gap-2 sm:col-span-2">
                      <Monitor className="size-4" />{" "}
                      <a href={iv.meetingLink} className="text-primary hover:underline">
                        {iv.meetingLink}
                      </a>
                    </p>
                  )}
                  {iv.mode !== "phone" && (
                    <p className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="size-4 shrink-0 text-primary" /> {iv.location}
                    </p>
                  )}
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{iv.instructions}</p>

                {iv.requiredDocuments && iv.requiredDocuments.length > 0 && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs">
                    <p className="font-medium">Required documents</p>
                    <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                      {iv.requiredDocuments.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button className="mt-4" size="sm" variant="outline" asChild>
                  <Link
                    to="/admissions/applications/$applicationId"
                    params={{ applicationId: app.id }}
                  >
                    View application
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
