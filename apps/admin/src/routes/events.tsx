import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Modal,
  Field,
  TextInput,
  TextArea,
  Select,
} from "@lumenx/ui-admin";
import { DateTimePicker12h, parseDateTimeLocal, toDateTimeLocal } from "@/components/DateTimePicker12h";
import { ClassSectionAudienceField } from "@/components/ClassSectionMultiPicker";
import { Plus, CalendarDays, Users, MapPin, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import { examClassDisplayLabel } from "@/lib/exam-timetable-data";
import {
  createCalendarEventId,
  cancelCalendarEvent,
  deleteCalendarEvent,
  filterInstituteEventItems,
  formatEventWhen,
  getCalendarEventById,
  publishCalendarEvent,
  upsertCalendarEvent,
  useCalendarEvents,
  type InstituteCalendarItem,
} from "@/lib/calendar-events-store";
import {
  notifyEventPublished,
  notifyEventChanged,
  notifyEventCancelled,
} from "@lumenx/module-notifications";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  loadEventsList,
  publishEvent,
  resolveEventsListView,
  shouldCommitEventsLoad,
  updateEvent,
  type EventKind,
  type EventReminder,
  type EventsListItem,
  type EventsListStatus,
} from "@/lib/events";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: adminPageTitle("/events") }] }),
  component: EventsPage,
});

type EventPresetType = "holiday" | "meeting" | "exam" | "function";
type EventItem = EventsListItem;

const EVENT_TYPE_PRESETS: { value: EventPresetType; label: string }[] = [
  { value: "function", label: "Function" },
  { value: "meeting", label: "Meeting" },
  { value: "exam", label: "Exam" },
  { value: "holiday", label: "Holiday" },
];

function toEventItem(item: InstituteCalendarItem): EventItem {
  return {
    id: item.id,
    title: item.title,
    date: formatEventWhen(item),
    type: item.kind,
    audience: item.audience ?? "All",
    location: item.location ?? "TBD",
    description: item.description,
    reminder: item.reminder,
    bannerDataUrl: item.bannerDataUrl,
    rsvp: item.rsvp,
    published: item.published,
  };
}

const toneOf = (t: string) =>
  t === "exam"
    ? "warning"
    : t === "holiday"
      ? "info"
      : t === "meeting"
        ? "neutral"
        : "success";

const AUDIENCE_OPTIONS = ["All", "Students", "Parents", "Teachers", "Classes"] as const;
type AudienceOption = (typeof AUDIENCE_OPTIONS)[number];

function formatEventTypeLabel(type: string): string {
  if (!type) return type;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function EventsPage() {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });

  const allCalendarItems = useCalendarEvents();
  const calendarItems = useMemo(
    () => (apiMode ? [] : filterInstituteEventItems(allCalendarItems)),
    [allCalendarItems, apiMode],
  );
  const demoEvents = useMemo(
    () => calendarItems.map(toEventItem),
    [calendarItems],
  );

  const [apiItems, setApiItems] = useState<EventsListItem[]>([]);
  const [listStatus, setListStatus] = useState<EventsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveEventsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: EventItem[] = apiMode ? listView.items : demoEvents;
  const displayStatus = listView.status;
  const displayError = listView.errorMessage;

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
    void loadEventsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitEventsLoad({
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
    reloadKey,
  ]);

  const listHint =
    displayStatus === "loading"
      ? "Loading events…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load events"
        : displayStatus === "forbidden"
          ? "You do not have access to events for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load events"
            : displayStatus === "empty"
              ? "No admin-owned institute events yet"
              : null;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  /** "" | preset | "custom" */
  const [newTypeChoice, setNewTypeChoice] = useState("");
  const [customType, setCustomType] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [audience, setAudience] = useState<AudienceOption>("All");
  const [classScope, setClassScope] = useState<"all" | "selected">("selected");
  const [classSectionKeys, setClassSectionKeys] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newReminder, setNewReminder] = useState("1 day before");
  const [bannerMode, setBannerMode] = useState("Auto-generate");
  const [bannerDataUrl, setBannerDataUrl] = useState("");

  const resolvedType =
    newTypeChoice === "custom"
      ? customType.trim()
      : newTypeChoice.trim();
  const classesValid =
    audience !== "Classes" || classScope === "all" || classSectionKeys.length > 0;
  const canSchedule = Boolean(newTitle.trim() && resolvedType && newStart && classesValid);

  const audienceLabel = () => {
    if (audience !== "Classes") return audience;
    if (classScope === "all") return "Classes · All";
    return `Classes · ${examClassDisplayLabel("selected", classSectionKeys)}`;
  };

  const resetForm = () => {
    setNewTitle("");
    setNewTypeChoice("");
    setCustomType("");
    setNewLocation("");
    setNewDescription("");
    setNewReminder("1 day before");
    setBannerMode("Auto-generate");
    setBannerDataUrl("");
    setNewStart("");
    setNewEnd("");
    setAudience("All");
    setClassScope("selected");
    setClassSectionKeys([]);
    setEditingId(null);
  };

  const mapReminder = (label: string): EventReminder => {
    if (label === "1 hour before") return "one_hour";
    if (label === "1 week + 1 day") return "one_week_one_day";
    if (label === "No reminder") return "none";
    return "one_day";
  };

  const mapEventKind = (raw: string): { kind: EventKind; customKindLabel?: string | null } => {
    if (
      raw === "holiday" ||
      raw === "exam" ||
      raw === "meeting" ||
      raw === "function"
    ) {
      return { kind: raw };
    }
    return { kind: "custom", customKindLabel: raw };
  };

  const openEdit = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      const item = displayItems.find((e) => e.id === id);
      if (!item) return;
      setEditingId(item.id);
      setNewTitle(item.title);
      const preset = EVENT_TYPE_PRESETS.some((opt) => opt.value === item.type);
      if (preset) {
        setNewTypeChoice(item.type);
        setCustomType("");
      } else {
        setNewTypeChoice("custom");
        setCustomType(item.type);
      }
      setNewLocation(item.location && item.location !== "—" ? item.location : "");
      setNewDescription(item.description ?? "");
      setNewReminder(item.reminder ?? "1 day before");
      setBannerDataUrl(item.bannerDataUrl ?? "");
      setAudience("All");
      setOpen(true);
      return;
    }
    const item = getCalendarEventById(id);
    if (!item) return;
    setEditingId(item.id);
    setNewTitle(item.title);
    const preset = EVENT_TYPE_PRESETS.some((opt) => opt.value === item.kind);
    if (preset) {
      setNewTypeChoice(item.kind);
      setCustomType("");
    } else {
      setNewTypeChoice("custom");
      setCustomType(item.kind);
    }
    setNewStart(toDateTimeLocal(item.date, item.time || "09:00"));
    setNewEnd(item.endDate ? toDateTimeLocal(item.endDate, "17:00") : "");
    setNewLocation(item.location && item.location !== "—" ? item.location : "");
    setNewDescription(item.description ?? "");
    setNewReminder(item.reminder ?? "1 day before");
    setBannerDataUrl(item.bannerDataUrl ?? "");
    setAudience("All");
    setOpen(true);
  };

  const schedule = () => {
    if (!writesEnabled || !canSchedule) return;
    const { date, time } = parseDateTimeLocal(newStart);
    if (!date) return;
    const endParsed = newEnd.trim() ? parseDateTimeLocal(newEnd) : null;
    const endDate = endParsed?.date && endParsed.date !== date ? endParsed.date : undefined;
    const title = newTitle.trim();
    const { kind, customKindLabel } = mapEventKind(resolvedType);

    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute before scheduling an event");
        return;
      }
      const audienceScope =
        audience === "Students"
          ? "students"
          : audience === "Parents"
            ? "parents"
            : audience === "Teachers"
              ? "teachers"
              : audience === "Classes"
                ? "classes"
                : "all";
      const payload = {
        title,
        kind,
        customKindLabel: customKindLabel ?? null,
        startsOn: date,
        endsOn: endDate ?? null,
        startTime: time || null,
        audienceScope: audienceScope as
          | "all"
          | "students"
          | "parents"
          | "teachers"
          | "classes",
        audienceLabel: audienceLabel(),
        location: newLocation.trim() || null,
        description: newDescription.trim() || null,
        reminder: mapReminder(newReminder),
      };
      const done = () => {
        resetForm();
        setOpen(false);
        setReloadKey((k) => k + 1);
      };
      if (editingId) {
        void updateEvent(editingId, payload)
          .then(() => {
            done();
            notify(`Event "${title}" updated`);
          })
          .catch((err) => {
            notify(err instanceof Error ? err.message : "Failed to update event");
          });
        return;
      }
      void createEvent({
        instituteId,
        source: "events",
        published: false,
        ...payload,
      })
        .then(() => {
          done();
          notify(`Event "${title}" scheduled`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to schedule event");
        });
      return;
    }

    const existing = editingId ? getCalendarEventById(editingId) : undefined;
    const nextItem: InstituteCalendarItem = {
      id: editingId ?? createCalendarEventId("evt"),
      title,
      date,
      endDate,
      time: time || undefined,
      kind: resolvedType,
      audience: audienceLabel(),
      location: newLocation.trim() || "TBD",
      description: newDescription.trim() || undefined,
      reminder: newReminder,
      bannerDataUrl: bannerDataUrl || undefined,
      rsvp: existing?.rsvp,
      published: existing?.published ?? false,
      source: existing?.source ?? "events",
      attachmentName: existing?.attachmentName,
      attachmentDataUrl: existing?.attachmentDataUrl,
      registrationRequired: existing?.registrationRequired,
      recurrence: existing?.recurrence,
      cancelled: false,
      cancellationReason: undefined,
    };
    upsertCalendarEvent(nextItem);
    const wasEdit = Boolean(editingId);
    if (wasEdit && existing?.published) {
      const changes: string[] = [];
      if (existing.date !== nextItem.date || existing.time !== nextItem.time) changes.push("schedule");
      if (existing.location !== nextItem.location) changes.push("venue");
      if (existing.title !== nextItem.title) changes.push("title");
      if (existing.description !== nextItem.description) changes.push("details");
      notifyEventChanged({
        eventId: nextItem.id,
        title,
        when: formatEventWhen(nextItem),
        venue: nextItem.location,
        changeSummary: changes.length ? changes.join(", ") + " updated" : "Event details updated",
        audienceLabel: nextItem.audience,
      });
    }
    resetForm();
    setOpen(false);
    notify(wasEdit ? `Event "${title}" updated` : `Event "${title}" scheduled`);
  };

  const publish = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      void publishEvent(id)
        .then(() => {
          setReloadKey((k) => k + 1);
          notify("Event published to all portals");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to publish event");
        });
      return;
    }
    publishCalendarEvent(id);
    const item = getCalendarEventById(id);
    if (item) {
      notifyEventPublished({
        eventId: item.id,
        title: item.title,
        when: formatEventWhen(item),
        venue: item.location,
        description: item.description,
        category: item.kind,
        audienceLabel: item.audience,
      });
    }
    notify("Event published to all portals");
  };

  const removeEvent = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      const item = displayItems.find((e) => e.id === id);
      if (item?.published) {
        const reason = window.prompt("Cancellation reason (shown to recipients):", "") ?? "";
        void cancelEvent(id, { cancellationReason: reason })
          .then(() => {
            setReloadKey((k) => k + 1);
            notify("Event cancelled — recipients notified");
          })
          .catch((err) => {
            notify(err instanceof Error ? err.message : "Failed to cancel event");
          });
      } else {
        void deleteEvent(id)
          .then(() => {
            setReloadKey((k) => k + 1);
            notify("Event removed");
          })
          .catch((err) => {
            notify(err instanceof Error ? err.message : "Failed to delete event");
          });
      }
      if (editingId === id) {
        resetForm();
        setOpen(false);
      }
      return;
    }
    const item = getCalendarEventById(id);
    if (item?.published) {
      const reason = window.prompt("Cancellation reason (shown to recipients):", "") ?? "";
      cancelCalendarEvent(id, reason);
      notifyEventCancelled({
        eventId: item.id,
        title: item.title,
        cancellationReason: reason,
        audienceLabel: item.audience,
      });
      notify("Event cancelled — recipients notified");
    } else {
      deleteCalendarEvent(id);
      notify("Event removed");
    }
    if (editingId === id) {
      resetForm();
      setOpen(false);
    }
  };

  return (
    <AppShell
      title={M.events}
      subtitle={
        apiMode
          ? "API mode · create / publish / cancel via events API"
          : "Institute events owned by Admin · Activity events stay with Activity Teacher"
      }
      actions={
        <>
          <Button onClick={() => void navigate({ to: "/calendar" })}>Calendar view</Button>
          {writesEnabled ? (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              <Plus className="size-3.5" /> New Event
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {apiMode && !listView.rowsValid ? (
            <Card className="p-5">
              <div className="py-12 text-sm text-muted-foreground text-center">
                {listHint}
              </div>
            </Card>
          ) : displayItems.length === 0 ? (
            <Card className="p-5">
              <div className="py-12 text-sm text-muted-foreground text-center">
                {apiMode
                  ? listHint ?? "No admin-owned institute events yet"
                  : "No institute events yet — create one to get started"}
              </div>
            </Card>
          ) : (
            displayItems.map((e) => (
              <Card key={e.id} className="p-5 hover:bg-surface-hover transition-colors">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex gap-4">
                    <div className="size-12 rounded-md bg-accent border border-border flex flex-col items-center justify-center text-center">
                      <CalendarDays className="size-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold tracking-tight">{e.title}</h3>
                        <Pill tone={toneOf(e.type)}>{formatEventTypeLabel(e.type)}</Pill>
                        {!e.published && <Pill tone="warning">Draft</Pill>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {e.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" />
                          {e.audience}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {e.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  {writesEnabled ? (
                    <div className="flex gap-2">
                      {typeof e.rsvp === "number" && (
                        <div className="px-3 h-9 rounded-md bg-background border border-border text-[11px] font-mono flex items-center">
                          {e.rsvp.toLocaleString()} RSVPs
                        </div>
                      )}
                      <Button onClick={() => openEdit(e.id)}>Edit</Button>
                      <Button onClick={() => removeEvent(e.id)}>Delete</Button>
                      <Button variant="primary" disabled={e.published} onClick={() => publish(e.id)}>
                        Publish
                      </Button>
                    </div>
                  ) : typeof e.rsvp === "number" ? (
                    <div className="px-3 h-9 rounded-md bg-background border border-border text-[11px] font-mono flex items-center">
                      {e.rsvp.toLocaleString()} RSVPs
                    </div>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming this month" hint="Auto-rolling 30-day window" />
            <div className="px-5 pb-5 space-y-3">
              {[
                {
                  l: "Holidays",
                  n: displayItems.filter((e) => e.type === "holiday").length,
                  tone: "info" as const,
                },
                {
                  l: "Meetings",
                  n: displayItems.filter((e) => e.type === "meeting").length,
                  tone: "neutral" as const,
                },
                {
                  l: "Exams",
                  n: displayItems.filter((e) => e.type === "exam").length,
                  tone: "warning" as const,
                },
                {
                  l: "Functions",
                  n: displayItems.filter((e) => e.type === "function").length,
                  tone: "success" as const,
                },
                {
                  l: "Custom",
                  n: displayItems.filter(
                    (e) => !["holiday", "meeting", "exam", "function"].includes(e.type),
                  ).length,
                  tone: "neutral" as const,
                },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between text-xs">
                  <Pill tone={r.tone}>{r.l}</Pill>
                  <span className="font-mono">{r.n}</span>
                </div>
              ))}
            </div>
          </Card>
          {!apiMode ? (
            <Card>
              <CardHeader title="Audience reach" hint="Last broadcast cycle" />
              <div className="px-5 pb-5 space-y-3 text-xs">
                {[
                  { l: "Students notified", v: "2,842" },
                  { l: "Parents notified", v: "2,104" },
                  { l: "Teachers notified", v: "186" },
                ].map((r) => (
                  <div key={r.l} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{r.l}</span>
                    <span className="font-mono font-medium">{r.v}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {writesEnabled ? (
        <Modal
          open={open}
          onClose={() => {
            resetForm();
            setOpen(false);
          }}
          title={editingId ? "Edit event" : "Create event"}
          subtitle="Configure schedule, audience and reminders"
          size="lg"
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
              <Button variant="primary" onClick={schedule} disabled={!canSchedule}>
                {editingId ? "Save" : "Schedule"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title" required>
              <TextInput
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Founders' Day"
              />
            </Field>
            <Field label="Event type" required>
              <Select
                value={newTypeChoice}
                onChange={(e) => {
                  setNewTypeChoice(e.target.value);
                  if (e.target.value !== "custom") setCustomType("");
                }}
              >
                <option value="" disabled>
                  Select event type
                </option>
                {EVENT_TYPE_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </Select>
            </Field>
            {newTypeChoice === "custom" ? (
              <div className="sm:col-span-2">
                <Field label="Custom event type" required hint="e.g. Workshop, Field trip, Orientation">
                  <TextInput
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Enter custom event type"
                    autoFocus
                  />
                </Field>
              </div>
            ) : null}
            <Field label="Start date and time" required hint="12-hour clock with AM / PM">
              <DateTimePicker12h value={newStart} onChange={setNewStart} />
            </Field>
            <Field label="End date and time" hint="12-hour clock with AM / PM">
              <DateTimePicker12h
                value={newEnd}
                onChange={setNewEnd}
                min={newStart || undefined}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Audience" required>
                <Select
                  value={audience}
                  onChange={(e) => {
                    const next = e.target.value as AudienceOption;
                    setAudience(next);
                    if (next !== "Classes") {
                      setClassSectionKeys([]);
                      setClassScope("selected");
                    }
                  }}
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {audience === "Classes" ? (
              <div className="sm:col-span-2">
                <ClassSectionAudienceField
                  scope={classScope}
                  selectedKeys={classSectionKeys}
                  onScopeChange={setClassScope}
                  onSelectedKeysChange={setClassSectionKeys}
                  required
                  hint="Select one or more classes and sections"
                />
              </div>
            ) : null}
            <Field label="Location">
              <TextInput
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Auditorium A"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <TextArea
                  placeholder="Details, agenda, attire…"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Reminder">
              <Select value={newReminder} onChange={(e) => setNewReminder(e.target.value)}>
                <option>1 day before</option>
                <option>1 hour before</option>
                <option>1 week + 1 day</option>
                <option>No reminder</option>
              </Select>
            </Field>
            <Field label="Banner">
              <Select
                value={bannerMode}
                onChange={(e) => {
                  setBannerMode(e.target.value);
                  if (e.target.value !== "Upload custom") setBannerDataUrl("");
                }}
              >
                <option>Auto-generate</option>
                <option>Upload custom</option>
                <option>No banner</option>
              </Select>
              {bannerMode === "Upload custom" ? (
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setBannerDataUrl(String(reader.result ?? ""));
                    reader.readAsDataURL(file);
                  }}
                />
              ) : null}
            </Field>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}
