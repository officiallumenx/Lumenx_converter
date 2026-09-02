import { Link } from "@tanstack/react-router";
import { Badge, Button } from "@lumenx/ui";
import { Calendar, MapPin, Video } from "lucide-react";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { useCareersInterviews } from "@/hooks/use-careers-interviews";
import { interviewModeLabel, statusLabel } from "@/lib/careers/status-utils";
import type { ApplicationStatus } from "@/lib/careers/types";

export function InterviewsPage() {
  const { interviews, loading, errorMessage } = useCareersInterviews();
  const now = new Date();
  const upcoming = interviews.filter(
    (i) => i.interview.status === "scheduled" && new Date(i.interview.date) >= now,
  );
  const past = interviews.filter(
    (i) => i.interview.status === "completed" || new Date(i.interview.date) < now,
  );

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading interviews…</div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <CareersPageHeader title="Interview schedule" subtitle="Across all your applications" />

      {errorMessage && (
        <p className="mb-4 text-center text-sm text-destructive">{errorMessage}</p>
      )}

      {interviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
          <Button className="mt-4" asChild>
            <Link to="/applications">View applications</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((item) => (
                  <InterviewCard key={item.applicationId} {...item} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold mb-3">Past</h2>
              <div className="space-y-3">
                {past.map((item) => (
                  <InterviewCard key={item.applicationId} {...item} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function InterviewCard({
  applicationId,
  jobTitle,
  instituteName,
  status,
  interview,
}: {
  applicationId: string;
  jobTitle: string;
  instituteName: string;
  status: ApplicationStatus;
  interview: {
    date: string;
    time: string;
    mode: "in_person" | "phone" | "video";
    location: string;
    instructions: string;
    status: string;
  };
}) {
  return (
    <Link
      to="/applications/$applicationId"
      params={{ applicationId }}
      className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{jobTitle}</p>
          <p className="text-sm text-muted-foreground">{instituteName}</p>
        </div>
        <Badge variant="outline">{statusLabel(status)}</Badge>
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Calendar className="size-4" /> {interview.date} · {interview.time}
        </p>
        <p className="flex items-center gap-2">
          {interview.mode === "video" ? (
            <Video className="size-4" />
          ) : (
            <MapPin className="size-4" />
          )}
          {interviewModeLabel(interview.mode)} — {interview.location}
        </p>
      </div>
    </Link>
  );
}
