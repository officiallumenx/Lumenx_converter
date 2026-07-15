import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { reportCards, performance, gradeFor } from "@/lib/mock-data";
import { Button, Input } from "@lumenx/ui";
import { Badge } from "@lumenx/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lumenx/ui";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { ReportCardView } from "@/components/app/ReportCardView";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Skeleton } from "@lumenx/ui";
import { TeacherMarksPage } from "@/teacher-portal";
import { StudentMarksPage } from "@/student-portal";

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
  if (role === "teacher") return <TeacherMarksPage />;
  if (role === "parent") return <ParentMarks />;
  return <StudentMarksPage />;
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
                <TableHead className="w-[100px]">Result</TableHead>
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
        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
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

/* ----------------------------- STUDENT → @/student-portal ----------------------------- */

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
      <ReportCardView reportCards={rc} termPerformance={perf} hideDrafts />
    </div>
  );
}
