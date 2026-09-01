import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { Button, Input } from "@lumenx/ui";
import { Badge } from "@lumenx/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lumenx/ui";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { ReportCardView } from "@/components/app/ReportCardView";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Skeleton, useLocalStorageExternalStore } from "@lumenx/ui";
import { TeacherMarksPage } from "@/teacher-portal";
import { StudentMarksPage } from "@/student-portal";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadParentReportCards } from "@/lib/marks";
import type { StudentDto } from "@/lib/students/types";
import {
  mergeReportCards,
  publishedReportCardsForLearner,
} from "@/lib/learner-published-marks";
import { LEARNER_PUBLISHED_MARKS_KEY } from "@lumenx/utils";
import { gradeFor } from "@/lib/marks-utils";

export const Route = createFileRoute("/marks")({
  head: () => ({
    meta: [
      { title: "Marks & Report Cards — LumenX Connect" },
      {
        name: "description",
        content: "Enter and submit subject-wise marks for Admin publishing.",
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
  if (isApiAuthMode()) return <ApiParentMarks />;
  return <DemoParentMarks />;
}

function studentLabel(student: StudentDto): string {
  return student.displayName?.trim() || `${student.firstName} ${student.surname}`.trim();
}

function ApiParentMarks() {
  const { activeChildId, activeInstituteId, setActiveChildId } = useApp();
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [cardsByStudentId, setCardsByStudentId] = useState<
    Map<string, import("@lumenx/types").ReportCard[]>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadParentReportCards({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      setStudents(result.students);
      setCardsByStudentId(result.cardsByStudentId);
      setLoadError(result.errorMessage);
      setLoading(false);
      if (result.students.length > 0) {
        const valid = activeChildId && result.students.some((s) => s.id === activeChildId);
        const next = valid ? activeChildId : result.students[0]!.id;
        if (next !== activeChildId) setActiveChildId(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, activeChildId, setActiveChildId]);

  const child = useMemo(
    () => students.find((s) => s.id === activeChildId) ?? students[0] ?? null,
    [students, activeChildId],
  );

  const reportCards = useMemo(() => {
    if (!child) return [];
    return cardsByStudentId.get(child.id) ?? [];
  }, [child, cardsByStudentId]);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Academic Performance" subtitle="Loading this learner's records…" />
        <Skeleton className="h-12 w-full max-w-md rounded-xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  if (!child) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No linked students found for report cards.
      </p>
    );
  }

  const classLabel = `${child.classLabel?.trim() || "Class"} ${child.sectionLabel?.trim() || ""}`.trim();

  return (
    <div className="min-w-0 max-w-full" key={child.id}>
      <PageHeader
        title="Academic Performance"
        subtitle={`${studentLabel(child)} • ${classLabel}`}
      />
      {students.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {students.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={s.id === child.id ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setActiveChildId(s.id)}
            >
              {studentLabel(s)}
            </Button>
          ))}
        </div>
      )}
      {reportCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published report cards yet.</p>
      ) : (
        <ReportCardView reportCards={reportCards} hideDrafts hideRank />
      )}
    </div>
  );
}

function DemoParentMarks() {
  const portal = useParentPortal();
  const publishedTick = useLocalStorageExternalStore(LEARNER_PUBLISHED_MARKS_KEY);

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
  const fromAdmin = publishedReportCardsForLearner({
    name: child.name,
    rollNo: child.rollNo,
    className: child.className,
    section: child.section,
  });
  // publishedTick forces refresh when another tab publishes marks
  void publishedTick;
  const reportCards = mergeReportCards(rc, fromAdmin);

  return (
    <div className="min-w-0 max-w-full" key={portal.activeChildId}>
      <PageHeader
        title="Academic Performance"
        subtitle={`${child.name} • ${child.className} ${child.section} • Avg ${child.avgScore}%`}
      />
      <ReportCardView reportCards={reportCards} termPerformance={perf} hideDrafts />
    </div>
  );
}
