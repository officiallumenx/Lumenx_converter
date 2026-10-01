import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookMarked, Bus, ClipboardList, FileCheck2 } from "lucide-react";
import { Button, Pill } from "@lumenx/ui-admin";
import type {
  AttendanceDraftRow,
  DiaryWidgetRow,
  MarksPendingRow,
} from "@/lib/dashboard";
import type { TransportEmergencyDto } from "@/lib/transport/types";

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HomeOperationalLists({
  diaryRows,
  diaryMissingYesterday,
  attendanceDrafts,
  marksPending,
  transportEmergencies,
}: {
  diaryRows: DiaryWidgetRow[];
  diaryMissingYesterday: number;
  attendanceDrafts: AttendanceDraftRow[];
  marksPending: MarksPendingRow[];
  transportEmergencies: TransportEmergencyDto[];
}) {
  // Detail list only when there are submissions — missing-yesterday is covered by Needs Attention.
  const showDiary = diaryRows.length > 0;
  const showAttendance = attendanceDrafts.length > 0;
  const showMarks = marksPending.length > 0;
  const showTransport = transportEmergencies.length > 0;

  if (!showDiary && !showAttendance && !showMarks && !showTransport) {
    return null;
  }

  return (
    <div className="lx-home-ops-grid">
      {showDiary ? (
        <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 7 } as CSSProperties}>
          <div className="lx-home-panel__head">
            <h2 className="lx-home-panel__title">Diary submissions</h2>
            <div className="flex items-center gap-1.5">
              {diaryMissingYesterday > 0 ? (
                <Pill tone="warning">{diaryMissingYesterday} missing</Pill>
              ) : null}
              <Pill tone="info">{diaryRows.length}</Pill>
              <Link to="/diary">
                <Button size="sm" variant="outline" className="gap-1">
                  Open <ArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <ul className="lx-home-ops-list">
            {diaryRows.slice(0, 6).map((row) => (
              <li key={row.id} className="lx-home-ops-row">
                <BookMarked className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{row.diaryDate}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {row.scope} · {row.rowCount} entr{row.rowCount === 1 ? "y" : "ies"} ·{" "}
                    {formatSubmittedAt(row.submittedAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showAttendance ? (
        <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 8 } as CSSProperties}>
          <div className="lx-home-panel__head">
            <h2 className="lx-home-panel__title">Attendance drafts</h2>
            <div className="flex items-center gap-1.5">
              <Pill tone="warning">{attendanceDrafts.length}</Pill>
              <Link to="/attendance">
                <Button size="sm" variant="outline" className="gap-1">
                  Open <ArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <ul className="lx-home-ops-list">
            {attendanceDrafts.slice(0, 6).map((row) => (
              <li key={row.id} className="lx-home-ops-row">
                <ClipboardList className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{row.slotLabel}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {row.attendanceDate} · section {row.sectionId.slice(0, 8)}…
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showMarks ? (
        <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 9 } as CSSProperties}>
          <div className="lx-home-panel__head">
            <h2 className="lx-home-panel__title">Pending mark reviews</h2>
            <div className="flex items-center gap-1.5">
              <Pill tone="warning">{marksPending.length}</Pill>
              <Link to="/marks">
                <Button size="sm" variant="outline" className="gap-1">
                  Open <ArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <ul className="lx-home-ops-list">
            {marksPending.slice(0, 6).map((row) => (
              <li key={row.id} className="lx-home-ops-row">
                <FileCheck2 className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Entry {row.id.slice(0, 8)}…</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Submitted {formatSubmittedAt(row.submittedAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showTransport ? (
        <section className="lx-home-section lx-home-panel lx-home-panel--critical" style={{ "--lx-home-i": 10 } as CSSProperties}>
          <div className="lx-home-panel__head">
            <h2 className="lx-home-panel__title">Transport emergencies</h2>
            <Pill tone="danger">{transportEmergencies.length} active</Pill>
          </div>
          <ul className="lx-home-ops-list">
            {transportEmergencies.slice(0, 6).map((row) => (
              <li key={row.id} className="lx-home-ops-row">
                <Bus className="size-3.5 text-destructive shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {row.routeName?.trim() || row.vehicleNumber?.trim() || "Emergency"}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {row.driverName?.trim() || "Driver"} · {row.status}
                  </span>
                </span>
                <Link to="/transport" search={{ view: "emergencies" }}>
                  <Button size="sm" variant="outline">
                    Open
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
