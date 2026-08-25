import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { isTeacherAccessDenied } from "@/lib/teacher/portal-access-guard";
import { RemarkForm } from "@/teacher-portal/shared/ui/RemarkForm";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import { PenLine, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import type { RemarkType, StudentRemark } from "@/lib/teacher/types";

const TYPE_LABEL: Record<RemarkType, string> = {
  academic: "Academic",
  behaviour: "Behaviour",
  improvement: "Improvement",
  parent_note: "Parent note",
};

export function TeacherRemarksPage() {
  const portal = useTeacherPortal();
  const [remarks, setRemarks] = useState<StudentRemark[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [classNames, setClassNames] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [editRemark, setEditRemark] = useState<StudentRemark | null>(null);
  const [editText, setEditText] = useState("");

  const load = () => {
    setLoading(true);
    teacherRepository.getAllRemarks().then((r) => {
      setRemarks(r);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (portal.isTeacher) load();
  }, [portal.isTeacher]);

  useEffect(() => {
    if (!portal.isTeacher) return;
    teacherRepository.getInstituteClassNames().then(setClassNames);
  }, [portal.isTeacher]);

  useEffect(() => {
    if (!portal.isTeacher) return;
    const grade = classFilter === "all" ? undefined : classFilter;
    teacherRepository.getInstituteSections(grade).then((next) => {
      setSections(next);
      setSectionFilter((prev) => (prev !== "all" && !next.includes(prev) ? "all" : prev));
    });
  }, [portal.isTeacher, classFilter]);

  const studentOptions = useMemo(() => {
    if (!portal.isTeacher) return [];
    let list = portal.students;
    if (classFilter !== "all") list = list.filter((s) => s.className === classFilter);
    if (sectionFilter !== "all") list = list.filter((s) => s.section === sectionFilter);
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(t) ||
          s.roll.includes(t) ||
          s.section.toLowerCase().includes(t) ||
          `${s.className}-${s.section}`.toLowerCase().includes(t),
      );
    }
    return list.slice(0, 40);
  }, [portal, classFilter, sectionFilter, q]);

  useEffect(() => {
    if (studentId && !studentOptions.some((s) => s.id === studentId)) {
      setStudentId("");
    }
  }, [studentId, studentOptions]);

  const addRemark = async (type: RemarkType, text: string) => {
    if (!studentId) {
      toast.error("Select a student first");
      return;
    }
    try {
      await teacherRepository.addRemark(studentId, { type, text });
    } catch (error) {
      if (isTeacherAccessDenied(error)) return;
      throw error;
    }
    toast.success("Remark added");
    load();
  };

  const saveEdit = async () => {
    if (!editRemark || editText.trim().length < 8) return;
    try {
      await teacherRepository.updateRemark(editRemark.id, editText.trim());
    } catch (error) {
      if (isTeacherAccessDenied(error)) return;
      throw error;
    }
    toast.success("Remark updated");
    setEditRemark(null);
    load();
  };

  if (!portal.isTeacher) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Remarks"
        subtitle="Add feedback for students — visible to parent and admin, not the student"
      />

      <div className="max-w-2xl space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select
              value={classFilter}
              onValueChange={(v) => {
                setClassFilter(v);
                setSectionFilter("all");
                setStudentId("");
              }}
            >
              <SelectTrigger className="mt-1 h-10 rounded-xl">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="all">All classes</SelectItem>
                {classNames.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Section</label>
            <Select
              value={sectionFilter}
              onValueChange={(v) => {
                setSectionFilter(v);
                setStudentId("");
              }}
            >
              <SelectTrigger className="mt-1 h-10 rounded-xl">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="all">All sections</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Search student</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or roll…"
              className="h-10 rounded-xl pl-9"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Student</label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue
                placeholder={
                  studentOptions.length ? "Select student" : "No matches — refine filters"
                }
              />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · Roll {s.roll} · {s.className}-{s.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <RemarkForm onSubmit={addRemark} />
      </div>

      {loading ? (
        <PageSkeleton rows={4} />
      ) : remarks.length ? (
        <ul className="space-y-3">
          {remarks.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{r.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[r.type]} · {r.createdAt}
                  </p>
                </div>
                {r.id.startsWith("rm-") && !r.id.startsWith("rm-seed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1"
                    onClick={() => {
                      setEditRemark(r);
                      setEditText(r.text);
                    }}
                  >
                    <Pencil className="size-3" /> Edit
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm">{r.text}</p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                Visible: teacher, parent, admin · not student
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={PenLine}
          title="No remarks yet"
          description="Select a student above and add your first remark."
        />
      )}

      <Dialog open={!!editRemark} onOpenChange={(o) => !o && setEditRemark(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit remark</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditRemark(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
