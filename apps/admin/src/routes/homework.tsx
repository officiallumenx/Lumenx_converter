import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
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
  loadHomeworkActivityLogs,
  type HomeworkActivityLog,
} from "@lumenx/utils";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { BookOpen, Eye, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  deleteHomework,
  expireHomework,
  loadHomeworkDetail,
  loadHomeworkList,
  resolveHomeworkListView,
  shouldCommitHomeworkLoad,
  type HomeworkListItem,
  type HomeworkListStatus,
} from "@/lib/homework";

export const Route = createFileRoute("/homework")({
  head: () => ({ meta: [{ title: adminPageTitle("/homework") }] }),
  component: HomeworkLogsPage,
});

function actionTone(
  action: HomeworkActivityLog["action"],
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (action === "published") return "success";
  if (action === "created") return "info";
  if (action === "updated") return "warning";
  if (action === "deleted") return "danger";
  return "neutral";
}

function statusTone(
  status: HomeworkListItem["status"],
): "success" | "info" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  if (status === "expired") return "neutral";
  return "neutral";
}

function listHint(status: HomeworkListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading homework…";
  if (status === "needs_institute") return "Select an institute to load homework.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to homework for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load homework.";
  if (status === "empty") return "No homework items yet.";
  return null;
}

function HomeworkLogsPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [demoLogs] = useState<HomeworkActivityLog[]>(() => {
    if (apiMode) return [];
    ensureHomeworkDiaryDemoSeed();
    return loadHomeworkActivityLogs();
  });
  const [apiItems, setApiItems] = useState<HomeworkListItem[]>([]);
  const [listStatus, setListStatus] = useState<HomeworkListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [detailId, setDetailId] = useState<string | null>(null);
  const detailIdRef = useRef(detailId);
  detailIdRef.current = detailId;
  const [detail, setDetail] = useState<HomeworkListItem | null>(null);
  const [detailStatus, setDetailStatus] = useState<HomeworkListStatus>("empty");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [mutating, setMutating] = useState(false);

  const listView = resolveHomeworkListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      setDetailId(null);
      setDetail(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setApiItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      setDetailId(null);
      setDetail(null);
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
      setDetail(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    setDetailId(null);
    setDetail(null);
    void loadHomeworkList(requestInstituteId).then((next) => {
      if (
        !shouldCommitHomeworkLoad({
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

  useEffect(() => {
    if (!apiMode || !detailId || !instituteCtx.activeInstituteId) {
      setDetail(null);
      setDetailStatus("empty");
      setDetailError(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestId = detailId;
    let cancelled = false;
    setDetailStatus("loading");
    setDetailError(null);
    void loadHomeworkDetail(requestInstituteId, requestId).then((next) => {
      if (cancelled) return;
      if (activeInstituteIdRef.current !== requestInstituteId) return;
      if (detailIdRef.current !== requestId) return;
      setDetail(next.item);
      setDetailStatus(next.status);
      setDetailError(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, detailId, instituteCtx.activeInstituteId, detailReloadKey]);

  const sortedApi = useMemo(
    () =>
      [...(listView.rowsValid ? listView.items : [])].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [listView.items, listView.rowsValid],
  );

  const sortedDemo = useMemo(
    () => [...demoLogs].sort((a, b) => b.at.localeCompare(a.at)),
    [demoLogs],
  );

  const hint = listHint(listView.status, listView.errorMessage);

  const expireItem = (id: string) => {
    if (!writesEnabled || mutating) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (!requestInstituteId) return;
    setMutating(true);
    void expireHomework(id)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setReloadKey((k) => k + 1);
        setDetailReloadKey((k) => k + 1);
        notify("Homework expired");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to expire homework");
      })
      .finally(() => {
        setMutating(false);
      });
  };

  const removeItem = (id: string) => {
    if (!writesEnabled || mutating) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (!requestInstituteId) return;
    setMutating(true);
    void deleteHomework(id)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setDetailId(null);
        setDetail(null);
        setReloadKey((k) => k + 1);
        notify("Homework deleted");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete homework");
      })
      .finally(() => {
        setMutating(false);
      });
  };

  return (
    <AppShell
      title={M.homework}
      subtitle={
        apiMode
          ? writesEnabled
            ? "API mode · teacher-owned create/edit/publish · Admin can view, expire, or delete"
            : "API mode · read-only · select an institute to govern items"
          : "Teacher owns homework CRUD · Admin view logs only (no edit)"
      }
    >
      <Card>
        {apiMode ? (
          !listView.rowsValid ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {hint ?? "Loading…"}
            </div>
          ) : sortedApi.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title="No homework yet"
              hint={
                hint ??
                "Teachers create and publish homework in Connect. Items appear here for Admin governance."
              }
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Updated</Th>
                  <Th>Status</Th>
                  <Th>Kind</Th>
                  <Th>Teacher</Th>
                  <Th>Title</Th>
                  <Th>Class</Th>
                  <Th>Subject</Th>
                  <Th>Due</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {sortedApi.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(row.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                    </td>
                    <td className="px-5 py-3 text-sm capitalize">{row.kind}</td>
                    <td className="px-5 py-3 text-sm font-medium">{row.teacherName}</td>
                    <td className="px-5 py-3 text-sm">{row.title}</td>
                    <td className="px-5 py-3 text-sm">{row.classLabel}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {row.subjectLabel}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{row.dueDate}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailId(row.id)}
                        >
                          <Eye className="size-3.5" /> View
                        </Button>
                        {writesEnabled && row.status === "published" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={mutating}
                            onClick={() => expireItem(row.id)}
                          >
                            Expire
                          </Button>
                        ) : null}
                        {writesEnabled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={mutating}
                            onClick={() => removeItem(row.id)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )
        ) : sortedDemo.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="No homework activity yet"
            hint="When teachers create, update, publish, or delete homework in Connect, logs appear here."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>Teacher</Th>
                <Th>Title</Th>
                <Th>Class</Th>
                <Th>Subject</Th>
              </tr>
            </thead>
            <tbody>
              {sortedDemo.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(row.at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <Pill tone={actionTone(row.action)}>{row.action}</Pill>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium">{row.teacherName}</td>
                  <td className="px-5 py-3 text-sm">{row.title}</td>
                  <td className="px-5 py-3 text-sm">{row.classLabel}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {row.subject ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null);
          setDetail(null);
        }}
        title={detail?.title ?? "Homework"}
        subtitle={
          detail
            ? `${detail.teacherName} · ${detail.classLabel} · ${detail.subjectLabel}`
            : detailStatus === "loading"
              ? "Loading detail…"
              : undefined
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              disabled={detailStatus === "loading" || !detailId}
              onClick={() => setDetailReloadKey((k) => k + 1)}
            >
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
            {writesEnabled && detail?.status === "published" ? (
              <Button
                variant="outline"
                disabled={mutating}
                onClick={() => expireItem(detail.id)}
              >
                Expire
              </Button>
            ) : null}
            {writesEnabled && detail ? (
              <Button
                variant="danger"
                disabled={mutating}
                onClick={() => removeItem(detail.id)}
              >
                Delete
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setDetailId(null);
                setDetail(null);
              }}
            >
              Close
            </Button>
          </>
        }
      >
        {detailStatus === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading homework detail…</p>
        ) : detailError ? (
          <p className="text-sm text-destructive">{detailError}</p>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill tone={statusTone(detail.status)}>{detail.status}</Pill>
              <Pill tone="neutral">{detail.kind}</Pill>
              <span className="font-mono text-xs text-muted-foreground">
                Due {detail.dueDate}
              </span>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </div>
              <p className="whitespace-pre-wrap text-foreground">
                {detail.description || "—"}
              </p>
            </div>
            {detail.instructions ? (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Instructions
                </div>
                <p className="whitespace-pre-wrap text-foreground">{detail.instructions}</p>
              </div>
            ) : null}
            <div className="font-mono text-[10px] text-muted-foreground">
              Updated {new Date(detail.updatedAt).toLocaleString()}
              {detail.publishedAt
                ? ` · Published ${new Date(detail.publishedAt).toLocaleString()}`
                : ""}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a homework item to view.</p>
        )}
      </Modal>
    </AppShell>
  );
}
