import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CascadingFiltersMenu,
  DataTable,
  Kpi,
  PageStack,
  Pill,
  SearchInput,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { CheckCircle2, Clock, UserX } from "lucide-react";
import { statusMeta } from "@/lib/teacher-attendance-data";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadStaffAttendanceDay,
  resolveStaffAttendanceDayView,
  shouldCommitStaffAttendanceLoad,
  type StaffAttendanceDaySummary,
  type StaffAttendanceLoadStatus,
} from "@/lib/staff-attendance";

function loadHint(status: StaffAttendanceLoadStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading teacher attendance…";
  if (status === "needs_institute") return "Select an institute to load teacher attendance.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to teacher attendance for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load teacher attendance.";
  if (status === "empty") return "No teacher attendance marks for this date.";
  return null;
}

function formatDisplayDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TeacherAttendanceApiPage() {
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<StaffAttendanceDaySummary | null>(null);
  const [loadStatus, setLoadStatus] = useState<StaffAttendanceLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [resolvedDate, setResolvedDate] = useState<string | null>(null);

  const dayView = resolveStaffAttendanceDayView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    requestDate: date,
    resolvedDate,
    storedSummary: summary,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = loadHint(dayView.status, dayView.errorMessage);

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setSummary(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      setResolvedDate(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadStaffAttendanceDay(requestInstituteId, date).then((next) => {
      if (
        !shouldCommitStaffAttendanceLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
          requestDate: date,
          activeDate: date,
        })
      ) {
        return;
      }
      setSummary(next.summary);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      setResolvedDate(date);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, date]);

  const filteredMarks = useMemo(() => {
    if (!dayView.summary) return [];
    const q = search.trim().toLowerCase();
    if (!q) return dayView.summary.marks;
    return dayView.summary.marks.filter((mark) =>
      `${mark.teacherName} ${mark.teacherId}`.toLowerCase().includes(q),
    );
  }, [dayView.summary, search]);

  return (
    <PageStack>
      <Pill tone="neutral">Read-only · API mode</Pill>

      {dayView.summary ? (
        <div className="lx-kpi-grid">
          <Kpi label="Present" value={String(dayView.summary.present)} tone="up" icon={<CheckCircle2 className="size-3.5" />} />
          <Kpi label="Late" value={String(dayView.summary.late)} icon={<Clock className="size-3.5" />} />
          <Kpi label="Absent" value={String(dayView.summary.absent)} tone="down" icon={<UserX className="size-3.5" />} />
          <Kpi label="Leave / half" value={String(dayView.summary.leave + dayView.summary.halfDay)} />
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={formatDisplayDate(date)}
          hint={
            dayView.summary
              ? `${dayView.summary.total} teachers · ${dayView.summary.dayStatus}`
              : hint ?? "Teacher attendance"
          }
          action={
            dayView.summary ? (
              <Pill tone={dayView.summary.dayStatus === "submitted" ? "success" : "warning"}>
                {dayView.summary.dayStatus}
              </Pill>
            ) : null
          }
        />

        <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 pb-3 sm:px-5">
          <CascadingFiltersMenu
            groups={[
              {
                id: "date",
                label: "Date",
                kind: "date",
                value: date,
                clearValues: [date],
                onChange: setDate,
              },
            ]}
          />
          <div className="min-w-[12rem] flex-1 sm:max-w-xs">
            <SearchInput
              placeholder="Search teacher…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-full"
              fieldSize="compact"
            />
          </div>
        </div>

        {!dayView.rowsValid ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-5">
            {hint ?? "Loading…"}
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-5">
            {hint ?? "No marks match your search."}
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Teacher</Th>
                <Th>Status</Th>
                <Th>Check in</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {filteredMarks.map((mark) => (
                <Tr key={mark.id}>
                  <Td>
                    <div className="font-medium">{mark.teacherName}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {mark.teacherId.slice(0, 8)}…
                    </div>
                  </Td>
                  <Td>
                    <Pill tone={statusMeta(mark.status).tone}>{statusMeta(mark.status).label}</Pill>
                  </Td>
                  <Td className="font-mono text-xs">{mark.checkIn ?? "—"}</Td>
                  <Td className="text-xs text-muted-foreground">{mark.note?.trim() || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </PageStack>
  );
}
