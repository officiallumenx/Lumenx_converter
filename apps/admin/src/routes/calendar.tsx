import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCalendarListQuery, adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import {
  Button,
  Kpi,
  Field,
  TextInput,
  TextArea,
  Select,
  Modal,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { ACADEMIC_YEAR } from "@/lib/admin-module-data";
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
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  createEvent,
  cancelEvent,
  deleteEvent,
  resolveCalendarListView,
  updateEvent,
  type CalendarListItem,
  type CalendarListStatus,
} from "@/lib/calendar";
import { CalendarYearGrid } from "@/components/calendar/CalendarYearGrid";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import {
  kindToUiCategory,
  uiCategoryToKind,
  type CalendarUiCategory,
  type CalendarViewItem,
} from "@/components/calendar/calendar-view-helpers";
import {
  generateRuleHolidays,
  useCalendarHolidayRules,
} from "@/lib/calendar-holiday-rules";
import { Plus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: adminPageTitle("/calendar") }] }),
  component: CalendarPage,
});

type CalDisplayItem = CalendarListItem | InstituteCalendarItem;

function toViewItem(item: CalDisplayItem): CalendarViewItem {
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    time: item.time,
    endTime: item.endTime,
    kind: item.kind,
    description: item.description,
  };
}

function normalizeTimeInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!m) return undefined;
  return `${m[1]!.padStart(2, "0")}:${m[2]}`;
}

function CalendarPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const now = new Date();
  const [view, setView] = useState<"month" | "year">("year");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const calendarQuery = useCalendarListQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );
  const bumpCalendarReload = () => {
    invalidateAdminCache("admin:calendar");
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(
          instituteCtx.activeInstituteId,
          adminQueryRoots.calendar,
        ),
      });
    }
  };
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveCalendarListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus:
      calendarQuery.isLoading && !calendarQuery.data ? "loading" : listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: CalDisplayItem[] = apiMode ? listView.items : demoItems;
  const rowsValid = listView.rowsValid;
  const holidayRules = useCalendarHolidayRules();
  const displayYear = view === "year" ? viewYear : monthYear;
  const viewItems = useMemo(() => {
    const entries = displayItems.map(toViewItem);
    const generated = generateRuleHolidays(displayYear, holidayRules, entries);
    return [...entries, ...generated];
  }, [displayItems, displayYear, holidayRules]);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState<CalendarUiCategory>("holiday");
  const [newDescription, setNewDescription] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  const resetForm = () => {
    setNewTitle("");
    setNewDate("");
    setNewCategory("holiday");
    setNewDescription("");
    setNewStartTime("");
    setNewEndTime("");
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

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setApiItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
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

    if (calendarQuery.isLoading && !calendarQuery.data) {
      setListStatus("loading");
      setListError(null);
      return;
    }
    if (!calendarQuery.data) return;

    const next = calendarQuery.data;
    setApiItems(next.items);
    setListStatus(next.status);
    setListError(next.errorMessage);
    setResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    calendarQuery.data,
    calendarQuery.isLoading,
  ]);

  useEffect(() => {
    resetForm();
    setOpen(false);
    setSelectedDate(null);
  }, [instituteCtx.activeInstituteId]);

  const openCreateForDate = (iso: string) => {
    if (!writesEnabled) {
      setSelectedDate(iso);
      return;
    }
    resetForm();
    setSelectedDate(iso);
    setNewDate(iso);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    if (!writesEnabled) return;
    const item = displayItems.find((d) => d.id === id);
    if (!item) return;
    const demo = !apiMode ? getCalendarEventById(id) : undefined;
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewDate(item.date);
    setNewCategory(kindToUiCategory(item.kind));
    setNewDescription(item.description ?? demo?.description ?? "");
    setNewStartTime((item.time ?? demo?.time ?? "").slice(0, 5));
    setNewEndTime((item.endTime ?? demo?.endTime ?? "").slice(0, 5));
    setSelectedDate(item.date);
    setOpen(true);
  };

  const removeDate = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      void cancelEvent(id, { cancellationReason: "Removed from calendar" })
        .then(() => deleteEvent(id))
        .then(() => {
          if (editingId === id) resetForm();
          bumpCalendarReload();
          notify("Calendar date removed");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to remove date");
        });
      return;
    }
    deleteCalendarEvent(id);
    if (editingId === id) resetForm();
    notify("Calendar date removed");
  };

  const holidayCount = useMemo(
    () => new Set(viewItems.filter((d) => d.kind === "holiday").map((d) => d.date)).size,
    [viewItems],
  );
  const eventCount = useMemo(
    () => viewItems.filter((d) => d.kind !== "holiday").length,
    [viewItems],
  );
  const daysInYear =
    displayYear % 400 === 0 || (displayYear % 4 === 0 && displayYear % 100 !== 0)
      ? 366
      : 365;
  const workingDays = Math.max(0, daysInYear - holidayCount);

  const saveDate = () => {
    if (!writesEnabled) return;
    if (!newTitle.trim() || !newDate) {
      notify("Title and date are required");
      return;
    }
    const kind = uiCategoryToKind(newCategory);
    const startTime =
      kind === "holiday" ? undefined : normalizeTimeInput(newStartTime);
    const endTime =
      kind === "holiday" ? undefined : normalizeTimeInput(newEndTime);
    const description = newDescription.trim() || undefined;

    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute before saving a calendar date");
        return;
      }
      const done = () => {
        resetForm();
        setOpen(false);
        bumpCalendarReload();
      };
      if (editingId) {
        void updateEvent(editingId, {
          title: newTitle.trim(),
          kind,
          startsOn: newDate,
          startTime: startTime ?? null,
          endTime: endTime ?? null,
          description: description ?? null,
          source: "calendar",
        })
          .then(() => {
            done();
            notify("Calendar date updated");
          })
          .catch((err) => {
            notify(err instanceof Error ? err.message : "Failed to update date");
          });
        return;
      }
      void createEvent({
        instituteId,
        title: newTitle.trim(),
        kind,
        source: "calendar",
        startsOn: newDate,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        description: description ?? null,
        published: true,
      })
        .then(() => {
          done();
          notify("Calendar date added");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to add date");
        });
      return;
    }

    const existing = editingId ? getCalendarEventById(editingId) : undefined;
    upsertCalendarEvent({
      id: editingId ?? createCalendarEventId("cal"),
      date: newDate,
      title: newTitle.trim(),
      kind,
      time: startTime,
      endTime,
      endDate: existing?.endDate,
      audience: existing?.audience,
      location: existing?.location,
      description,
      reminder: existing?.reminder,
      bannerDataUrl: existing?.bannerDataUrl,
      rsvp: existing?.rsvp,
      published: existing?.published ?? true,
      source: existing?.source ?? "calendar",
    });
    resetForm();
    setOpen(false);
    notify(editingId ? "Calendar date updated" : "Calendar date added");
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

  return (
    <AppShell
      title={M.calendar}
      subtitle={
        apiMode
          ? "Year & month calendar · holidays and events"
          : `Session ${ACADEMIC_YEAR.label} · holidays & events`
      }
      actions={
        writesEnabled ? (
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              const d = new Date();
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              setNewDate(selectedDate ?? iso);
              setOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add date
          </Button>
        ) : null
      }
    >
      <ModuleHero
        compact
        eyebrow="Institute"
        title={M.calendar}
        subtitle="Year view for next events · month grid to add holidays and events"
      />

      <div className="lx-kpi-grid">
        <Kpi
          label="Calendar year"
          value={String(view === "year" ? viewYear : monthYear)}
          icon={<CalendarDays className="size-3.5" />}
        />
        <Kpi label="Holidays" value={kpiValue(holidayCount)} />
        <Kpi label="Events" value={kpiValue(eventCount)} />
        <Kpi
          label="Working days"
          value={kpiValue(workingDays)}
          delta={String(displayYear)}
        />
      </div>

      <div className="mt-4 mb-3 flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-md border border-border bg-background p-1">
          {(["year", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`h-8 rounded px-4 text-[11px] font-medium capitalize transition-colors ${
                view === v ? "bg-surface text-foreground" : "text-muted-foreground"
              }`}
            >
              {v}ly view
            </button>
          ))}
        </div>

        {view === "year" ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[3.5rem] text-center text-xs font-semibold tabular-nums">
              {viewYear}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {apiMode && !rowsValid ? (
        <div className="rounded-lg border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          {listHint}
        </div>
      ) : (
        <>
          {view === "year" ? (
            <CalendarYearGrid
              year={viewYear}
              items={viewItems}
              loadingPlaceholder={apiMode && !rowsValid}
              onSelectMonth={(year, month) => {
                setMonthYear(year);
                setMonthIndex(month);
                setSelectedDate(null);
                setView("month");
              }}
            />
          ) : null}

          {view === "month" ? (
            <CalendarMonthGrid
              year={monthYear}
              monthIndex={monthIndex}
              items={viewItems}
              selectedDate={selectedDate}
              writesEnabled={writesEnabled}
              holidayRules={holidayRules}
              onHolidayNotify={notify}
              onChangeMonth={(year, month) => {
                setMonthYear(year);
                setMonthIndex(month);
                setSelectedDate(null);
              }}
              onSelectDate={(iso) => {
                setSelectedDate(iso);
                const hasNamed = viewItems.some(
                  (item) => item.date === iso && item.source !== "rule",
                );
                if (writesEnabled && !hasNamed && !viewItems.some((item) => item.date === iso)) {
                  openCreateForDate(iso);
                }
              }}
              onAddForDate={openCreateForDate}
              onEditItem={openEdit}
            />
          ) : null}
        </>
      )}

      {writesEnabled ? (
        <Modal
          open={open}
          onClose={() => {
            resetForm();
            setOpen(false);
          }}
          title={editingId ? "Edit calendar entry" : "Add calendar entry"}
          footer={
            <>
              {editingId ? (
                <Button
                  onClick={() => {
                    removeDate(editingId);
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Delete
                </Button>
              ) : null}
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
                placeholder="Diwali holiday / Sports day"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </Field>
            <Field label="Date" required>
              <TextInput
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </Field>
            <Field label="Category" required hint="Holiday or event">
              <Select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as CalendarUiCategory)
                }
              >
                <option value="holiday">Holiday</option>
                <option value="event">Event</option>
              </Select>
            </Field>
            <Field label="Description" hint="Optional notes">
              <TextArea
                rows={3}
                placeholder="Details for staff and families"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </Field>
            {newCategory === "event" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="From" hint="Optional">
                  <TextInput
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                </Field>
                <Field label="To" hint="Optional">
                  <TextInput
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}
