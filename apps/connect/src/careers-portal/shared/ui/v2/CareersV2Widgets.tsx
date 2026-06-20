import { Badge } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import type { ApplicationDocument, ApplicationStatus, DemoClassDetails, TimelineEvent } from "@/lib/careers/types";
import { getStatusProgress, normalizeApplicationStatus, statusLabel, statusTone } from "@/lib/careers/status-utils";
import { documentStatusLabel } from "@/lib/careers/status-utils";

export function ApplicationTimelineV2({ events, currentStatus }: { events: TimelineEvent[]; currentStatus?: ApplicationStatus }) {
  const normalized = currentStatus ? normalizeApplicationStatus(currentStatus) : undefined;
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {events.map((e) => {
        const active = normalized === normalizeApplicationStatus(e.status);
        return (
          <li key={e.id} className="relative">
            <span className={cn(
              "absolute -left-[1.6rem] top-1 flex size-3 rounded-full ring-4 ring-background",
              active ? "bg-primary" : "bg-muted-foreground/40",
            )} />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{e.label}</p>
              <Badge variant={statusTone(e.status)} className="text-[9px]">{statusLabel(e.status)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(e.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            {e.note && <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function ApplicationProgressTracker({ status }: { status: ApplicationStatus }) {
  const pct = getStatusProgress(status);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Pipeline progress</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">Current: {statusLabel(status)}</p>
    </div>
  );
}

export function DocumentVerificationCard({ doc }: { doc: ApplicationDocument }) {
  const tone =
    doc.status === "verified" ? "default" :
    doc.status === "rejected" || doc.status === "requires_resubmission" ? "destructive" :
    "secondary";
  return (
    <div className="rounded-xl border border-border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{doc.label}</p>
        {doc.fileName && <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>}
        {doc.note && <p className="text-xs text-destructive mt-1">{doc.note}</p>}
      </div>
      <Badge variant={tone} className="shrink-0 text-[10px]">{documentStatusLabel(doc.status)}</Badge>
    </div>
  );
}

export function DemoClassCard({ demo }: { demo: DemoClassDetails }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Demo class</h4>
        <Badge variant="outline" className="capitalize text-[10px]">{demo.evaluationStatus.replace(/_/g, " ")}</Badge>
      </div>
      {demo.scheduledAt && (
        <p className="text-xs text-muted-foreground">Scheduled: {new Date(demo.scheduledAt).toLocaleString("en-IN")}</p>
      )}
      {demo.videoFileName && (
        <p className="text-xs"><span className="text-muted-foreground">Video:</span> {demo.videoFileName}</p>
      )}
      {demo.feedback && <p className="text-sm text-muted-foreground">{demo.feedback}</p>}
      {demo.evaluatorNote && (
        <p className="text-xs border-t border-border pt-2"><strong>Evaluator:</strong> {demo.evaluatorNote}</p>
      )}
    </div>
  );
}

export function InstituteCareerCard({
  name,
  tagline,
  city,
  state,
  logoInitials,
  logoGradient,
  openRolesCount,
  featured,
  href,
}: {
  name: string;
  tagline: string;
  city: string;
  state: string;
  logoInitials: string;
  logoGradient: string;
  openRolesCount?: number;
  featured?: boolean;
  href?: string;
}) {
  const Tag = href ? "a" : "div";
  return (
    <Tag href={href} className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/25 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={cn("size-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0", logoGradient)}>
          {logoInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold truncate">{name}</h3>
            {featured && <Badge variant="secondary" className="text-[9px]">Featured</Badge>}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tagline}</p>
          <p className="text-xs text-muted-foreground mt-1">{city}, {state}</p>
          {openRolesCount !== undefined && (
            <p className="text-xs font-medium text-primary mt-2">{openRolesCount} open role{openRolesCount !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>
    </Tag>
  );
}

export function ProfileStrengthBadge({ strength, percent }: { strength: string; percent: number }) {
  const colors: Record<string, string> = {
    excellent: "bg-success/15 text-success border-success/30",
    strong: "bg-primary/15 text-primary border-primary/30",
    developing: "bg-warning/15 text-warning border-warning/30",
    starter: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium capitalize", colors[strength] ?? colors.starter)}>
      <span>{strength}</span>
      <span className="opacity-70">· {percent}%</span>
    </div>
  );
}
