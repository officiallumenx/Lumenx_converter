import { Link } from "@tanstack/react-router";
import { Button, SimpleFileUpload, type SimpleUploadKind, type SimpleUploadValue } from "@lumenx/ui";
import { Building2 } from "lucide-react";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { getInstituteById } from "@/lib/admissions/institutes-data";
import type { AdmissionProgram } from "@/lib/admissions/types";

export function ProgramCard({
  program,
  instituteId,
  showInstitute = true,
}: {
  program: AdmissionProgram;
  instituteId?: string;
  /** Show institute name when browsing cross-institute lists */
  showInstitute?: boolean;
}) {
  const { user } = useAdmissionsAuth();
  const resolvedInstituteId = instituteId ?? program.instituteId;
  const institute =
    showInstitute && resolvedInstituteId ? getInstituteById(resolvedInstituteId) : undefined;
  const applySearch = {
    program: program.id,
    ...(resolvedInstituteId ? { institute: resolvedInstituteId } : {}),
  };
  const applyTo =
    user?.accountType === "parent"
      ? { to: "/admissions/apply" as const, search: applySearch }
      : {
          to: "/admissions/login" as const,
          search: { redirect: "/admissions/apply", ...applySearch },
        };
  const seatsFull = program.seatsAvailable <= 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-all motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md">
      {institute && (
        <p className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{institute.name}</span>
        </p>
      )}
      <h3 className="font-display text-lg font-bold">{program.name}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">
        {program.description}
      </p>
      <dl className="mt-4 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="font-medium">{program.duration}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Eligibility</dt>
          <dd className="font-medium text-right max-w-[55%]">{program.eligibility}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Seats</dt>
          <dd className={`font-medium ${seatsFull ? "text-warning" : "text-primary"}`}>
            {seatsFull ? "Seats Full · Waitlist Available" : `${program.seatsAvailable} open`}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" asChild>
          <Link to={applyTo.to} search={applyTo.search}>
            Apply
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admissions/programs/$programId" params={{ programId: program.id }}>
            Details
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ApplicationStatusTimeline({
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
