import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { reportCards, performance, gradeFor, studentProfile } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, Send, Plus, ArrowRight, FileText } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { ReportCard } from "@/lib/types";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/marks")({
  head: () => ({
    meta: [
      { title: "Marks & Report Cards — LumenX Connect" },
      {
        name: "description",
        content: "Enter, publish and review subject-wise marks, grades and report cards.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <MarksPage />
    </AppShell>
  ),
});

function MarksPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherMarks />;
  if (role === "parent") return <ParentMarks />;
  return <StudentMarks />;
}

/* ----------------------------- TEACHER ----------------------------- */

function TeacherMarks() {
  const [exam, setExam] = useState("Mid-Term");
  const [section, setSection] = useState("10-B");
  const [rows, setRows] = useState(() =>
    [
      "Aanya Patel",
      "Aarav Sharma",
      "Aditya Singh",
      "Ananya Gupta",
      "Diya Nair",
      "Kabir Khan",
      "Mira Kapoor",
      "Reyansh Shah",
    ].map((name, i) => ({ id: `s${i}`, name, internal: 16 + (i % 4), exam: 55 + ((i * 3) % 25) })),
  );

  const update = (id: string, key: "internal" | "exam", v: number) => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, [key]: Math.max(0, Math.min(key === "internal" ? 20 : 80, v)) } : r,
      ),
    );
  };

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Marks Management"
        subtitle="Enter, save drafts and publish subject-wise marks"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => toast.success("Draft saved")}
            >
              <Save className="size-4" /> Save draft
            </Button>
            <Button
              className="rounded-xl gap-2 shadow-glow"
              onClick={() => toast.success("Marks published")}
            >
              <Send className="size-4" /> Publish
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectField
          label="Exam"
          value={exam}
          onChange={setExam}
          options={["Unit Test 1", "Mid-Term", "Unit Test 2", "Final"]}
        />
        <SelectField
          label="Section"
          value={section}
          onChange={setSection}
          options={["10-A", "10-B", "9-A", "8-C"]}
        />
        <SelectField
          label="Subject"
          value="Mathematics"
          onChange={() => {}}
          options={["Mathematics", "Physics", "Chemistry", "English"]}
        />
      </div>

      <SectionCard
        title={`${exam} • ${section} • Mathematics`}
        action={
          <Badge variant="outline" className="rounded-md">
            Draft
          </Badge>
        }
      >
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Student</TableHead>
                <TableHead className="w-[120px]">Internal /20</TableHead>
                <TableHead className="w-[120px]">Exam /80</TableHead>
                <TableHead className="w-[100px]">Total</TableHead>
                <TableHead className="w-[90px]">Grade</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const total = r.internal + r.exam;
                const grade = gradeFor(total);
                const passed = total >= 33;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={20}
                        value={r.internal}
                        onChange={(e) => update(r.id, "internal", Number(e.target.value))}
                        className="h-9 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={80}
                        value={r.exam}
                        onChange={(e) => update(r.id, "exam", Number(e.target.value))}
                        className="h-9 w-20"
                      />
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{total}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{grade}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          passed
                            ? "bg-success/15 text-success hover:bg-success/20 border-0"
                            : "bg-destructive/15 text-destructive border-0"
                        }
                      >
                        {passed ? "Pass" : "Fail"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ----------------------------- STUDENT ----------------------------- */

function StudentMarks() {
  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="My Marks & Report Cards"
        subtitle={`${studentProfile.name} • ${studentProfile.class} ${studentProfile.section} • Roll ${studentProfile.rollNo}`}
      />
      <ReportCardView />
    </div>
  );
}

function ParentMarks() {
  const portal = useParentPortal();
  if (!portal.isParent) return null;
  if (portal.isLoading || !portal.snapshot) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Academic Performance" subtitle="Loading this learner's records…" />
        <Skeleton className="h-12 w-full max-w-md rounded-xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }
  const { child, reportCards: rc, performance: perf } = portal.snapshot;
  return (
    <div className="min-w-0 max-w-full" key={portal.activeChildId}>
      <PageHeader
        title="Academic Performance"
        subtitle={`${child.name} • ${child.className} ${child.section} • Avg ${child.avgScore}%`}
      />
      <ReportCardView reportCards={rc} termPerformance={perf} />
    </div>
  );
}

type TermPerfRow = { subject: string; score: number; prev: number };

function ReportCardView(props?: { reportCards?: ReportCard[]; termPerformance?: TermPerfRow[] }) {
  const cards = props?.reportCards ?? reportCards;
  const performanceBars = props?.termPerformance ?? performance;

  const published = useMemo(() => cards.filter((r) => r.status === "published"), [cards]);
  const [active, setActive] = useState(published[0]?.id ?? cards[0]?.id ?? "");

  useEffect(() => {
    const pub = cards.filter((r) => r.status === "published");
    setActive(pub[0]?.id ?? cards[0]?.id ?? "");
  }, [cards]);

  const card = cards.find((r) => r.id === active) ?? cards[0];
  if (!card) return null;

  return (
    <div className="min-w-0 space-y-4">
      <Tabs value={active} onValueChange={setActive} className="w-full min-w-0">
        <TabsList className="rounded-xl">
          {cards.map((r) => (
            <TabsTrigger key={r.id} value={r.id} className="rounded-lg">
              {r.term}{" "}
              {r.status === "draft" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">(Draft)</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {cards.map((r) => (
          <TabsContent key={r.id} value={r.id} className="mt-4 space-y-4">
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Percentage" value={`${r.percentage}%`} tone="primary" />
              <Stat label="Grade" value={r.grade} tone="success" />
              <Stat label="Class rank" value={`#${r.rank}`} />
              <Stat
                label="Status"
                value={r.status === "published" ? "Published" : "Draft"}
                tone={r.status === "published" ? "success" : "warning"}
              />
            </div>

            <SectionCard
              title="Subject-wise marks"
              action={
                <Badge variant="outline" className="shrink-0 rounded-md gap-1">
                  <FileText className="size-3" /> {r.publishedOn}
                </Badge>
              }
            >
              <div className="-mx-4 min-w-0 overflow-x-auto md:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Internal /20</TableHead>
                      <TableHead className="text-right">Exam /80</TableHead>
                      <TableHead className="text-right">Total /100</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="hidden md:table-cell">Teacher remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.marks.map((m) => (
                      <TableRow key={m.subject}>
                        <TableCell className="font-medium">{m.subject}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.internal}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.exam}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {m.total}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.grade}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {m.remark ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>

            <SectionCard title="Performance visualisation">
              <div className="h-64 w-full min-w-0 max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={r.marks.map((m) => ({ subject: m.subject.slice(0, 4), total: m.total }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="oklch(0.92 0.01 250)"
                    />
                    <XAxis
                      dataKey="subject"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="oklch(0.5 0.02 260)"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="oklch(0.5 0.02 260)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="total" fill="oklch(0.55 0.22 260)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <Link
                to="/exams"
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
              >
                See exam schedule <ArrowRight className="size-3" />
              </Link>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <SectionCard title="Term-on-term trend">
        <div className="h-56 w-full min-w-0 max-w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceBars}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 250)" />
              <XAxis
                dataKey="subject"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="oklch(0.5 0.02 260)"
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="oklch(0.5 0.02 260)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar
                dataKey="prev"
                name="Previous"
                fill="oklch(0.86 0.04 250)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="score"
                name="Current"
                fill="oklch(0.55 0.22 260)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneCls = {
    default: "bg-card",
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
  }[tone];
  return (
    <div className={`min-w-0 rounded-2xl border border-border p-4 shadow-soft ${toneCls}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold sm:text-2xl">{value}</div>
    </div>
  );
}
