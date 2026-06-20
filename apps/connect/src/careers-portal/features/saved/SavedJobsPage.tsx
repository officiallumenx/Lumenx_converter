import { Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { Button } from "@lumenx/ui";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { JobCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { getSavedJobs } from "@/lib/careers/repositories";

export function SavedJobsPage() {
  const { user } = useCareersAuth();
  if (!user) return null;

  const saved = getSavedJobs(user.id);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <CareersPageHeader title="Saved jobs" subtitle="Roles you've bookmarked for later" />

      {saved.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <Bookmark className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">No saved jobs yet.</p>
          <Button className="mt-4" asChild><Link to="/careers/jobs">Browse jobs</Link></Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
