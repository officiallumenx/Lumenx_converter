import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Plus, Trash2, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { Button, Input, Textarea, cn } from "@lumenx/ui";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import {
  diaryRepository,
  formatDiaryDayLabel,
  isDiaryDayReady,
  isDiaryDaySubmitted,
  newDiaryRow,
  todayIso,
  yesterdayIso,
  type DiaryRow,
  type DiaryScope,
} from "@/lib/teacher/diary";

const SAVE_DEBOUNCE_MS = 350;

type Props = {
  scope: DiaryScope;
  className?: string;
};

const DiaryClassRow = memo(function DiaryClassRow({
  row,
  index,
  onPatch,
  onRemove,
}: {
  row: DiaryRow;
  index: number;
  onPatch: (id: string, patch: Partial<DiaryRow>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Class {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(row.id)}
          aria-label={`Remove class ${index + 1}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Class</label>
      <Input
        value={row.className}
        onChange={(e) => onPatch(row.id, { className: e.target.value })}
        placeholder="e.g. 8-A / U14 Football"
        className="mb-3"
      />
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Description
      </label>
      <Textarea
        value={row.description}
        onChange={(e) => onPatch(row.id, { description: e.target.value })}
        placeholder="Topics covered, activities, notes…"
        rows={3}
        className="min-h-[4.5rem] resize-y"
      />
    </li>
  );
});

export function DiaryOverdueBanner({
  scope,
  href,
}: {
  scope: DiaryScope;
  href: string;
}) {
  useSyncExternalStore(
    diaryRepository.subscribe,
    diaryRepository.getSnapshot,
    diaryRepository.getSnapshot,
  );

  const overdue = diaryRepository.isYesterdayOverdue(scope);
  if (!overdue) return null;

  return (
    <Link
      to={href}
      className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-sm text-foreground shadow-soft transition hover:bg-amber-500/15"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="font-semibold">Yesterday’s diary is overdue</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Fill and submit notes for {formatDiaryDayLabel(yesterdayIso())} to the principal. Tap to
          open.
        </span>
      </span>
    </Link>
  );
}

export function DiaryBookPage({ scope, className }: Props) {
  const today = todayIso();
  const yesterday = yesterdayIso();
  const [selectedDate, setSelectedDate] = useState(today);
  const [rows, setRows] = useState<DiaryRow[]>(() => diaryRepository.ensureDay(scope, today).rows);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPersist = useRef(true);

  useSyncExternalStore(
    diaryRepository.subscribe,
    diaryRepository.getSnapshot,
    diaryRepository.getSnapshot,
  );

  useEffect(() => {
    const day = diaryRepository.ensureDay(scope, selectedDate);
    skipNextPersist.current = true;
    setRows(day.rows.map((r) => ({ ...r })));
    setSaveState("idle");
  }, [scope, selectedDate]);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(() => {
      diaryRepository.saveRows(scope, selectedDate, rows);
      setSaveState("saved");
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rows, scope, selectedDate]);

  const canSubmit = isDiaryDayReady({ date: selectedDate, scope, rows, updatedAt: "" });
  const storedDay = diaryRepository.getDay(scope, selectedDate);
  const submitted = isDiaryDaySubmitted(storedDay);
  const isYesterdayTab = selectedDate === yesterday;
  const overdueHere = isYesterdayTab && !submitted;

  const todaySubmitted =
    selectedDate === today ? submitted : diaryRepository.isSubmitted(scope, today);
  const yesterdaySubmitted =
    selectedDate === yesterday ? submitted : diaryRepository.isSubmitted(scope, yesterday);

  const updateRow = useCallback((id: string, patch: Partial<DiaryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => setRows((prev) => [...prev, newDiaryRow()]), []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [newDiaryRow()];
    });
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Add at least one class with a description before submitting.");
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSubmitting(true);
    try {
      await diaryRepository.submitToAdmin(scope, selectedDate, rows);
      setSaveState("saved");
      toast.success(
        submitted
          ? "Updated in the principal admin diary."
          : "Submitted to the principal admin diary.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit diary.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("min-w-0 space-y-5", className)}>
      <PageHeader
        title="Diary Book"
        subtitle="Draft saves as you type. Submit sends the day to the principal admin diary."
      />

      <div className="flex flex-wrap items-center gap-2">
        <DateChip
          label="Today"
          sub={formatDiaryDayLabel(today)}
          active={selectedDate === today}
          onClick={() => setSelectedDate(today)}
          status={todaySubmitted ? "done" : "open"}
        />
        <DateChip
          label="Yesterday"
          sub={formatDiaryDayLabel(yesterday)}
          active={selectedDate === yesterday}
          onClick={() => setSelectedDate(yesterday)}
          status={yesterdaySubmitted ? "done" : "overdue"}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving draft…" : saveState === "saved" ? "Draft saved" : null}
        </span>
      </div>

      {submitted ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p>
            <span className="font-medium">Sent to principal.</span> You can edit and submit again to
            update the admin diary.
          </p>
        </div>
      ) : null}

      {overdueHere ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
          <p>
            <span className="font-medium">Overdue.</span> Fill at least one class and description,
            then submit to the principal.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {rows.map((row, index) => (
          <DiaryClassRow
            key={row.id}
            row={row}
            index={index}
            onPatch={updateRow}
            onRemove={removeRow}
          />
        ))}
      </ul>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="min-w-0 flex-1 sm:flex-none" onClick={addRow}>
          <Plus className="size-4" aria-hidden />
          Add class row
        </Button>
        <Button
          type="button"
          className="min-w-0 flex-1 sm:flex-none sm:ml-auto"
          disabled={!canSubmit || submitting}
          onClick={() => void handleSubmit()}
        >
          <Send className="size-4" aria-hidden />
          {submitting
            ? "Submitting…"
            : submitted
              ? "Update to admin"
              : "Submit to admin"}
        </Button>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Only today and yesterday can be edited. Submit pushes this day into the principal admin
        diary.
      </p>
    </div>
  );
}

function DateChip({
  label,
  sub,
  active,
  onClick,
  status,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
  status: "done" | "open" | "overdue";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-left transition",
        active
          ? "border-primary bg-primary/10 shadow-soft"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <span className="block text-sm font-semibold leading-tight">{label}</span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{sub}</span>
      <span
        className={cn(
          "mt-1 inline-block text-[10px] font-medium uppercase tracking-wide",
          status === "done" && "text-emerald-600 dark:text-emerald-400",
          status === "overdue" && "text-amber-700 dark:text-amber-400",
          status === "open" && "text-muted-foreground",
        )}
      >
        {status === "done" ? "Submitted" : status === "overdue" ? "Overdue" : "Draft"}
      </span>
    </button>
  );
}
