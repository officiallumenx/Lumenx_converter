import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Kpi,
  Field,
  TextInput,
  Select,
  Modal,
} from "@lumenx/ui-admin";
import { DateTimePicker12h, parseDateTimeLocal, toDateTimeLocal } from "@/components/DateTimePicker12h";
import { useAdminToast } from "@/components/AdminActionToast";
import { ACADEMIC_YEAR } from "@/lib/admin-module-data";
import { workingDaysInYear } from "@/lib/admin-analytics-data";
import {
  createCalendarEventId,
  deleteCalendarEvent,
  filterAcademicCalendarItems,
  getCalendarEventById,
  upsertCalendarEvent,
  useCalendarEvents,
  type InstituteCalendarItem,
} from "@/lib/calendar-events-store";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadCalendarList,
  resolveCalendarListView,
  shouldCommitCalendarLoad,
  type CalendarListItem,
  type CalendarListStatus,
} from "@/lib/calendar";
import { Plus, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: adminPageTitle("/calendar") }] }),
  component: CalendarPage,
});

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

type CalKind = "holiday" | "exam" | "meeting" | "function";

const CAL_KINDS: CalKind[] = ["holiday", "exam", "meeting", "function"];

type CalDisplayItem = CalendarListItem | InstituteCalendarItem;

function toCalKind(kind: string): CalKind {
  return CAL_KINDS.includes(kind as CalKind) ? (kind as CalKind) : "function";
}

function monthShort(iso: string) {
  return new Date(iso).toLocaleString("en", { month: "short" });
}

function formatCalTime(time24?: string): string {
  if (!time24) return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(time24);
  if (!m) return time24;
  let h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
}

function CalendarPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = !apiMode;

  const [view, setView] = useState<"month" | "year">("year");
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[2]!);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const allItems = useCalendarEvents();
  const demoItems = useMemo(
    () => (apiMode ? [] : filterAcademicCalendarItems(allItems)),
    [allItems, apiMode],
  );

  const [apiItems, setApiItems] = useState<CalendarListItem[]>([]);
  const [listStatus, setListStatus] = useState<CalendarListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveCalendarListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: CalDisplayItem[] = apiMode ? listView.items : demoItems;
  const rowsValid = listView.rowsValid;

  const [newTitle, setNewTitle] = useState("");
  const [newDateTime, setNewDateTime] = useState("");
  const [newType, setNewType] = useState<CalKind>("holiday");

  const resetForm = () => {
    setNewTitle("");
    setNewDateTime("");
    setNewType("holiday");
    setEditingId(null);
  };

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadCalendarList(requestInstituteId).then((next) => {
      if (
        !shouldCommitCalendarLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  useEffect(() => {
    resetForm();
    setOpen(false);
  }, [instituteCtx.activeInstituteId]);

  const openEdit = (id: string) => {
    if (!writesEnabled) {
      notify("Calendar writes via API are not enabled in this cutover");
      return;
    }
    const item = getCalendarEventById(id);
    if (!item) return;
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewType(toCalKind(item.kind));
    setNewDateTime(toDateTimeLocal(item.date, item.time || "09:00"));
    setOpen(true);
  };

  const removeDate = (id: string) => {
    if (!writesEnabled) {
      notify("Calendar writes via API are not enabled in this cutover");
      return;
    }
    deleteCalendarEvent(id);
    if (editingId === id) resetForm();
  };

  const allDates = useMemo(
    () => [...displayItems].sort((a, b) => a.date.localeCompare(b.date)),
    [displayItems],
  );
  const monthDates = useMemo(
    () => allDates.filter((d) => monthShort(d.date) === selectedMonth),
    [allDates, selectedMonth],
  );

  const holidayCount = useMemo(
    () => displayItems.filter((d) => d.kind === "holiday").length,
    [displayItems],
  );
  const examCount = useMemo(
    () => displayItems.filter((d) => d.kind === "exam").length,
    [displayItems],
  );

  const saveDate = () => {
    if (!writesEnabled) {
      notify("Calendar writes via API are not enabled in this cutover");
      return;
    }
    if (!newTitle.trim() || !newDateTime) return;
    const { date, time } = parseDateTimeLocal(newDateTime);
    if (!date) return;
    const existing = editingId ? getCalendarEventById(editingId) : undefined;
    upsertCalendarEvent({
      id: editingId ?? createCalendarEventId("cal"),
      date,
      title: newTitle.trim(),
      kind: newType,
      time: newType === "holiday" ? undefined : time || undefined,
      endDate: existing?.endDate,
      audience: existing?.audience,
      location: existing?.location,
      description: existing?.description,
      reminder: existing?.reminder,
      bannerDataUrl: existing?.bannerDataUrl,
      rsvp: existing?.rsvp,
      published: existing?.published ?? true,
      source: existing?.source ?? "calendar",
    });
    resetForm();
    setOpen(false);
  };

  const listHint =
    listView.status === "loading"
      ? "Loading calendar…"
      : listView.status === "needs_institute"
        ? "Select an active institute to load calendar dates"
        : listView.status === "forbidden"
          ? "You do not have access to calendar dates for this institute"
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load calendar"
            : listView.status === "empty"
              ? "No important dates yet"
              : null;

  const kpiValue = (count: number) =>
    apiMode && !rowsValid ? "…" : String(count);

  const monthCountDisplay = (count: number) =>
    apiMode && !rowsValid ? "…" : count || "—";

  return (
    <AppShell
      title={M.calendar}
      subtitle={
        apiMode
          ? "API mode · read-only · Academic calendar dates"
          : `Session ${ACADEMIC_YEAR.label} · drives attendance holidays & exam windows`
      }
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="size-3.5" /> Add date
          </Button>
        ) : null
      }
    >
      <div className="lx-kpi-grid">
        <Kpi
          label="Academic year"
          value={ACADEMIC_YEAR.label}
          icon={<CalendarDays className="size-3.5" />}
        />
        <Kpi label="Holidays" value={kpiValue(holidayCount)} />
        <Kpi label="Exam windows" value={kpiValue(examCount)} />
        <Kpi
          label="Working days"
          value={kpiValue(workingDaysInYear(holidayCount))}
          delta="Est. year"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
        <div className="flex gap-1 p-1 w-fit bg-background rounded-md border border-border">
          {(["year", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 h-8 rounded text-[11px] font-medium capitalize transition-colors ${
                view === v ? "bg-surface text-foreground" : "text-muted-foreground"
              }`}
            >
              {v}ly view
            </button>
          ))}
        </div>
        {view === "month" && (
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-28 h-9 text-xs"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
      </div>

      {apiMode && !rowsValid ? (
        <Card className="p-5">
          <div className="py-12 text-sm text-muted-foreground text-center">
            {listHint}
          </div>
        </Card>
      ) : (
        <>
          {view === "year" && (
            <Card>
              <CardHeader
                title="Year at a glance"
                hint={ACADEMIC_YEAR.start + " → " + ACADEMIC_YEAR.end}
              />
              <div className="px-5 pb-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                {MONTHS.map((m) => {
                  const cnt = allDates.filter((d) => monthShort(d.date) === m).length;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedMonth(m);
                        setView("month");
                      }}
                      className="p-3 rounded-lg border border-border bg-background/40 text-center hover:bg-surface-hover transition-colors"
                    >
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">{m}</div>
                      <div className="text-xs font-medium mt-1">{monthCountDisplay(cnt)}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {view === "month" && (
            <Card>
              <CardHeader
                title={`${selectedMonth} — Important dates`}
                hint={`${monthDates.length} entries`}
              />
              {monthDates.length === 0 ? (
                <div className="px-5 pb-5 text-xs text-muted-foreground">
                  {listHint ?? `No dates in ${selectedMonth}`}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Time</th>
                        <th className="px-5 py-3 font-semibold">Title</th>
                        <th className="px-5 py-3 font-semibold">Type</th>
                        {writesEnabled ? (
                          <th className="px-5 py-3 font-semibold">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {monthDates.map((d) => (
                        <tr key={d.id} className="hover:bg-surface-hover">
                          <td className="px-5 py-3 text-xs font-mono">{d.date}</td>
                          <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                            {formatCalTime(d.time) || "—"}
                          </td>
                          <td className="px-5 py-3 text-xs font-medium">{d.title}</td>
                          <td className="px-5 py-3">
                            <Pill
                              tone={
                                d.kind === "holiday"
                                  ? "warning"
                                  : d.kind === "exam"
                                    ? "info"
                                    : d.kind === "meeting"
                                      ? "neutral"
                                      : "success"
                              }
                            >
                              {d.kind}
                            </Pill>
                          </td>
                          {writesEnabled ? (
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <Button onClick={() => openEdit(d.id)}>Edit</Button>
                                <Button onClick={() => removeDate(d.id)}>Delete</Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {view === "year" && (
            <Card className="mt-6">
              <CardHeader title="All important dates" />
              {allDates.length === 0 ? (
                <div className="px-5 pb-5 text-xs text-muted-foreground">
                  {listHint ?? "No important dates yet"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Time</th>
                        <th className="px-5 py-3 font-semibold">Title</th>
                        <th className="px-5 py-3 font-semibold">Type</th>
                        {writesEnabled ? (
                          <th className="px-5 py-3 font-semibold">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allDates.map((d) => (
                        <tr key={d.id} className="hover:bg-surface-hover">
                          <td className="px-5 py-3 text-xs font-mono">{d.date}</td>
                          <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                            {formatCalTime(d.time) || "—"}
                          </td>
                          <td className="px-5 py-3 text-xs font-medium">{d.title}</td>
                          <td className="px-5 py-3">
                            <Pill
                              tone={
                                d.kind === "holiday"
                                  ? "warning"
                                  : d.kind === "exam"
                                    ? "info"
                                    : "success"
                              }
                            >
                              {d.kind}
                            </Pill>
                          </td>
                          {writesEnabled ? (
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <Button onClick={() => openEdit(d.id)}>Edit</Button>
                                <Button onClick={() => removeDate(d.id)}>Delete</Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {writesEnabled ? (
        <Modal
          open={open}
          onClose={() => {
            resetForm();
            setOpen(false);
          }}
          title={editingId ? "Edit important date" : "Add important date"}
          footer={
            <>
              <Button
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={saveDate}>
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Title" required>
              <TextInput
                placeholder="Mid-term begins"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </Field>
            <Field label="Date & time" required hint="12-hour clock with AM / PM">
              <DateTimePicker12h value={newDateTime} onChange={setNewDateTime} />
            </Field>
            <Field label="Type">
              <Select
                value={newType}
                onChange={(e) => setNewType(e.target.value as CalKind)}
              >
                <option value="holiday">Holiday</option>
                <option value="exam">Exam</option>
                <option value="meeting">Meeting</option>
                <option value="function">Function</option>
              </Select>
            </Field>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}
