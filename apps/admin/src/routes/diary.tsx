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
import { useMemo, useState } from "react";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: adminPageTitle("/diary") }] }),
  component: DiaryViewPage,
});

function DiaryViewPage() {
  const [logs] = useState(() => {
    ensureHomeworkDiaryDemoSeed();
    return loadDiarySubmissionLogs();
  });
  const [detail, setDetail] = useState<DiarySubmissionLog | null>(null);

  const sorted = useMemo(
    () => [...logs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [logs],
  );

  return (
    <AppShell
      title={M.diary}
      subtitle="Teacher submits · Admin view only (no edit)"
    >
      <Card>
        {sorted.length === 0 ? (
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
                    {row.submittedAt
                      ? new Date(row.submittedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium">{row.teacherName || "—"}</td>
                  <td className="px-5 py-3 text-sm capitalize">
                    {(row.scope ?? "").replace(/-/g, " ") || "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{(row.rows ?? []).length}</td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetail(row)}>
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
        onClose={() => setDetail(null)}
        title={detail ? `Diary · ${detail.date}` : "Diary"}
        subtitle={
          detail
            ? `${detail.teacherName || "Teacher"} · submitted ${
                detail.submittedAt
                  ? new Date(detail.submittedAt).toLocaleString()
                  : "—"
              }`
            : undefined
        }
        size="lg"
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
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
                  <p className="mt-1 text-sm whitespace-pre-wrap">{r.description || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
