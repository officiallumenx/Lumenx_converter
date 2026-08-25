import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
} from "@lumenx/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/app/SectionCard";
import { JobCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { getApplicationsForOrganization } from "@/lib/careers/repositories";
import {
  countApplicantsForJob,
  deleteRecruiterJob,
  getRecruiterJobsForOrg,
  updateRecruiterJobStatus,
} from "@/lib/careers/recruiter-jobs-store";
import type { JobPosting, RecruiterJobStatus } from "@/lib/careers/types";

const STATUS_TONE: Record<RecruiterJobStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  draft: "secondary",
  closed: "outline",
};

export function RecruiterJobsPage() {
  const { user } = useCareersAuth();
  const [refresh, setRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null);

  const orgId = user?.organizationId ?? "";
  const jobs = useMemo(() => (orgId ? getRecruiterJobsForOrg(orgId) : []), [orgId, refresh]);

  if (!user?.organizationId) return null;

  const apps = getApplicationsForOrganization(orgId);

  const setStatus = (jobId: string, status: RecruiterJobStatus) => {
    updateRecruiterJobStatus(jobId, status);
    setRefresh((n) => n + 1);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const ok = deleteRecruiterJob(deleteTarget.id, orgId);
    if (ok) {
      toast.success(`${deleteTarget.title} deleted`);
      setRefresh((n) => n + 1);
    } else {
      toast.error("Could not delete this job");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <CareersPageHeader
        title="My job posts"
        subtitle={`Manage listings for ${user.organizationName ?? "your organization"}`}
        backTo="/careers/recruiter"
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/careers/recruiter/jobs/new">
            <Plus className="size-4 mr-2" /> Post a job
          </Link>
        </Button>
      </div>

      <SectionCard title={`Your listings (${jobs.length})`}>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No jobs posted yet.{" "}
            <Link to="/careers/recruiter/jobs/new" className="text-primary hover:underline">
              Create your first listing
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => {
              const applicants = countApplicantsForJob(job.id, apps);
              const status = job.recruiterJobStatus ?? "open";
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  hideActions
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_TONE[status]} className="capitalize">
                          {status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {applicants} applicant{applicants !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" asChild>
                          <Link to="/careers/recruiter/jobs/$jobId/edit" params={{ jobId: job.id }}>
                            <Pencil className="size-3.5 mr-1.5" /> Edit
                          </Link>
                        </Button>
                        {status !== "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(job.id, "open")}
                          >
                            Publish
                          </Button>
                        )}
                        {status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(job.id, "closed")}
                          >
                            Close
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/careers/jobs/$jobId" params={{ jobId: job.id }}>
                            Preview
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(job)}
                        >
                          <Trash2 className="size-3.5 mr-1.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" will be removed from My jobs. Existing applications stay in records but will no longer show under this role.`
                : undefined}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
