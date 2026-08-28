import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, DataTable, EmptyState, Modal, Button, Th } from "@lumenx/ui-admin";
import {
  ensureHomeworkDiaryDemoSeed,
  loadDiarySubmissionLogs,
  type DiarySubmissionLog,
} from "@lumenx/utils";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { BookMarked, Eye } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadDiaryDaysList,
  resolveDiaryListView,
  shouldCommitDiaryLoad,
  type DiaryListItem,
  type DiaryListStatus,
} from "@/lib/diary";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: adminPageTitle("/diary") }] }),
  component: DiaryViewPage,
});

type DiaryRow = DiarySubmissionLog | DiaryListItem;

function formatSubmittedAt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function scopeDisplay(scope: string): string {
  return (scope ?? "").replace(/-/g, " ") || "—";
}

function DiaryViewPage() {
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();

  const [demoLogs] = useState<DiarySubmissionLog[]>(() => {
    if (apiMode) return [];
    ensureHomeworkDiaryDemoSeed();
    return loadDiarySubmissionLogs();
  });
  const [apiItems, setApiItems] = useState<DiaryListItem[]>([]);
  const [listStatus, setListStatus] = useState<DiaryListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const [detailId, setDetailId] = useState<string | null>(null);

  const listView = resolveDiaryListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
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
    void loadDiaryDaysList(requestInstituteId).then((next) => {
      if (
        !shouldCommitDiaryLoad({
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

  const displayItems: DiaryRow[] = apiMode ? listView.items : demoLogs;
  const sorted = useMemo(
    () =>
      [...displayItems].sort((a, b) =>
        (b.submittedAt || "").localeCompare(a.submittedAt || ""),
      ),
    [displayItems],
  );

  const detail = useMemo(
    () =>
      detailId
        ? sorted.find((row) => row.id === detailId) ?? null
        : null,
    [sorted, detailId],
  );

  const listHint =
    displayStatus === "loading"
      ? "Loading diary submissions…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load diary submissions"
        : displayStatus === "forbidden"
          ? "You do not have access to diary submissions for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load diary submissions"
            : null;

  return (
    <AppShell
      title={M.diary}
      subtitle={
        apiMode
          ? "API mode · read-only list"
          : "Teacher submits · Admin view only (no edit)"
      }
    >
      <Card>
        {apiMode && !listView.rowsValid ? (
          <div className="px-5 py-12 text-sm text-muted-foreground text-center">
            {listHint}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="size-5" />}
            title="No diary submissions yet"
            hint="Submitted teacher diary days from Connect appear here for viewing only."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Diary date</Th>
                <Th>Submitted</Th>
                <Th>Teacher</Th>
                <Th>Scope</Th>
                <Th>Entries</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 font-mono text-xs">{row.date}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {formatSubmittedAt(row.submittedAt)}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium">
                    {row.teacherName || "—"}
                  </td>
                  <td className="px-5 py-3 text-sm capitalize">
                    {scopeDisplay(row.scope)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {(row.rows ?? []).length}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailId(row.id)}
                    >
                      <Eye className="size-3.5" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail ? `Diary · ${detail.date}` : "Diary"}
        subtitle={
          detail
            ? `${detail.teacherName || "Teacher"} · submitted ${formatSubmittedAt(detail.submittedAt)}`
            : undefined
        }
        size="lg"
        footer={<Button onClick={() => setDetailId(null)}>Close</Button>}
      >
        {detail ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              View only — Admin cannot edit teacher diary entries.
            </p>
            <div className="space-y-2">
              {(detail.rows ?? []).map((r, i) => (
                <div
                  key={`${r.className ?? "class"}-${i}`}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="text-xs font-semibold">{r.className || "Class"}</div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {r.description || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
