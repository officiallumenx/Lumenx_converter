import { createFileRoute } from "@tanstack/react-router";
import { getInitials } from "@lumenx/utils";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { Button } from "@lumenx/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { studentsInClass, subjects, childProfile } from "@/lib/mock-data";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Check, Save, UserCheck, UserX, CalendarDays, Search } from "lucide-react";
import { Input } from "@lumenx/ui";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { TeacherAttendancePage } from "@/teacher-portal";
import { StudentAttendancePage } from "@/student-portal";
import { AttendanceOverview } from "@/components/app/attendance/AttendanceOverview";
import { seedFromString } from "@/lib/attendance/calendar";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AttendancePage />
    </AppShell>
  ),
});

function AttendancePage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherAttendancePage />;
  return <ViewAttendance />;
}

function TeacherAttendance() {
  const [cls, setCls] = useState("10");
  const [section, setSection] = useState("B");
  const [subject, setSubject] = useState(subjects[0]);
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const filteredStudents = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return studentsInClass;
    return studentsInClass.filter(
      (s) => s.name.toLowerCase().includes(t) || s.roll.toLowerCase().includes(t),
    );
  }, [q]);

  const presentInView = filteredStudents.filter((s) => !absent.has(s.id)).length;
  const totalInView = filteredStudents.length;

  const toggle = (id: string) =>
    setAbsent((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const absentInView = filteredStudents.filter((s) => absent.has(s.id)).length;

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const present = filteredStudents.filter((s) => !absent.has(s.id)).length;
      toast.success(`Attendance saved`, {
        description: `${present} present • ${absentInView} absent (this list)`,
      });
    }, 600);
  };

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Tap students who are absent. Everyone else is marked present."
      />

      <div className="mb-5 grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Class">
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["8", "9", "10", "11", "12"].map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Section">
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D"].map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subject / Period" className="col-span-2 md:col-span-1">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="mb-4 min-w-0">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Find student
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or roll number…"
            className="h-11 rounded-xl pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mb-28 min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:mb-6">
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-4 sm:px-5">
          <div className="min-w-0 text-sm">
            <span className="font-semibold">
              Class {cls}-{section}
            </span>
            <span className="text-muted-foreground"> • {subject}</span>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5 text-xs sm:gap-2">
            <Badge className="bg-success/15 text-success border-0">
              <UserCheck className="size-3 mr-1" />{" "}
              {filteredStudents.filter((s) => !absent.has(s.id)).length} present
            </Badge>
            <Badge className="bg-destructive/10 text-destructive border-0">
              <UserX className="size-3 mr-1" /> {absentInView} absent
            </Badge>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {filteredStudents.length === 0 ? (
            <li className="px-3 py-10 text-center text-sm text-muted-foreground sm:px-5">
              No students match “{q.trim()}”. Clear the search or try another name or roll number.
            </li>
          ) : (
            filteredStudents.map((s) => {
              const isAbsent = absent.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex min-w-0 w-full items-center gap-2 px-3 py-3 text-left transition-colors sm:gap-3 sm:px-5",
                      isAbsent ? "bg-destructive/5" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="w-7 shrink-0 text-xs font-medium text-muted-foreground">
                      {s.roll}
                    </div>
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(s.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 truncate font-medium">{s.name}</div>
                    <div
                      className={cn(
                        "size-9 rounded-full grid place-items-center transition-all",
                        isAbsent
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-success/15 text-success",
                      )}
                    >
                      {isAbsent ? <UserX className="size-4" /> : <Check className="size-4" />}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Sticky save — sits above bottom nav on mobile */}
      <div className="fixed inset-x-0 z-[45] min-w-0 pb-[max(0.5rem,var(--safe-area-bottom))] lg:relative lg:inset-auto lg:z-auto lg:pb-0 bottom-[calc(4.25rem+var(--safe-area-bottom))] lg:bottom-auto">
        <div className="min-w-0 px-3 lg:mx-auto lg:max-w-6xl lg:px-8">
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border p-3 glass shadow-elevated sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:p-3">
            <div className="min-w-0 text-center text-sm sm:flex-1 sm:text-left">
              <span className="font-semibold">{presentInView}</span>
              <span className="text-muted-foreground"> of {totalInView} present</span>
              {q.trim() ? (
                <span className="block text-xs text-muted-foreground sm:inline sm:ml-1">
                  (filtered list)
                </span>
              ) : null}
            </div>
            <Button
              onClick={save}
              disabled={saving}
              size="lg"
              className="w-full shrink-0 rounded-xl shadow-glow gap-2 sm:w-auto sm:min-w-[11rem]"
            >
              <Save className="size-4" /> {saving ? "Saving…" : "Save attendance"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function ViewAttendance() {
  const { role } = useApp();
  if (role === "student") return <StudentAttendancePage />;
  return <ParentAttendanceView />;
}

function ParentAttendanceView() {
  const portal = useParentPortal();

  if (portal.isParent && portal.isLoading && !portal.snapshot) {
    return (
      <>
        <PageHeader title="Attendance" subtitle="Loading attendance for your child…" />
      </>
    );
  }

  const snap = portal.isParent ? portal.snapshot : null;
  const who = snap?.child.name ?? childProfile.name;
  const classTag = snap?.classTag ?? `${childProfile.className}-${childProfile.section}`;
  const seed = snap ? seedFromString(snap.child.id) : 0;

  return <AttendanceOverview subtitle={`${who} · ${classTag}`} seed={seed} />;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
