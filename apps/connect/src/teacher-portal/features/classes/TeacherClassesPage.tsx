import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, Users, ClipboardCheck, TrendingUp, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { ClassCard } from "@/teacher-portal/shared/ui/ClassCard";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { StudentAccordionList } from "../students/StudentAccordionList";
import { Badge, Button } from "@lumenx/ui";
import type { TeacherClass, TeacherStudent } from "@/lib/teacher/types";

export function TeacherClassesPage({ selectedId }: { selectedId?: string }) {
  const portal = useTeacherPortal();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const selected = useMemo(
    () => portal.isTeacher && portal.classes.find((c) => c.id === selectedId),
    [portal, selectedId],
  );

  const loadStudents = useCallback(async (classId: string) => {
    setLoadingStudents(true);
    const s = await teacherRepository.getStudents(classId);
    setStudents(s);
    setLoadingStudents(false);
  }, []);

  useEffect(() => {
    if (selectedId) {
      setStudents([]);
      void loadStudents(selectedId);
    }
  }, [selectedId, loadStudents]);

  if (!portal.isTeacher) return null;
  if (portal.isLoading) return <PageSkeleton />;

  if (selectedId && selected) {
    return (
      <ClassDetailView cls={selected} students={students} loading={loadingStudents} />
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="My Classes"
        subtitle={`${portal.classes.length} assigned classes · ${portal.profile?.subjects.join(", ")}`}
      />
      {portal.classes.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {portal.classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LayoutGrid}
          title="No classes assigned"
          description="Your class assignments will appear here once configured by admin."
        />
      )}
    </div>
  );
}

function ClassDetailView({
  cls,
  students,
  loading,
}: {
  cls: TeacherClass;
  students: TeacherStudent[];
  loading: boolean;
}) {
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title={`Class ${cls.className}-${cls.section}`}
        subtitle={`${cls.subject} · ${cls.studentCount} students`}
        action={
          <Link to="/classes">
            <Button variant="outline" className="rounded-xl">
              All classes
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { icon: Users, label: "Students", value: String(cls.studentCount) },
          { icon: ClipboardCheck, label: "Attendance", value: `${cls.attendanceRate}%` },
          { icon: BookOpen, label: "Homework", value: `${cls.homeworkSubmissionRate}%` },
          { icon: TrendingUp, label: "Avg score", value: `${cls.avgScore}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center sm:p-4">
            <s.icon className="mx-auto mb-1 size-4 text-primary" />
            <div className="text-[10px] uppercase text-muted-foreground">{s.label}</div>
            <div className="font-display text-lg font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/attendance" search={{ classId: cls.id }}>
          <Button className="rounded-xl gap-2">
            <ClipboardCheck className="size-4" /> Take attendance
          </Button>
        </Link>
        <Link to="/assignments">
          <Button variant="outline" className="rounded-xl gap-2">
            <BookOpen className="size-4" /> Assignments
          </Button>
        </Link>
        <Link to="/students">
          <Button variant="outline" className="rounded-xl">
            View all students
          </Button>
        </Link>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Students</h2>
            <p className="text-xs text-muted-foreground">Tap to expand · tap again to close</p>
          </div>
          {cls.isClassTeacher ? (
            <Badge className="border-0 bg-primary/15 text-primary">Class teacher</Badge>
          ) : null}
        </div>
        {loading ? (
          <PageSkeleton rows={3} />
        ) : students.length ? (
          <StudentAccordionList students={students} showClassLabel={false} />
        ) : (
          <EmptyState icon={Users} title="No students" description="This class roster is empty." />
        )}
      </section>
    </div>
  );
}
