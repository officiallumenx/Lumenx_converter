import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardCheck,
  Bell,
  Calendar,
  MessageSquare,
  CalendarDays,
  FileText,
  LayoutGrid,
  Wallet,
  History,
  Trophy,
  PenLine,
  Sparkles,
  ShieldAlert,
  Siren,
  CalendarOff,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@lumenx/ui";
import { Button } from "@lumenx/ui";
import {
  studentsInClass,
  teachers,
  assignments,
  exams,
  schoolEvents,
  fees,
  reportCards,
  categorizedNotifications,
} from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { studentRepository } from "@/lib/student/repositories";
import { parentRepository } from "@/lib/parent/repositories";
import { getRecentSearches, pushRecentSearch } from "@/lib/search-recent";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [parentQuery, setParentQuery] = useState("");
  const [teacherResults, setTeacherResults] = useState<Awaited<ReturnType<typeof teacherRepository.search>> | null>(null);
  const [studentResults, setStudentResults] = useState<Awaited<ReturnType<typeof studentRepository.search>> | null>(null);
  const [parentResults, setParentResults] = useState<Awaited<ReturnType<typeof parentRepository.search>> | null>(null);
  const nav = useNavigate();
  const { role, studentIncludedMode, activeChildId, activeInstituteId } = useApp();
  const portal = useParentPortal();
  const teacherPortal = useTeacherPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const isTeacher = role === "teacher";
  const showClassRoster = isTeacher;
  const teacherStudents = teacherPortal.isTeacher ? teacherPortal.students : [];
  const teacherClasses = teacherPortal.isTeacher ? teacherPortal.classes : [];

  const assignmentSearch = snap?.assignments ?? assignments;
  const reportSearch = snap?.reportCards ?? reportCards;

  useEffect(() => {
    if (!open) {
      setTeacherQuery("");
      setStudentQuery("");
      setParentQuery("");
      setTeacherResults(null);
      setStudentResults(null);
      setParentResults(null);
      return;
    }
    if (isTeacher) {
      const t = setTimeout(() => {
        teacherRepository.search(teacherQuery).then(setTeacherResults);
      }, 200);
      return () => clearTimeout(t);
    }
    if (role === "student") {
      const t = setTimeout(() => {
        studentRepository.search(studentQuery).then(setStudentResults);
      }, 200);
      return () => clearTimeout(t);
    }
    if (role === "parent") {
      const t = setTimeout(() => {
        parentRepository
          .search(activeInstituteId, activeChildId, studentIncludedMode, parentQuery)
          .then(setParentResults);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, isTeacher, role, teacherQuery, studentQuery, parentQuery, activeChildId, activeInstituteId, studentIncludedMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notifs = useMemo(() => {
    if (role === "parent" && snap) return snap.notifications;
    return categorizedNotifications[role ?? "student"] ?? [];
  }, [role, snap]);

  const recent = useMemo(() => (open ? getRecentSearches() : []), [open]);

  const go = (to: string, label?: string) => {
    setOpen(false);
    if (label) pushRecentSearch({ label, path: to });
    nav({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex h-9 rounded-xl gap-2 text-muted-foreground font-normal pr-2"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="ml-2 hidden lg:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="md:hidden"
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={
            isTeacher
              ? teacherQuery
              : role === "student"
                ? studentQuery
                : role === "parent"
                  ? parentQuery
                  : undefined
          }
          onValueChange={
            isTeacher
              ? setTeacherQuery
              : role === "student"
                ? setStudentQuery
                : role === "parent"
                  ? setParentQuery
                  : undefined
          }
          placeholder={
            isTeacher
              ? "Search students, classes, assignments, exams, events, messages…"
              : role === "student"
              ? "Search attendance, marks, certificates, timetable…"
              : role === "parent"
                ? snap
                  ? `Search modules for ${snap.shortName} (class ${snap.classTag})…`
                  : "Search modules for your selected learner…"
                : "Search students, teachers, assignments, events…"
          }
        />
        <CommandList className="max-h-[min(420px,70vh)] overflow-y-auto overflow-x-hidden">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick links">
            {isTeacher ? (
              <>
                <CommandItem onSelect={() => go("/classes", "My Classes")}>
                  <LayoutGrid className="size-4 mr-2" />
                  My Classes
                </CommandItem>
                <CommandItem onSelect={() => go("/students", "Students")}>
                  <Users className="size-4 mr-2" />
                  Students
                </CommandItem>
                <CommandItem onSelect={() => go("/remarks", "Remarks")}>
                  <PenLine className="size-4 mr-2" />
                  Remarks
                </CommandItem>
                <CommandItem onSelect={() => go("/assignments", "Assignments")}>
                  <BookOpen className="size-4 mr-2" />
                  Assignments & Homework
                </CommandItem>
                <CommandItem onSelect={() => go("/leave", "Leave management")}>
                  <CalendarOff className="size-4 mr-2" />
                  Leave
                </CommandItem>
                <CommandItem onSelect={() => go("/alerts", "Leave alerts")}>
                  <Siren className="size-4 mr-2" />
                  Leave alerts
                </CommandItem>
                <CommandItem onSelect={() => go("/timetable", "Timetable")}>
                  <Calendar className="size-4 mr-2" />
                  Timetable
                </CommandItem>
              </>
            ) : role === "student" ? (
              <>
                <CommandItem onSelect={() => go("/attendance", "Attendance")}>
                  <ClipboardCheck className="size-4 mr-2" />
                  Attendance
                </CommandItem>
                <CommandItem onSelect={() => go("/marks", "Marks & report cards")}>
                  <GraduationCap className="size-4 mr-2" />
                  Marks & Report cards
                </CommandItem>
                <CommandItem onSelect={() => go("/timetable", "Timetable")}>
                  <Calendar className="size-4 mr-2" />
                  Timetable
                </CommandItem>
                <CommandItem onSelect={() => go("/growth", "Growth")}>
                  <Sparkles className="size-4 mr-2" />
                  Growth
                </CommandItem>
                <CommandItem onSelect={() => go("/assignments", "Assignments")}>
                  <BookOpen className="size-4 mr-2" />
                  Assignments
                </CommandItem>
                <CommandItem onSelect={() => go("/alerts", "Alerts")}>
                  <Siren className="size-4 mr-2" />
                  Alerts
                </CommandItem>
                <CommandItem onSelect={() => go("/exams", "Exams")}>
                  <GraduationCap className="size-4 mr-2" />
                  Exams
                </CommandItem>
                <CommandItem onSelect={() => go("/events", "Events")}>
                  <CalendarDays className="size-4 mr-2" />
                  Events
                </CommandItem>
                <CommandItem onSelect={() => go("/fees", "Fees")}>
                  <Wallet className="size-4 mr-2" />
                  Fees
                </CommandItem>
                <CommandItem onSelect={() => go("/sports", "Sports")}>
                  <Trophy className="size-4 mr-2" />
                  Sports
                </CommandItem>
                <CommandItem onSelect={() => go("/teachers", "Teachers")}>
                  <Users className="size-4 mr-2" />
                  Teachers
                </CommandItem>
                <CommandItem onSelect={() => go("/messages", "Messages")}>
                  <MessageSquare className="size-4 mr-2" />
                  Messages
                </CommandItem>
                <CommandItem onSelect={() => go("/complaints", "Complaints")}>
                  <ShieldAlert className="size-4 mr-2" />
                  Complaints
                </CommandItem>
                <CommandItem onSelect={() => go("/academic-history", "Academic history")}>
                  <History className="size-4 mr-2" />
                  Academic History
                </CommandItem>
                <CommandItem onSelect={() => go("/achievements", "Achievements")}>
                  <Trophy className="size-4 mr-2" />
                  Achievements
                </CommandItem>
                <CommandItem onSelect={() => go("/certificates", "Certificates")}>
                  <FileText className="size-4 mr-2" />
                  Certificates
                </CommandItem>
                <CommandItem onSelect={() => go("/id-card", "Digital ID card")}>
                  <FileText className="size-4 mr-2" />
                  Digital ID Card
                </CommandItem>
                <CommandItem onSelect={() => go("/notifications", "Notifications")}>
                  <Bell className="size-4 mr-2" />
                  Notifications
                </CommandItem>
                <CommandItem onSelect={() => go("/profile", "Settings")}>
                  <LayoutGrid className="size-4 mr-2" />
                  Settings
                </CommandItem>
              </>
            ) : role === "parent" ? (
              <>
                <CommandItem onSelect={() => go("/attendance", "Attendance")}>
                  <ClipboardCheck className="size-4 mr-2" />
                  Attendance
                </CommandItem>
                <CommandItem onSelect={() => go("/leave", "Leave management")}>
                  <CalendarOff className="size-4 mr-2" />
                  Leave
                </CommandItem>
                <CommandItem onSelect={() => go("/assignments", "Assignments")}>
                  <BookOpen className="size-4 mr-2" />
                  Assignments & Homework
                </CommandItem>
                <CommandItem onSelect={() => go("/alerts", "Alerts")}>
                  <Siren className="size-4 mr-2" />
                  Alerts
                </CommandItem>
                <CommandItem onSelect={() => go("/marks", "Marks & report cards")}>
                  <GraduationCap className="size-4 mr-2" />
                  Marks & Report cards
                </CommandItem>
                <CommandItem onSelect={() => go("/fees", "Fees")}>
                  <Wallet className="size-4 mr-2" />
                  Fees
                </CommandItem>
                <CommandItem onSelect={() => go("/timetable", "Timetable")}>
                  <Calendar className="size-4 mr-2" />
                  Timetable
                </CommandItem>
                <CommandItem onSelect={() => go("/messages", "Messages")}>
                  <MessageSquare className="size-4 mr-2" />
                  Messages
                </CommandItem>
                <CommandItem onSelect={() => go("/events", "Events & holidays")}>
                  <CalendarDays className="size-4 mr-2" />
                  Events & Holidays
                </CommandItem>
                <CommandItem onSelect={() => go("/sports", "Sports")}>
                  <Trophy className="size-4 mr-2" />
                  Sports
                </CommandItem>
                <CommandItem onSelect={() => go("/teachers", "Teachers")}>
                  <Users className="size-4 mr-2" />
                  Teachers
                </CommandItem>
                <CommandItem onSelect={() => go("/complaints", "Complaints")}>
                  <ShieldAlert className="size-4 mr-2" />
                  Complaints
                </CommandItem>
                {studentIncludedMode && (
                  <>
                    <CommandItem onSelect={() => go("/growth", "Growth")}>
                      <Sparkles className="size-4 mr-2" />
                      Growth
                    </CommandItem>
                    <CommandItem onSelect={() => go("/id-card", "Digital ID card")}>
                      <FileText className="size-4 mr-2" />
                      Digital ID Card
                    </CommandItem>
                  </>
                )}
                <CommandItem onSelect={() => go("/notifications", "Notifications")}>
                  <Bell className="size-4 mr-2" />
                  Notifications
                </CommandItem>
                <CommandItem onSelect={() => go("/profile", "Settings")}>
                  <LayoutGrid className="size-4 mr-2" />
                  Settings
                </CommandItem>
              </>
            ) : null}
          </CommandGroup>

          {role === "student" && studentResults && studentQuery.trim() && (
            <>
              <CommandSeparator />
              {studentResults.modules.length > 0 && (
                <CommandGroup heading="Modules">
                  {studentResults.modules.map((m) => (
                    <CommandItem
                      key={m.path}
                      value={`module ${m.label}`}
                      onSelect={() => go(m.path, m.label)}
                    >
                      <LayoutGrid className="size-4 mr-2 text-muted-foreground" />
                      {m.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studentResults.subjects.length > 0 && (
                <CommandGroup heading="Timetable">
                  {studentResults.subjects.map((s, i) => (
                    <CommandItem
                      key={`${s.day}-${s.time}-${i}`}
                      value={`subject ${s.subject} ${s.day}`}
                      onSelect={() => go("/timetable", `${s.subject} · ${s.day}`)}
                    >
                      <Calendar className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">
                        {s.subject} · {s.day}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground truncate max-w-[5rem]">
                        {s.time}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studentResults.reportCards.length > 0 && (
                <CommandGroup heading="Report cards">
                  {studentResults.reportCards.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={`report ${r.term}`}
                      onSelect={() => go("/marks", r.term)}
                    >
                      <GraduationCap className="size-4 mr-2 text-muted-foreground" />
                      {r.term}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {r.percentage}%
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studentResults.certificates.length > 0 && (
                <CommandGroup heading="Certificates">
                  {studentResults.certificates.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`cert ${c.title}`}
                      onSelect={() => go("/certificates", c.title)}
                    >
                      <FileText className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{c.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studentResults.achievements.length > 0 && (
                <CommandGroup heading="Achievements">
                  {studentResults.achievements.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`achievement ${a.title}`}
                      onSelect={() => go("/achievements", a.title)}
                    >
                      <Trophy className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{a.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studentResults.teachers.length > 0 && (
                <CommandGroup heading="Teachers">
                  {studentResults.teachers.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`teacher ${t.name}`}
                      onSelect={() => go("/teachers", t.name)}
                    >
                      <Users className="size-4 mr-2 text-muted-foreground" />
                      {t.name}
                      <span className="ml-auto text-xs text-muted-foreground">{t.subject}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studentResults.notifications.length > 0 && (
                <CommandGroup heading="Notifications">
                  {studentResults.notifications.map((n) => (
                    <CommandItem
                      key={n.id}
                      value={`notif ${n.title}`}
                      onSelect={() => go("/notifications", n.title)}
                    >
                      <Bell className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{n.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}

          {role === "parent" && parentResults && parentQuery.trim() && (
            <>
              <CommandSeparator />
              {parentResults.modules.length > 0 && (
                <CommandGroup heading="Modules">
                  {parentResults.modules.map((m) => (
                    <CommandItem
                      key={m.path}
                      value={`module ${m.label}`}
                      onSelect={() => go(m.path, m.label)}
                    >
                      <LayoutGrid className="size-4 mr-2 text-muted-foreground" />
                      {m.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {parentResults.assignments.length > 0 && (
                <CommandGroup heading="Assignments">
                  {parentResults.assignments.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`assignment ${a.title}`}
                      onSelect={() => go("/assignments", a.title)}
                    >
                      <BookOpen className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{a.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{a.subject}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {parentResults.reportCards.length > 0 && (
                <CommandGroup heading="Report cards">
                  {parentResults.reportCards.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={`report ${r.term}`}
                      onSelect={() => go("/marks", r.term)}
                    >
                      <GraduationCap className="size-4 mr-2 text-muted-foreground" />
                      {r.term}
                      <span className="ml-auto text-xs text-muted-foreground">{r.percentage}%</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {parentResults.teachers.length > 0 && (
                <CommandGroup heading="Teachers">
                  {parentResults.teachers.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`teacher ${t.name}`}
                      onSelect={() => go("/teachers", t.name)}
                    >
                      <Users className="size-4 mr-2 text-muted-foreground" />
                      {t.name}
                      <span className="ml-auto text-xs text-muted-foreground">{t.subject}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {parentResults.notifications.length > 0 && (
                <CommandGroup heading="Notifications">
                  {parentResults.notifications.map((n) => (
                    <CommandItem
                      key={n.id}
                      value={`notif ${n.title}`}
                      onSelect={() => go("/notifications", n.title)}
                    >
                      <Bell className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{n.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}

          {isTeacher && teacherResults && teacherQuery.trim() && (
            <>
              <CommandSeparator />
              {teacherResults.assignments.length > 0 && (
                <CommandGroup heading="Assignments">
                  {teacherResults.assignments.map((a) => (
                    <CommandItem key={a.id} value={`assignment ${a.title}`} onSelect={() => go("/assignments", a.title)}>
                      <BookOpen className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{a.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {teacherResults.exams.length > 0 && (
                <CommandGroup heading="Exams">
                  {teacherResults.exams.map((e) => (
                    <CommandItem key={e.id} value={`exam ${e.name}`} onSelect={() => go("/exams", e.name)}>
                      <FileText className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{e.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {teacherResults.events.length > 0 && (
                <CommandGroup heading="Events">
                  {teacherResults.events.map((e) => (
                    <CommandItem key={e.id} value={`event ${e.title}`} onSelect={() => go("/events", e.title)}>
                      <CalendarDays className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{e.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {teacherResults.messages.length > 0 && (
                <CommandGroup heading="Messages">
                  {teacherResults.messages.map((m) => (
                    <CommandItem key={m.id} value={`message ${m.subject}`} onSelect={() => go("/messages", m.subject)}>
                      <MessageSquare className="size-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{m.subject}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}

          {recent.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent">
                {recent.map((r) => (
                  <CommandItem
                    key={`${r.path}-${r.at}`}
                    value={`recent ${r.label} ${r.path}`}
                    onSelect={() => go(r.path, r.label)}
                  >
                    <History className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {showClassRoster && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Students (your classes)">
                {(isTeacher ? teacherStudents : studentsInClass).slice(0, 8).map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`student ${s.name} ${s.roll}`}
                    onSelect={() =>
                      go(
                        isTeacher ? `/students/${s.id}` : "/attendance",
                        `Student ${s.name}`,
                      )
                    }
                  >
                    <Users className="size-4 mr-2 text-muted-foreground" />
                    <span>{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Roll {s.roll}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {isTeacher && teacherClasses.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Classes">
                    {teacherClasses.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`class ${c.className} ${c.section} ${c.subject}`}
                        onSelect={() => go(`/classes?id=${c.id}`, `Class ${c.className}-${c.section}`)}
                      >
                        <LayoutGrid className="size-4 mr-2 text-muted-foreground" />
                        <span>
                          Class {c.className}-{c.section}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">{c.subject}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}

          {role === "student" && !studentQuery.trim() && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Teachers">
                {teachers.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`teacher ${t.name} ${t.subject}`}
                    onSelect={() => go("/teachers", `Teacher ${t.name}`)}
                  >
                    <Users className="size-4 mr-2 text-muted-foreground" />
                    <span>{t.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{t.subject}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Assignments">
                {assignments.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`assignment ${a.title} ${a.subject}`}
                    onSelect={() => go("/assignments", a.title)}
                  >
                    <BookOpen className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{a.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{a.subject}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Exams & Report cards">
                {exams.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`exam ${e.title} ${e.subject}`}
                    onSelect={() => go("/exams", e.title)}
                  >
                    <GraduationCap className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{e.date}</span>
                  </CommandItem>
                ))}
                {reportCards.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`report ${r.term}`}
                    onSelect={() => go("/marks", r.term)}
                  >
                    <FileText className="size-4 mr-2 text-muted-foreground" />
                    <span>{r.term}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {r.percentage}% • {r.grade}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Events & Holidays">
                {schoolEvents.slice(0, 8).map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`event ${e.title} ${e.kind}`}
                    onSelect={() => go("/events", e.title)}
                  >
                    <Calendar className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{e.kind}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Sports">
                <CommandItem onSelect={() => go("/sports", "Sports")}>
                  <Trophy className="size-4 mr-2" />
                  Sports overview
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {!isTeacher && role !== "student" && (
            <>
              <CommandSeparator />
              {role !== "student" && (
                <CommandGroup
                  heading={role === "parent" && snap ? `Teachers · ${snap.classTag}` : "Teachers"}
                >
                  {teachers.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`teacher ${t.name} ${t.subject}`}
                      onSelect={() => go("/teachers", `Teacher ${t.name}`)}
                    >
                      <Users className="size-4 mr-2 text-muted-foreground" />
                      <span>{t.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{t.subject}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {role !== "student" && <CommandSeparator />}
              <CommandGroup
                heading={role === "parent" && snap ? `Assignments · ${snap.shortName}` : "Assignments"}
              >
                {assignmentSearch.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`assignment ${a.title} ${a.subject}`}
                    onSelect={() => go("/assignments", a.title)}
                  >
                    <BookOpen className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{a.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{a.subject}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />
              <CommandGroup heading="Exams & Report cards">
                {exams.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`exam ${e.title} ${e.subject}`}
                    onSelect={() => go("/exams", e.title)}
                  >
                    <GraduationCap className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{e.date}</span>
                  </CommandItem>
                ))}
                {reportSearch.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`report ${r.term}`}
                    onSelect={() => go("/marks", r.term)}
                  >
                    <FileText className="size-4 mr-2 text-muted-foreground" />
                    <span>{r.term}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {r.percentage}% • {r.grade}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />
              <CommandGroup heading="Events & Holidays">
                {schoolEvents.slice(0, 8).map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`event ${e.title} ${e.kind}`}
                    onSelect={() => go("/events", e.title)}
                  >
                    <Calendar className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{e.kind}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {role === "parent" && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Fees">
                <CommandItem
                  value="fee dues active learner"
                  onSelect={() => go("/fees", "Fee dues")}
                >
                  <Wallet className="size-4 mr-2 text-muted-foreground" />
                  <span>Fee dues (active learner)</span>
                  <span className="ml-auto text-xs text-muted-foreground">Open</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Notifications">
            {notifs.slice(0, 6).map((n) => (
              <CommandItem
                key={n.id}
                value={`notif ${n.title} ${n.desc}`}
                onSelect={() => go("/notifications", n.title)}
              >
                <Bell className="size-4 mr-2 text-muted-foreground" />
                <span className="truncate">{n.title}</span>
                <span className="ml-auto text-xs text-muted-foreground capitalize">
                  {n.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          {!isTeacher && role !== "student" && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Sports">
                <CommandItem onSelect={() => go("/sports", "Sports")}>
                  <Trophy className="size-4 mr-2" />
                  Sports overview
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
