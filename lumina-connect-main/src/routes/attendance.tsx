import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { studentsInClass, subjects, childProfile, studentProfile } from "@/lib/mock-data";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Check, Save, UserCheck, UserX, CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Unify" }] }),
  component: () => (
    <AppShell>
      <AttendancePage />
    </AppShell>
  ),
});

function AttendancePage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherAttendance />;
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
                        {s.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
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
      <div className="fixed inset-x-0 z-[45] min-w-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:relative lg:inset-auto lg:z-auto lg:pb-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-auto">
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
  const portal = useParentPortal();

  const who =
    role === "parent" && portal.isParent && portal.snapshot
      ? portal.snapshot.child.name
      : role === "parent"
        ? childProfile.name
        : studentProfile.name;

  const days = useMemo(() => {
    if (role === "parent" && portal.isParent && portal.snapshot) {
      return portal.snapshot.attendanceDays;
    }
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      status: i % 11 === 0 ? "absent" : i % 17 === 0 ? "leave" : "present",
    })) as { day: number; status: "present" | "absent" | "leave" }[];
  }, [role, portal]);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={
          role === "parent" && portal.isParent && portal.snapshot
            ? `${who} • ${portal.snapshot.classTag} • This month`
            : `${who} • This month`
        }
      />
      <div
        key={role === "parent" && portal.isParent ? portal.activeChildId : "student-att"}
        className="mb-5 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3"
      >
        <SummaryCard
          label="Present"
          value={`${days.filter((d) => d.status === "present").length}`}
          tone="success"
        />
        <SummaryCard
          label="Absent"
          value={`${days.filter((d) => d.status === "absent").length}`}
          tone="destructive"
        />
        <SummaryCard
          label="Leave"
          value={`${days.filter((d) => d.status === "leave").length}`}
          tone="warning"
        />
      </div>

      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />{" "}
          <span className="min-w-0 truncate">November 2025</span>
        </div>
        <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((d) => (
            <div
              key={d.day}
              className={cn(
                "aspect-square rounded-xl grid place-items-center text-sm font-medium border",
                d.status === "present" && "bg-success/10 text-success border-success/20",
                d.status === "absent" && "bg-destructive/10 text-destructive border-destructive/20",
                d.status === "leave" && "bg-warning/15 text-warning-foreground border-warning/30",
              )}
            >
              {d.day}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "destructive" | "warning";
}) {
  const cls = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];
  return (
    <div className={cn("rounded-2xl p-5 border border-border", cls)}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-display text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
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
