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
import { useMemo, useState } from "react";

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

function HomeworkLogsPage() {
  const [logs] = useState(() => {
    ensureHomeworkDiaryDemoSeed();
    return loadHomeworkActivityLogs();
  });

  const sorted = useMemo(
    () => [...logs].sort((a, b) => b.at.localeCompare(a.at)),
    [logs],
  );

  return (
    <AppShell
      title={M.homework}
      subtitle="Teacher owns homework CRUD · Admin view logs only (no edit)"
    >
      <Card>
        {sorted.length === 0 ? (
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
              {sorted.map((row) => (
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
