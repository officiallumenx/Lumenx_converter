import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, cn } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import {
  workspaceCalendarRepository,
  WORKSPACE_CALENDAR_CATEGORY_LABELS,
  WORKSPACE_CALENDAR_FILTER_ORDER,
  type WorkspaceCalendarCategory,
  type WorkspaceCalendarEntry,
} from "@/lib/activity/workspace-calendar";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import {
  ActivityEmptyState,
  ActivitySearchField,
  ActivityPageShell,
  ActivityFilterBar,
} from "../../shared/ui";
import { ActivityCalendarPreview } from "../dashboard/ActivityCalendarPreview";
import { ReminderFormDialog } from "./ReminderFormDialog";

function formatDayHeading(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Activity Calendar — sports, ECA, practice, school programmes, personal reminders.
 * Reminders are create / edit / delete only. No recurring or advanced scheduling.
 */
export function ActivityCalendarPage() {
  const entries = useSyncExternalStore(
    workspaceCalendarRepository.subscribe,
    workspaceCalendarRepository.getSnapshot,
    workspaceCalendarRepository.getSnapshot,
  );

  const [category, setCategory] = useState<WorkspaceCalendarCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceCalendarEntry | null>(null);

  const todayIso = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }, []);

  const filtered = useMemo(() => {
    let list = entries.slice();
    if (category !== "all") list = list.filter((e) => e.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false) ||
          (e.unitLabel?.toLowerCase().includes(q) ?? false),
      );
    }
    return list.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
  }, [entries, category, query]);

  const marks = useMemo(() => {
    const map = new Map<string, { date: string; count: number; highlight?: boolean }>();
    for (const e of filtered) {
      const cur = map.get(e.date);
      if (cur) {
        cur.count += 1;
        if (e.kind === "reminder") cur.highlight = true;
      } else {
        map.set(e.date, {
          date: e.date,
          count: 1,
          highlight: e.kind === "reminder",
        });
      }
    }
    return [...map.values()];
  }, [filtered]);

  const listEntries = useMemo(() => {
    if (selectedDate) return filtered.filter((e) => e.date === selectedDate);
    return filtered.filter((e) => e.date >= todayIso).slice(0, 12);
  }, [filtered, selectedDate, todayIso]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: WorkspaceCalendarEntry) => {
    if (entry.kind !== "reminder") return;
    setEditing(entry);
    setDialogOpen(true);
  };

  const saveReminder = async (data: {
    title: string;
    date: string;
    startTime: string;
    description: string;
  }) => {
    if (editing) {
      await workspaceCalendarRepository.updateReminder(editing.id, data);
      toast.success("Reminder updated");
    } else {
      await workspaceCalendarRepository.createReminder(data);
      await workspaceCommunicationRepository.pushFromActivity({
        title: "Reminder added",
        body: `“${data.title}” on ${data.date}${data.startTime ? ` at ${data.startTime}` : ""}.`,
        audienceLabel: "Calendar · My reminder",
      });
      toast.success("Reminder added");
    }
  };

  const removeReminder = async (entry: WorkspaceCalendarEntry) => {
    if (entry.kind !== "reminder") return;
    const ok = await workspaceCalendarRepository.deleteReminder(entry.id);
    if (ok) toast.success("Reminder deleted");
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Calendar"
        subtitle="Activity events owned by Activity Teacher · Institute events are managed in Admin."
        action={
          <Button
            type="button"
            className="activity-primary-action rounded-xl"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 size-4" aria-hidden />
            Reminder
          </Button>
        }
      />

      <ActivityFilterBar>
        {WORKSPACE_CALENDAR_FILTER_ORDER.map((key) => {
          const label = key === "all" ? "All" : WORKSPACE_CALENDAR_CATEGORY_LABELS[key];
          const active = category === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={cn("activity-filter-chip", active && "is-active")}
            >
              {label}
            </button>
          );
        })}
      </ActivityFilterBar>

      <ActivitySearchField
        value={query}
        onChange={setQuery}
        placeholder="Search calendar…"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="activity-panel">
          <ActivityCalendarPreview
            marks={marks}
            selectedDate={selectedDate}
            onSelectDate={(iso) =>
              setSelectedDate((prev) => (prev === iso ? null : iso))
            }
          />
          {selectedDate ? (
            <button
              type="button"
              className="activity-section-link mt-2 text-sm"
              onClick={() => setSelectedDate(null)}
            >
              Show upcoming instead
            </button>
          ) : null}
        </section>

        <section className="activity-panel space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">
              {selectedDate ? formatDayHeading(selectedDate) : "Upcoming"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {listEntries.length} item{listEntries.length === 1 ? "" : "s"}
            </span>
          </div>

          {listEntries.length === 0 ? (
            <ActivityEmptyState
              compact
              title={selectedDate ? "Nothing on this day" : "Nothing upcoming"}
              description={
                selectedDate
                  ? "Add a personal reminder, or pick another day."
                  : "Practice you assign and school programmes will show here."
              }
              action={
                <Button type="button" className="rounded-xl" onClick={openCreate}>
                  Add reminder
                </Button>
              }
              className="border-0 bg-transparent"
            />
          ) : (
            <ul className="space-y-2">
              {listEntries.map((e) => (
                <CalendarEntryRow
                  key={e.id}
                  entry={e}
                  onEdit={() => openEdit(e)}
                  onDelete={() => void removeReminder(e)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <ReminderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reminder={editing}
        defaultDate={selectedDate ?? todayIso}
        onSave={saveReminder}
      />
    </ActivityPageShell>
  );
}

function CalendarEntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: WorkspaceCalendarEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isReminder = entry.kind === "reminder";

  return (
    <li className="activity-list-row rounded-2xl border border-border bg-card p-3.5 shadow-soft">
      <div className="flex items-start gap-2.5">
        <span
          className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", entry.colorClass)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm leading-snug">{entry.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {!entry.date ? null : formatDayHeading(entry.date)}
                {entry.startTime ? ` · ${entry.startTime}` : ""}
                {entry.venue ? ` · ${entry.venue}` : ""}
                {entry.unitLabel ? ` · ${entry.unitLabel}` : ""}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {WORKSPACE_CALENDAR_CATEGORY_LABELS[entry.category]}
            </Badge>
          </div>
          {entry.description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {entry.description}
            </p>
          ) : null}
          {isReminder ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/5"
              >
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-muted-foreground">
              From {entry.sourceModule === "practice" ? "Practice" : "school schedule"} — view
              only
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
