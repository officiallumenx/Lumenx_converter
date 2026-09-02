import { Link } from "@tanstack/react-router";
import { Megaphone, Pin, ChevronRight } from "lucide-react";
import { Badge, cn } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { STUDENT_MODULE_COLORS, studentModuleIconStyle } from "@/lib/student/nav";
import type { AnnouncementDto } from "@/lib/announcements/types";
import { relativeInboxTimeLabel } from "@/lib/notification-inbox/map";

const ACCENT = STUDENT_MODULE_COLORS.rose;
const ICON_STYLE = studentModuleIconStyle(ACCENT);

function audienceLabel(row: AnnouncementDto): string | null {
  if (row.audienceLabel?.trim()) return row.audienceLabel.trim();
  if (row.audienceScope === "all") return "Everyone";
  if (row.audienceScope === "classes") return "Class / section";
  return row.audienceScope.charAt(0).toUpperCase() + row.audienceScope.slice(1);
}

export function AnnouncementsCenterView({
  items,
  loading,
  error,
  subtitle,
}: {
  items: AnnouncementDto[];
  loading?: boolean;
  error?: string | null;
  subtitle?: string;
}) {
  const pinned = items.filter((row) => row.pinned);
  const regular = items.filter((row) => !row.pinned);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full px-1 py-8 text-sm text-muted-foreground">
        Loading announcements…
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Announcements"
        subtitle={subtitle ?? `${items.length} published · Institute circulars and notices`}
      />

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <div
            className="mx-auto mb-3 grid size-12 place-items-center rounded-xl"
            style={ICON_STYLE}
          >
            <Megaphone className="size-6" />
          </div>
          <p className="font-medium">No announcements yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Published institute notices will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 ? (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pinned
              </h2>
              <div className="space-y-2">
                {pinned.map((row) => (
                  <AnnouncementRow key={row.id} row={row} pinned />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            {pinned.length > 0 ? (
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All
              </h2>
            ) : null}
            <div className="space-y-2">
              {regular.map((row) => (
                <AnnouncementRow key={row.id} row={row} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AnnouncementRow({ row, pinned = false }: { row: AnnouncementDto; pinned?: boolean }) {
  const when = relativeInboxTimeLabel(row.publishedAt ?? row.createdAt);
  const audience = audienceLabel(row);

  return (
    <Link
      to="/announcements/$id"
      params={{ id: row.id }}
      className={cn(
        "group flex min-w-0 items-stretch gap-0 overflow-hidden rounded-2xl border border-border bg-card motion-fast hover:bg-muted/20",
        pinned && "border-rose-200/80 dark:border-rose-900/50",
      )}
    >
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: pinned ? ACCENT.primary : "transparent" }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={ICON_STYLE}
        >
          <Megaphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {pinned ? (
              <Badge variant="secondary" className="gap-1 rounded-full text-[10px]">
                <Pin className="size-3" /> Pinned
              </Badge>
            ) : null}
            {audience ? (
              <Badge variant="outline" className="rounded-full text-[10px]">
                {audience}
              </Badge>
            ) : null}
            <span className="text-[11px] text-muted-foreground">{when}</span>
          </div>
          <h3 className="mt-1 font-semibold leading-snug group-hover:text-primary">
            {row.title}
          </h3>
          {(row.body ?? "").trim() ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.body}</p>
          ) : null}
        </div>
        <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      </div>
    </Link>
  );
}

export function AnnouncementDetailView({
  row,
  loading,
  error,
}: {
  row: AnnouncementDto | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <div className="min-w-0 max-w-full px-1 py-8 text-sm text-muted-foreground">
        Loading announcement…
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <p className="font-medium">{error ?? "Announcement not found"}</p>
        <Link to="/announcements" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to announcements
        </Link>
      </div>
    );
  }

  const when = relativeInboxTimeLabel(row.publishedAt ?? row.createdAt);
  const audience = audienceLabel(row);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title={row.title}
        subtitle={[audience, when].filter(Boolean).join(" · ")}
      />

      <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {row.pinned ? (
            <Badge variant="secondary" className="gap-1 rounded-full">
              <Pin className="size-3" /> Pinned
            </Badge>
          ) : null}
          <Badge variant="outline" className="rounded-full">
            Circular
          </Badge>
          {isApiViews(row) ? (
            <span className="text-xs text-muted-foreground">{row.views} views</span>
          ) : null}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground">
          {(row.body ?? row.title).trim()}
        </div>
      </article>

      <Link
        to="/announcements"
        className="mt-4 inline-flex text-sm text-primary hover:underline"
      >
        ← All announcements
      </Link>
    </div>
  );
}

function isApiViews(row: AnnouncementDto): boolean {
  return row.instituteId !== "demo" && row.views > 0;
}
