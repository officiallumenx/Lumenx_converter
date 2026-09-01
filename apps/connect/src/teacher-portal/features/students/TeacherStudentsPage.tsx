import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { sectionsForClassName, uniqueSortedClassNames } from "@/lib/class-section-options";
import { teacherRepository } from "@/lib/teacher/repositories";
import { StudentAccordionList } from "./StudentAccordionList";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { Search, Users } from "lucide-react";

export function TeacherStudentsPage() {
  const portal = useTeacherPortal();
  const apiMode = isApiAuthMode();
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [classNames, setClassNames] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (!portal.isTeacher) return;
    if (apiMode) {
      setClassNames(uniqueSortedClassNames(portal.classes));
      return;
    }
    teacherRepository.getInstituteClassNames().then(setClassNames);
  }, [portal.isTeacher, portal.classes, apiMode]);

  useEffect(() => {
    if (!portal.isTeacher) return;
    if (apiMode) {
      const next = sectionsForClassName(
        portal.classes,
        classFilter === "all" ? "all" : classFilter,
      );
      setSections(next);
      setSectionFilter((prev) => (prev !== "all" && !next.includes(prev) ? "all" : prev));
      return;
    }
    const grade = classFilter === "all" ? undefined : classFilter;
    teacherRepository.getInstituteSections(grade).then((next) => {
      setSections(next);
      setSectionFilter((prev) => (prev !== "all" && !next.includes(prev) ? "all" : prev));
    });
  }, [portal.isTeacher, classFilter, apiMode, portal.classes]);

  const filtered = useMemo(() => {
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
          s.className.toLowerCase().includes(t) ||
          s.section.toLowerCase().includes(t) ||
          `${s.className}-${s.section}`.toLowerCase().includes(t),
      );
    }
    return list;
  }, [portal, classFilter, sectionFilter, q]);

  if (!portal.isTeacher) return null;
  if (portal.isLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Students"
        subtitle="Filter by class and section — tap a student to expand details"
      />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Select
            value={classFilter}
            onValueChange={(v) => {
              setClassFilter(v);
              setSectionFilter("all");
              setListKey((k) => k + 1);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl">
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
          <Select
            value={sectionFilter}
            onValueChange={(v) => {
              setSectionFilter(v);
              setListKey((k) => k + 1);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl">
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or roll…"
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} students · Tap again to collapse · Tap another to switch
      </p>

      {filtered.length ? (
        <StudentAccordionList
          key={listKey}
          students={filtered}
          showClassLabel={classFilter === "all" || sectionFilter === "all"}
          apiMode={apiMode}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Try a different class, section, or search term."
        />
      )}
    </div>
  );
}
