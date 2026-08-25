import { Link } from "@tanstack/react-router";
import { Button, Badge, Progress, SimpleFileUpload, type SimpleUploadValue } from "@lumenx/ui";
import { Building2, Heart, MapPin, Star } from "lucide-react";
import { cn } from "@lumenx/ui";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { getInstituteById, INSTITUTE_KIND_LABEL } from "@/lib/admissions/institutes-data";
import { getInstituteProfileExtended } from "@/lib/admissions/institute-profiles";
import type { AdmissionInstituteProfile } from "@/lib/admissions/institutes-data";
import type { ApplicationDocument, TimelineEvent, ApplicationStatus } from "@/lib/admissions/types";
import {
  documentStatusLabel,
  documentStatusTone,
  getStatusProgress,
  normalizeApplicationStatus,
  statusLabel,
  STATUS_ORDER,
} from "@/lib/admissions/status-utils";
import { isInstituteSaved, toggleSavedInstitute } from "@/lib/admissions/saved-store";
import { useState } from "react";

export function InstituteDirectoryCard({
  institute,
  onSaveToggle,
}: {
  institute: AdmissionInstituteProfile;
  onSaveToggle?: () => void;
}) {
  const { user } = useAdmissionsAuth();
  const ext = getInstituteProfileExtended(institute.id);
  const saved = user ? isInstituteSaved(user.id, institute.id) : false;
  const applySearch = { institute: institute.id };

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-all motion-safe:hover:border-primary/25 motion-safe:hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-primary-foreground",
            ext?.logoGradient ?? "from-primary to-chart-5",
          )}
        >
          {ext?.logoInitials ?? institute.code.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge variant="secondary">{INSTITUTE_KIND_LABEL[institute.kind]}</Badge>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Star className="size-3 fill-primary text-primary" /> {institute.rating}
            </span>
          </div>
          <h3 className="mt-1 font-display text-base font-bold leading-tight">{institute.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> {institute.city}, {institute.state}
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={onSaveToggle}
            className="shrink-0 rounded-lg p-2 hover:bg-muted"
            aria-label={saved ? "Remove from saved" : "Save institute"}
          >
            <Heart
              className={cn(
                "size-4",
                saved ? "fill-destructive text-destructive" : "text-muted-foreground",
              )}
            />
          </button>
        )}
      </div>
      <p className="mt-3 flex-1 text-sm text-muted-foreground line-clamp-2">
        {ext?.shortDescription ?? institute.tagline}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{institute.programsCount} programs</span>
        <span className="font-medium text-primary">{institute.seatsOpen} seats open</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" size="sm" asChild>
          <Link to="/admissions/apply" search={applySearch}>
            Apply
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link to="/admissions/institutes/$instituteId" params={{ instituteId: institute.id }}>
            View profile
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function ApplicationTimelineV2({
  events,
  currentStatus,
}: {
  events: TimelineEvent[];
  currentStatus?: ApplicationStatus;
}) {
  const progress = currentStatus ? getStatusProgress(currentStatus) : 0;
  const normalized = currentStatus ? normalizeApplicationStatus(currentStatus) : undefined;

  return (
    <div className="space-y-4">
      {currentStatus && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-semibold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            Current:{" "}
            <span className="font-medium text-foreground">{statusLabel(currentStatus)}</span>
          </p>
        </div>
      )}
      <ol className="relative space-y-4 border-l border-border pl-6">
        {events.map((e, i) => {
          const isCurrent = normalized === normalizeApplicationStatus(e.status);
          return (
            <li key={e.id ?? i} className="relative">
              <span
                className={cn(
                  "absolute -left-[1.6rem] top-1 flex size-3 rounded-full ring-4 ring-background",
                  isCurrent ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              <p className="text-sm font-medium">{e.label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {e.note && <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-1">
        {STATUS_ORDER.filter((s) => s !== "rejected").map((s) => (
          <span
            key={s}
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              normalized === s ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {statusLabel(s).split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DocumentVerificationCard({
  doc,
  onUpload,
  onPreview,
  onClear,
}: {
  doc: ApplicationDocument;
  onUpload?: (file: File) => void;
  onPreview?: () => void;
  onClear?: () => void;
}) {
  const value: SimpleUploadValue | null = doc.fileName
    ? {
        fileName: doc.fileName,
        mimeType: doc.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        size: 0,
        dataUrl: doc.previewDataUrl ?? "",
      }
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{doc.label}</p>
          {doc.version && doc.version > 1 && (
            <p className="text-[10px] text-muted-foreground">Version {doc.version}</p>
          )}
        </div>
        <Badge variant={documentStatusTone(doc.status)}>{documentStatusLabel(doc.status)}</Badge>
      </div>
      {doc.adminNotes && doc.adminNotes.length > 0 && (
        <div className="rounded-lg bg-warning/5 border border-warning/20 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-warning">Admin notes</p>
          <ul className="mt-1 list-disc pl-4">
            {doc.adminNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {doc.verificationTimeline && doc.verificationTimeline.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Verification timeline
          </p>
          {doc.verificationTimeline.map((v) => (
            <p key={v.id} className="text-[11px] text-muted-foreground">
              {documentStatusLabel(v.status)} · {new Date(v.at).toLocaleDateString("en-IN")}
              {v.note && ` — ${v.note}`}
            </p>
          ))}
        </div>
      )}
      {doc.fileName && onPreview ? (
        <Button size="sm" variant="outline" onClick={onPreview}>
          Preview
        </Button>
      ) : null}
      <SimpleFileUpload
        kind="document"
        value={value}
        onChange={(next) => {
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

export function InstituteLogoBadge({
  instituteId,
  size = "md",
}: {
  instituteId: string;
  size?: "sm" | "md" | "lg";
}) {
  const institute = getInstituteById(instituteId);
  const ext = getInstituteProfileExtended(instituteId);
  const sz =
    size === "lg" ? "size-16 text-lg" : size === "sm" ? "size-8 text-[10px]" : "size-12 text-sm";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-primary-foreground",
        ext?.logoGradient ?? "from-primary to-chart-5",
        sz,
      )}
    >
      {ext?.logoInitials ?? <Building2 className="size-4" />}
    </div>
  );
}

export function useInstituteSave(instituteId: string) {
  const { user } = useAdmissionsAuth();
  const [, tick] = useState(0);
  const saved = user ? isInstituteSaved(user.id, instituteId) : false;
  const toggle = () => {
    if (!user) return;
    toggleSavedInstitute(user.id, instituteId);
    tick((n) => n + 1);
  };
  return { saved, toggle, canSave: !!user };
}
