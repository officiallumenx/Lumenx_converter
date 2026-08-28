import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, DataTable, EmptyState, Pill, Th } from "@lumenx/ui-admin";
import {
  ensureHomeworkDiaryDemoSeed,
  loadHomeworkActivityLogs,
  type HomeworkActivityLog,
} from "@lumenx/utils";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { BookOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
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

function actionTone(action: HomeworkActivityLog["action"]): "success" | "info" | "warning" | "danger" | "neutral" {
  if (action === "published") return "success";
  if (action === "created") return "info";
  if (action === "updated") return "warning";
  if (action === "deleted") return "danger";
  return "neutral";
}

function statusTone(status: HomeworkListItem["status"]): "success" | "info" | "warning" | "neutral" {
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
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
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

    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
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
  }, [apiMode, instituteCtx.status, instituteCtx.activeInstituteId]);

  const sortedDemo = useMemo(
    () => [...demoLogs].sort((a, b) => b.at.localeCompare(a.at)),
    [demoLogs],
  );

  const sortedApi = useMemo(
    () =>
      [...listView.items].sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.dueDate.localeCompare(a.dueDate),
      ),
    [listView.items],
  );

  const hint = listHint(listView.status, listView.errorMessage);

  return (
    <AppShell
      title={M.homework}
      subtitle={
        apiMode
          ? "API mode · read-only · teacher-owned homework catalog"
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
              hint={hint ?? "When teachers publish homework in Connect, items appear here."}
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
                    <td className="px-5 py-3 text-sm text-muted-foreground">{row.subjectLabel}</td>
                    <td className="px-5 py-3 font-mono text-xs">{row.dueDate}</td>
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
    </AppShell>
  );
}
