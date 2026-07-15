import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Button,
  Pill,
  Select,
  Kpi,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarGroup,
  ToolbarSpacer,
  ToolbarMeta,
  DataTable,
  EmptyState,
  Th,
} from "@lumenx/ui-admin";
import {
  ADMIN_CLASSES,
  ADMIN_SECTIONS,
  ADMIN_EXAMS,
  ADMIN_SUBJECTS,
  MARK_ROWS,
  type MarkRow,
} from "@/lib/admin-module-data";
import { Download, Send, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/marks")({
  head: () => ({ meta: [{ title: "Marks — LumenX Admin" }] }),
  component: MarksPage,
});

function totalMarks(row: MarkRow) {
  return Object.values(row.marks).reduce((a, b) => a + b, 0);
}

function pct(row: MarkRow) {
  const max = Object.keys(row.marks).length * row.maxPerSubject;
  return max ? Math.round((totalMarks(row) / max) * 100) : 0;
}

function MarksPage() {
  const [classGrade, setClassGrade] = useState<string>("all");
  const [section, setSection] = useState<string>("all");
  const [examId, setExamId] = useState<string>("EX-UT1");
  const [subject, setSubject] = useState<string>("all");
  const [passFilter, setPassFilter] = useState<"all" | "pass" | "fail">("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(MARK_ROWS);

  const list = useMemo(() => {
    return rows.filter((r) => {
      if (r.examId !== examId) return false;
      if (classGrade !== "all" && r.classGrade !== classGrade) return false;
      if (section !== "all" && r.section !== section) return false;
      if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.rollNo.includes(q))
        return false;
      const p = pct(r);
      if (passFilter === "pass" && p < 40) return false;
      if (passFilter === "fail" && p >= 40) return false;
      return true;
    });
  }, [rows, examId, classGrade, section, passFilter, q]);

  const subjects = useMemo(() => {
    if (subject !== "all") return [subject];
    return [...ADMIN_SUBJECTS];
  }, [subject]);

  const publishResults = () => {
    setRows((prev) =>
      prev.map((r) =>
        list.some((l) => l.id === r.id) && r.teacherPublished ? { ...r, adminPublished: true } : r,
      ),
    );
  };

  const publishedCount = list.filter((r) => r.adminPublished).length;
  const avgPct = list.length ? Math.round(list.reduce((a, r) => a + pct(r), 0) / list.length) : 0;

  return (
    <AppShell
      title="Marks Management"
      subtitle="Institute-wide results · synced after teacher publish (Connect-ready)"
      actions={
        <>
          <Button>
            <Download className="size-3.5" /> Export
          </Button>
          <Button variant="primary" onClick={publishResults}>
            <Send className="size-3.5" /> Publish results
          </Button>
        </>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi label="Students" value={String(list.length)} delta="In view" />
        <Kpi label="Avg score" value={`${avgPct}%`} delta="This exam" tone="up" />
        <Kpi label="Published" value={String(publishedCount)} delta={`of ${list.length}`} />
        <Kpi
          label="Pending publish"
          value={String(list.filter((r) => r.teacherPublished && !r.adminPublished).length)}
          tone="down"
        />
      </div>

      <Card className="mt-6">
        <PageToolbar>
          <ToolbarGroup>
            <Select
              fieldSize="compact"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="w-36"
            >
              <option value="all">All classes</option>
              {ADMIN_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              fieldSize="compact"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-28"
            >
              <option value="all">All sections</option>
              {ADMIN_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </Select>
            <Select
              fieldSize="compact"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-48"
            >
              {ADMIN_EXAMS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
            <Select
              fieldSize="compact"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-40"
            >
              <option value="all">All columns</option>
              {ADMIN_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
          <SegmentedControl
            value={passFilter}
            onChange={setPassFilter}
            options={[
              { value: "all", label: "All" },
              { value: "pass", label: "Pass" },
              { value: "fail", label: "Fail" },
            ]}
          />
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or roll no…"
            className="flex-1 min-w-[200px]"
          />
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>
        {list.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="No marks for this filter"
            hint="Awaiting teacher publish from Connect, or try another exam or class."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Roll</Th>
                <Th>Student</Th>
                {subjects.map((s) => (
                  <Th key={s} className="px-3">
                    {s.slice(0, 4)}
                  </Th>
                ))}
                <Th>Total</Th>
                <Th>%</Th>
                <Th>Pass/Fail</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((r) => {
                const p = pct(r);
                return (
                  <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3 text-xs font-mono">{r.rollNo}</td>
                    <td className="px-5 py-3 text-xs font-medium">{r.name}</td>
                    {subjects.map((s) => (
                      <td key={s} className="px-3 py-3 text-xs font-mono text-center">
                        {r.marks[s] ?? "—"}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-xs font-mono">{totalMarks(r)}</td>
                    <td className="px-5 py-3 text-xs font-mono">{p}%</td>
                    <td className="px-5 py-3">
                      {p >= 40 ? <Pill tone="success">Pass</Pill> : <Pill tone="danger">Fail</Pill>}
                    </td>
                    <td className="px-5 py-3">
                      {!r.teacherPublished && <Pill tone="warning">Pending teacher</Pill>}
                      {r.teacherPublished && !r.adminPublished && <Pill tone="info">Ready</Pill>}
                      {r.adminPublished && <Pill tone="success">Published</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
        {list.length > 0 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing 1–{list.length} of {list.length}
            </span>
            <div className="flex gap-1">
              <Button size="sm" disabled>
                Previous
              </Button>
              <Button size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
