import type { CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, BookMarked, Bus, CalendarOff, ClipboardList, FileCheck2 } from "lucide-react";
import { Button, Pill } from "@lumenx/ui-admin";
import type {
  AttendanceDraftRow,
  DiaryWidgetRow,
  LeaveWidgetRow,
  MarksPendingRow,
} from "@/lib/dashboard";
import type { TransportEmergencyDto } from "@/lib/transport/types";
import { TransportPendingStopsActionCard } from "@/components/transport/TransportPendingStopsActionCard";

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
  leaveRows,
  leavePendingCount,
  attendanceDrafts,
  marksPending,
  transportEmergencies,
  transportInstituteId,
  transportWritesEnabled = true,
  onTransportNotify,
}: {
  diaryRows: DiaryWidgetRow[];
  diaryMissingYesterday: number;
  leaveRows: LeaveWidgetRow[];
  leavePendingCount: number;
  attendanceDrafts: AttendanceDraftRow[];
  marksPending: MarksPendingRow[];
  transportEmergencies: TransportEmergencyDto[];
  /** When set, show driver-stop accept actions on Home. */
  transportInstituteId?: string | null;
  transportWritesEnabled?: boolean;
  onTransportNotify?: (message: string) => void;
}) {
  const navigate = useNavigate();
  const showAttendance = attendanceDrafts.length > 0;
  const showMarks = marksPending.length > 0;
  const showTransport = transportEmergencies.length > 0;

  return (
    <div className="lx-home-ops-grid">
      {transportInstituteId ? (
        <div
          className="lx-home-section col-span-full"
          style={{ "--lx-home-i": 6.5 } as CSSProperties}
        >
          <TransportPendingStopsActionCard
            instituteId={transportInstituteId}
            writesEnabled={transportWritesEnabled}
            onNotify={onTransportNotify}
            hideWhenEmpty
            maxItems={4}
            onOpenReviews={() =>
              void navigate({ to: "/transport", search: { view: "reviews" } })
            }
          />
        </div>
      ) : null}
      <section
        className="lx-home-section lx-home-panel lx-home-panel--diary"
        style={{ "--lx-home-i": 7 } as CSSProperties}
      >
        <div className="lx-home-panel__head">
          <div className="lx-home-ops__title-row">
            <span className="lx-home-ops__icon lx-home-ops__icon--diary" aria-hidden>
              <BookMarked className="size-3.5" />
            </span>
            <h2 className="lx-home-panel__title">Diary submissions</h2>
          </div>
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
        {diaryRows.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 pb-1">
            No diary submissions yet. Teacher submissions appear here.
          </p>
        ) : (
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
        )}
      </section>

      <section
        className="lx-home-section lx-home-panel lx-home-panel--leave"
        style={{ "--lx-home-i": 7.5 } as CSSProperties}
      >
        <div className="lx-home-panel__head">
          <div className="lx-home-ops__title-row">
            <span className="lx-home-ops__icon lx-home-ops__icon--leave" aria-hidden>
              <CalendarOff className="size-3.5" />
            </span>
            <h2 className="lx-home-panel__title">Pending leave</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Pill tone={leavePendingCount > 0 ? "warning" : "neutral"}>
              {leavePendingCount} pending
            </Pill>
            <Link to="/leave">
              <Button size="sm" variant="outline" className="gap-1">
                Open <ArrowUpRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
        {leaveRows.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 pb-1">
            No pending leave requests. Teacher leave for approval appears here.
          </p>
        ) : (
          <ul className="lx-home-ops-list">
            {leaveRows.slice(0, 6).map((row) => (
              <li key={row.id} className="lx-home-ops-row">
                <CalendarOff className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium capitalize">
                    {row.leaveType} · {row.subjectKind}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {row.startDate} → {row.endDate}
                    {row.reason ? ` · ${row.reason}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAttendance ? (
        <section
          className="lx-home-section lx-home-panel lx-home-panel--attendance"
          style={{ "--lx-home-i": 8 } as CSSProperties}
        >
          <div className="lx-home-panel__head">
            <div className="lx-home-ops__title-row">
              <span className="lx-home-ops__icon lx-home-ops__icon--attendance" aria-hidden>
                <ClipboardList className="size-3.5" />
              </span>
              <h2 className="lx-home-panel__title">Attendance drafts</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Pill tone="warning">{attendanceDrafts.length}</Pill>
              <Link to="/student-attendance">
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
        <section
          className="lx-home-section lx-home-panel lx-home-panel--marks"
          style={{ "--lx-home-i": 9 } as CSSProperties}
        >
          <div className="lx-home-panel__head">
            <div className="lx-home-ops__title-row">
              <span className="lx-home-ops__icon lx-home-ops__icon--marks" aria-hidden>
                <FileCheck2 className="size-3.5" />
              </span>
              <h2 className="lx-home-panel__title">Pending mark reviews</h2>
            </div>
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
        <section
          className="lx-home-section lx-home-panel lx-home-panel--critical lx-home-panel--transport"
          style={{ "--lx-home-i": 10 } as CSSProperties}
        >
          <div className="lx-home-panel__head">
            <div className="lx-home-ops__title-row">
              <span className="lx-home-ops__icon lx-home-ops__icon--transport" aria-hidden>
                <Bus className="size-3.5" />
              </span>
              <h2 className="lx-home-panel__title">Transport emergencies</h2>
            </div>
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
