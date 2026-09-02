import { Link } from "@tanstack/react-router";
import { Bookmark, Briefcase, MapPin } from "lucide-react";
import { Badge, Button, SimpleFileUpload, type SimpleUploadKind, type SimpleUploadValue } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { isRecruiter } from "@/lib/careers/auth-utils";
import { JOB_CATEGORY_LABEL } from "@/lib/careers/jobs-data";
import { isJobSaved, toggleSavedJob } from "@/lib/careers/repositories";
import type { JobPosting } from "@/lib/careers/types";
import { useState } from "react";
import { toast } from "sonner";

export function JobCard({
  job,
  compact,
  hideActions,
  browseMarket,
  footer,
}: {
  job: JobPosting;
  compact?: boolean;
  /** Hide Apply / Details — e.g. recruiter manage view */
  hideActions?: boolean;
  /** Recruiter market view — no apply/save; Edit on own listings */
  browseMarket?: boolean;
  footer?: React.ReactNode;
}) {
  const { user } = useCareersAuth();
  const recruiter = isRecruiter(user);
  const ownListing =
    browseMarket &&
    recruiter &&
    !!user?.organizationId &&
    job.instituteId === user.organizationId &&
    !!job.postedByRecruiterId;
  const [saved, setSaved] = useState(() =>
    user && !browseMarket ? isJobSaved(user.id, job.id) : false,
  );

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.message("Sign in to save jobs");
      return;
    }
    const next = toggleSavedJob(user.id, job.id);
    setSaved(next);
    toast.success(next ? "Job saved" : "Removed from saved");
  };

  const applyTo = user
    ? { to: "/apply" as const, search: { job: job.id } }
    : { to: "/login" as const, search: { redirect: "/apply", job: job.id } };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-soft transition-all motion-safe:hover:border-primary/20",
        compact && "p-3",
      )}
    >
      <div className={cn("mb-3 h-2 rounded-full bg-gradient-to-r", job.imageGradient)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to="/jobs/$jobId"
            params={{ jobId: job.id }}
            className="font-display text-lg font-bold hover:text-primary line-clamp-2"
          >
            {job.title}
          </Link>
          <p className="text-sm text-muted-foreground mt-0.5">
            {job.instituteName} · {job.department}
          </p>
        </div>
        {!browseMarket && (
          <button
            type="button"
            onClick={toggleSave}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-primary"
            aria-label={saved ? "Unsave job" : "Save job"}
          >
            <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ownListing && <Badge className="text-[10px]">Your listing</Badge>}
        <Badge variant="secondary" className="text-[10px]">
          {JOB_CATEGORY_LABEL[job.category]}
        </Badge>
        <Badge variant="outline" className="text-[10px] capitalize">
          {job.employmentType.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline" className="text-[10px] capitalize">
          {job.workMode}
        </Badge>
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3 shrink-0" />
        <span className="truncate">{job.location || `${job.city}, ${job.state}`}</span>
      </p>
      {job.overview && (
        <p
          className={cn(
            "mt-2 text-sm text-muted-foreground",
            compact ? "line-clamp-1" : "line-clamp-2",
          )}
        >
          {job.overview}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {job.experienceRequired && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Briefcase className="size-3 shrink-0 text-primary" />
            {job.experienceRequired}
          </span>
        )}
        {job.deadline && (
          <>
            <span className="hidden sm:inline text-border">·</span>
            <span>
              Deadline:{" "}
              {new Date(job.deadline).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </>
        )}
        {job.salaryDisplay && (
          <>
            <span className="hidden sm:inline text-border">·</span>
            <span>{job.salaryDisplay}</span>
          </>
        )}
      </div>
      {!hideActions && (
        <div className="mt-4 flex gap-2">
          {browseMarket ? (
            ownListing ? (
              <>
                <Button className="flex-1" size="sm" asChild>
                  <Link to="/recruiter/jobs/$jobId/edit" params={{ jobId: job.id }}>
                    Edit
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                    Preview
                  </Link>
                </Button>
              </>
            ) : (
              <Button className="flex-1" size="sm" variant="outline" asChild>
                <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                  View listing
                </Link>
              </Button>
            )
          ) : (
            <>
              <Button className="flex-1" size="sm" asChild>
                <Link to={applyTo.to} search={applyTo.search}>
                  Apply
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                  Details
                </Link>
              </Button>
            </>
          )}
        </div>
      )}
      {footer && <div className="mt-3 pt-3 border-t border-border">{footer}</div>}
    </div>
  );
}

export function SaveJobButton({ jobId }: { jobId: string }) {
  const { user } = useCareersAuth();
  const [saved, setSaved] = useState(() => (user ? isJobSaved(user.id, jobId) : false));

  const toggle = () => {
    if (!user) {
      toast.message("Sign in to save jobs");
      return;
    }
    setSaved(toggleSavedJob(user.id, jobId));
  };

  return (
    <Button variant="outline" onClick={toggle}>
      <Bookmark className={cn("size-4 mr-2", saved && "fill-primary text-primary")} />
      {saved ? "Saved" : "Save job"}
    </Button>
  );
}

export function ApplicationTimeline({
  events,
}: {
  events: { label: string; at: string; note?: string }[];
}) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.6rem] top-1 flex size-3 rounded-full bg-primary ring-4 ring-background" />
          <p className="text-sm font-medium">{e.label}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(e.at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          {e.note && <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export function DocumentUploadCard({
  label,
  fileName,
  dataUrl,
  status,
  kind = "document",
  onChange,
  onUpload,
  onClear,
}: {
  label: string;
  fileName?: string;
  dataUrl?: string;
  status?: string;
  kind?: SimpleUploadKind;
  onChange?: (next: SimpleUploadValue | null) => void;
  /** Legacy: receives a File after validation/compression. Prefer onChange. */
  onUpload?: (file: File) => void;
  onClear?: () => void;
}) {
  const value: SimpleUploadValue | null = fileName
    ? {
        fileName,
        mimeType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        size: 0,
        dataUrl: dataUrl ?? "",
      }
    : null;

  return (
    <div className="space-y-1.5">
      {status ? (
        <p className="text-xs text-primary capitalize">{status.replace(/_/g, " ")}</p>
      ) : null}
      <SimpleFileUpload
        kind={kind}
        label={label}
        value={value}
        onChange={(next) => {
          onChange?.(next);
          if (!next) {
            onClear?.();
            return;
          }
          if (!onUpload) return;
          void (async () => {
            const res = await fetch(next.dataUrl);
            const blob = await res.blob();
            onUpload(new File([blob], next.fileName, { type: next.mimeType }));
          })();
        }}
      />
    </div>
  );
}
