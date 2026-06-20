import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { teacherRepository } from "@/lib/teacher/repositories";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { Avatar, AvatarFallback, Badge, Button } from "@lumenx/ui";
import { ArrowLeft, UserX } from "lucide-react";
import { toast } from "sonner";
import type { RemarkType, StudentDetail, StudentReturnContext } from "@/lib/teacher/types";

/** Full-page student profile (e.g. from global search). List views use StudentAccordionList instead. */
export function TeacherStudentDetailPage({
  studentId,
  returnTo,
}: {
  studentId: string;
  returnTo?: StudentReturnContext;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    teacherRepository.getStudent(studentId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [studentId]);

  const addRemark = async (type: RemarkType, text: string) => {
    await teacherRepository.addRemark(studentId, { type, text });
    toast.success("Remark added");
    load();
  };

  const backTo =
    returnTo?.from === "classes" && returnTo.classId
      ? { to: "/classes" as const, search: { id: returnTo.classId }, label: "Back to class" }
      : { to: "/students" as const, search: undefined, label: "Back to students" };

  if (loading) return <PageSkeleton rows={6} />;

  if (!detail) {
    return (
      <EmptyState
        icon={UserX}
        title="Student not found"
        description="This student may not be in the institute roster."
        action={
          <Link to="/students">
            <Button className="rounded-xl">Back to students</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title={detail.name}
        subtitle={`Roll ${detail.roll} · Class ${detail.className}-${detail.section}`}
        action={
          <Link to={backTo.to} search={backTo.search}>
            <Button variant="outline" className="rounded-xl gap-2">
              <ArrowLeft className="size-4" /> {backTo.label}
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <Avatar className="size-16 shrink-0">
          <AvatarFallback className="text-lg">{detail.avatarInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 bg-success/15 text-success">{detail.attendancePct}% attendance</Badge>
            <Badge className="border-0 bg-primary/15 text-primary">{detail.homeworkSubmissionPct}% homework</Badge>
            <Badge variant="outline">{detail.avgScore}% avg · Grade {detail.grade}</Badge>
          </div>
        </div>
      </div>

      <StudentDetailPanel detail={detail} onAddRemark={addRemark} />
    </div>
  );
}



