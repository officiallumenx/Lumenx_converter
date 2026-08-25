import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  cn,
} from "@lumenx/ui";
import type { WorkspaceCalendarEntry } from "@/lib/activity/workspace-calendar";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: WorkspaceCalendarEntry | null;
  defaultDate?: string;
  onSave: (data: {
    title: string;
    date: string;
    startTime: string;
    description: string;
  }) => void | Promise<void>;
};

function parseTime24(value: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  let h24 = 9;
  let minute = 0;
  if (m) {
    h24 = Math.min(23, Math.max(0, Number(m[1])));
    minute = Math.min(59, Math.max(0, Number(m[2])));
  }
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

function toTime24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  if (period === "AM" && hour12 === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplay(date: string, time: string): string {
  if (!date) return "";
  const { hour12, minute, period } = parseTime24(time || "09:00");
  const d = new Date(`${date}T12:00:00`);
  const dateLabel = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${dateLabel} · ${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function ReminderFormDialog({
  open,
  onOpenChange,
  reminder,
  defaultDate,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title);
      setDate(reminder.date);
      setStartTime(reminder.startTime || "09:00");
      setDescription(reminder.description ?? "");
    } else {
      setTitle("");
      setDate(defaultDate || (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      })());
      setStartTime("09:00");
      setDescription("");
    }
    setPickerOpen(true);
  }, [open, reminder, defaultDate]);

  const { hour12, minute, period } = parseTime24(startTime);
  const display = useMemo(() => formatDisplay(date, startTime), [date, startTime]);
  const selected = date ? new Date(`${date}T12:00:00`) : undefined;
  const nearestMinute = MINUTES.reduce((best, m) =>
    Math.abs(m - minute) < Math.abs(best - minute) ? m : best,
  );

  const submit = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date,
        startTime: startTime.trim(),
        description: description.trim(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <DialogTitle className="font-display">
            {reminder ? "Edit reminder" : "Add reminder"}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Collect medals"
              className="min-h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Date & time
            </label>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm",
                !display && "text-muted-foreground",
              )}
              aria-expanded={pickerOpen}
            >
              <CalendarDays className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{display || "Select date & time"}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  pickerOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {pickerOpen ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex justify-center border-b border-border p-2">
                  <Calendar
                    mode="single"
                    weekStartsOn={1}
                    selected={selected}
                    defaultMonth={selected ?? new Date()}
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                      );
                    }}
                    className="mx-auto w-full max-w-[20rem]"
                  />
                </div>
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  12-hour time
                </div>
                <div className="grid grid-cols-3 border-b border-border bg-muted/20">
                  <div className="border-r border-border px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Hours
                  </div>
                  <div className="border-r border-border px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Mins
                  </div>
                  <div className="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    AM / PM
                  </div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="max-h-40 overflow-y-auto border-r border-border py-1">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setStartTime(toTime24(h, nearestMinute, period))}
                        className={cn(
                          "flex w-full items-center justify-center py-1.5 font-mono text-sm tabular-nums",
                          h === hour12
                            ? "bg-primary/15 font-semibold text-primary"
                            : "hover:bg-muted/60",
                        )}
                      >
                        {String(h).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-40 overflow-y-auto border-r border-border py-1">
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setStartTime(toTime24(hour12, m, period))}
                        className={cn(
                          "flex w-full items-center justify-center py-1.5 font-mono text-sm tabular-nums",
                          m === nearestMinute
                            ? "bg-primary/15 font-semibold text-primary"
                            : "hover:bg-muted/60",
                        )}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                  <div className="flex max-h-40 flex-col justify-center gap-1 p-2">
                    {(["AM", "PM"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setStartTime(toTime24(hour12, nearestMinute, p))}
                        className={cn(
                          "rounded-lg py-2.5 text-sm font-semibold",
                          p === period
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full rounded-xl"
                    onClick={() => setPickerOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Note (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything you need to remember…"
              className="min-h-[80px] rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="activity-primary-action rounded-xl"
            disabled={!title.trim() || !date || saving}
            onClick={() => void submit()}
          >
            {reminder ? "Save" : "Add reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
