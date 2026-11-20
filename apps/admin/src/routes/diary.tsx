import { createFileRoute } from "@tanstack/react-router";
import { useDiaryDaysQuery } from "@/lib/admin-queries";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Modal,
  Pill,
  Th,
} from "@lumenx/ui-admin";
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
  resolveDiaryListView,
  type DiaryListItem,
  type DiaryListStatus,
} from "@/lib/diary";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: adminPageTitle("/diary") }] }),
  component: DiaryViewPage,
});

type DiaryRow = DiarySubmissionLog | DiaryListItem;

function formatSubmittedAt(iso: string): string {
  if (!iso) return "Draft";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function scopeDisplay(scope: string): string {
  return (scope ?? "").replace(/-/g, " ") || "—";
}

/**
 * Admin Diary is a monitoring surface: list + view submitted/draft days.
 * Teachers author diary in Connect; Admin never creates/edits/deletes here.
 */
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
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const [detailId, setDetailId] = useState<string | null>(null);
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const diaryQuery = useDiaryDaysQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );

  const listView = resolveDiaryListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus:
      diaryQuery.isLoading && !diaryQuery.data ? "loading" : listStatus,
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
      setDetailId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setApiItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      setDetailId(null);
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
      setDetailId(null);
      return;
    }

    if (diaryQuery.isLoading && !diaryQuery.data) {
      setListStatus("loading");
      setListError(null);
      return;
    }
    if (diaryQuery.isError && !diaryQuery.data) {
      setApiItems([]);
      setListStatus("error");
      setListError(
        diaryQuery.error instanceof Error
          ? diaryQuery.error.message
          : "Failed to load diary days",
      );
      setResolvedForInstituteId(instituteCtx.activeInstituteId);
      return;
    }
    if (!diaryQuery.data) return;

    const next = diaryQuery.data;
    setApiItems(next.items);
    setListStatus(next.status);
    setListError(next.errorMessage);
    setResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    diaryQuery.data,
    diaryQuery.isLoading,
    diaryQuery.isError,
    diaryQuery.error,
  ]);

  const displayItems: DiaryRow[] = apiMode ? listView.items : demoLogs;
  const sorted = useMemo(
    () =>
      [...displayItems].sort((a, b) =>
        (b.submittedAt || "").localeCompare(a.submittedAt || ""),
      ),
    [displayItems],
  );

  const submittedCount = useMemo(
    () => sorted.filter((row) => Boolean(row.submittedAt)).length,
    [sorted],
  );
  const draftCount = useMemo(
    () => sorted.filter((row) => !row.submittedAt).length,
    [sorted],
  );

  const detail = useMemo(
    () => (detailId ? sorted.find((row) => row.id === detailId) ?? null : null),
    [sorted, detailId],
  );

  const listHint =
    displayStatus === "loading"
      ? "Loading diary days…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load diary days"
        : displayStatus === "forbidden"
          ? "You do not have access to diary for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load diary days"
            : displayStatus === "empty"
              ? "No diary days for this institute yet"
              : null;

  const emptyTitle =
    displayStatus === "error"
      ? "Diary unavailable"
      : displayStatus === "forbidden"
        ? "Access denied"
        : displayStatus === "needs_institute"
          ? "Select an institute"
          : "No diary days yet";

  const emptyHint =
    displayStatus === "error"
      ? (displayError ??
        "Could not load diary. This is not the same as teachers having no submissions.")
      : displayStatus === "forbidden"
        ? "You do not have access to diary for this institute."
        : displayStatus === "needs_institute"
          ? "Select an active institute to monitor diary submissions."
          : apiMode
            ? "Submitted and draft teacher diary days from Connect appear here for viewing only."
            : "Submitted teacher diary days from Connect appear here for viewing only.";

  return (
    <AppShell
      title={M.diary}
      subtitle="Teacher submits · Admin view only (no add, edit, or delete)"
      actions={null}
    >
      <ModuleHero
        eyebrow="Academics"
        title={M.diary}
        subtitle="Teacher submits · Admin view only (no add, edit, or delete)"
       helpKey="diary" />
      {apiMode && listView.rowsValid && sorted.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Pill tone="success">{submittedCount} submitted</Pill>
          <Pill tone="warning">{draftCount} draft</Pill>
          <span className="self-center">
            Counts are unique diary days (no double-count).
          </span>
        </div>
      ) : null}
      <Card>
        {apiMode && !listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="size-5" />}
            title={emptyTitle}
            hint={emptyHint}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Diary date</Th>
                <Th>Status</Th>
                <Th>Teacher</Th>
                <Th>Scope</Th>
                <Th>Entries</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 font-mono text-xs">{row.date}</td>
                  <td className="px-5 py-3">
                    {row.submittedAt ? (
                      <Pill tone="success">submitted</Pill>
                    ) : (
                      <Pill tone="warning">draft</Pill>
                    )}
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
            ? `${detail.teacherName || "Teacher"} · ${formatSubmittedAt(detail.submittedAt)}`
            : undefined
        }
        size="lg"
        footer={<Button onClick={() => setDetailId(null)}>Close</Button>}
      >
        {detail ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill tone={detail.submittedAt ? "success" : "warning"}>
                {detail.submittedAt ? "submitted" : "draft"}
              </Pill>
              <Pill tone="neutral">{scopeDisplay(detail.scope)}</Pill>
            </div>
            {(detail.rows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Diary day has no entry rows.
              </p>
            ) : (
              <div className="space-y-2">
                {(detail.rows ?? []).map((r, i) => (
                  <div
                    key={`${r.className ?? "class"}-${i}`}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="text-xs font-semibold">
                      {r.className || "Class"}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {r.description || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
