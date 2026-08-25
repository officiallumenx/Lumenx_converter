import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookMarked } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, CardHeader, Modal, Pill } from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import {
  ensureHomeworkDiaryDemoSeed,
  loadDiarySubmissionLogs,
  type DiarySubmissionLog,
} from "@lumenx/utils";

const PREVIEW_LIMIT = 5;

function formatSubmittedAt(iso: string): string {
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

function scopeLabel(scope: string): string {
  return (scope || "").replace(/-/g, " ") || "—";
}

export function HomeDiaryCard() {
  const [logs] = useState(() => {
    ensureHomeworkDiaryDemoSeed();
    return loadDiarySubmissionLogs();
  });
  const [detail, setDetail] = useState<DiarySubmissionLog | null>(null);

  const sorted = useMemo(
    () => [...logs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [logs],
  );
  const preview = sorted.slice(0, PREVIEW_LIMIT);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = sorted.filter((row) => row.date === todayKey).length;

  return (
    <>
      <Card>
        <CardHeader
          title={M.diary}
          hint="Recent teacher submissions · view only"
          action={
            <div className="flex items-center gap-1.5">
              <Pill tone={todayCount > 0 ? "info" : "neutral"}>
                {todayCount > 0 ? `${todayCount} today` : `${sorted.length} total`}
              </Pill>
              <Link to="/diary">
                <Button size="sm" variant="outline" className="gap-1.5">
                  Open
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          }
        />
        <div className="px-3 pb-3">
          {preview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No diary submissions yet. Submitted days from teachers appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {preview.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(row)}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                  >
                    <IconChip icon={BookMarked} size="sm" variant="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {row.teacherName || "Teacher"}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {row.date} · {scopeLabel(row.scope)} · {(row.rows ?? []).length}{" "}
                        entr{(row.rows ?? []).length === 1 ? "y" : "ies"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {formatSubmittedAt(row.submittedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sorted.length > PREVIEW_LIMIT ? (
            <div className="mt-2 text-right">
              <Link
                to="/diary"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                View all {sorted.length} submissions
              </Link>
            </div>
          ) : null}
        </div>
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.teacherName || "Teacher"} · ${detail.date}` : "Diary"}
        subtitle={
          detail
            ? `${scopeLabel(detail.scope)} · submitted ${formatSubmittedAt(detail.submittedAt)}`
            : undefined
        }
        size="md"
      >
        {detail ? (
          <div className="space-y-2">
            {(detail.rows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No class entries in this submission.</p>
            ) : (
              (detail.rows ?? []).map((entry, index) => (
                <div
                  key={`${detail.id}-${index}`}
                  className="rounded-lg border border-border px-2.5 py-2"
                >
                  <div className="text-xs font-semibold">{entry.className}</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {entry.description || "—"}
                  </p>
                </div>
              ))
            )}
            <div className="pt-1">
              <Link to="/diary">
                <Button size="sm" variant="outline" className="gap-1.5 w-full sm:w-auto">
                  Open full {M.diary}
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
