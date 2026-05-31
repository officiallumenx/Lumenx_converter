import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { subjects, teachers } from "@/lib/mock-data";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Unify" }] }),
  component: () => (
    <AppShell>
      <MessagesPage />
    </AppShell>
  ),
});

type RecipientMode = "class_teacher" | "subject_teacher" | "principal";

function MessagesPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const [mode, setMode] = useState<RecipientMode>("class_teacher");
  const [subject, setSubject] = useState(subjects[0]);
  const [text, setText] = useState("");

  const subjectTeachers = useMemo(() => teachers.filter((t) => t.subject === subject), [subject]);
  const classTeacher = useMemo(() => teachers.find((t) => t.isClassTeacher), []);

  const recipientLabel = useMemo(() => {
    if (role === "teacher") return "Staff / family routing (demo)";
    if (mode === "principal") return "Principal's office";
    if (mode === "class_teacher") return classTeacher?.name ?? "Class teacher";
    return subjectTeachers[0]?.name ?? "Subject teacher";
  }, [role, mode, classTeacher, subjectTeachers]);

  const threads = useMemo(() => {
    const base = [
      { who: "Ananya Iyer", last: "Thanks for the update.", time: "2h" },
      { who: "Principal Office", last: "Holiday notice attached.", time: "1d" },
      { who: "Rahul Verma", last: "Aarav did well today.", time: "2d" },
    ];
    if (snap) {
      const n = snap.shortName;
      return base.map((t, i) => (i === 2 ? { ...t, last: `${n} did well in class today.` } : t));
    }
    return base;
  }, [snap]);

  const send = () => {
    if (!text.trim()) return toast.error("Write a message first");
    if (
      (role === "student" || role === "parent") &&
      mode === "subject_teacher" &&
      !subjectTeachers.length
    ) {
      return toast.error("No teacher found for that subject.");
    }
    setText("");
    toast.success(`Message queued for ${recipientLabel}`);
  };

  if (role === "teacher") {
    return (
      <div className="min-w-0 max-w-full">
        <PageHeader title="Messages" subtitle="Reach parents, students or leadership securely." />
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-3 text-sm font-medium">Quick route</div>
          <div className="mb-4 flex flex-wrap gap-2">
            {["Parent", "Student", "Principal", "Entire class"].map((o) => (
              <span
                key={o}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground"
              >
                {o}
              </span>
            ))}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Type your message…"
            className="rounded-xl"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={send} className="gap-2 rounded-xl shadow-glow">
              <Send className="size-4" /> Send
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Messages"
        subtitle={
          snap
            ? `Writing as a guardian about ${snap.child.name} (${snap.classTag}). Choose recipient below.`
            : "Choose who you are writing to, then pick subject teachers by subject when needed."
        }
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2">
          <div className="mb-2 text-sm font-medium">Send to</div>
          <div className="mb-4 flex min-w-0 flex-wrap gap-2">
            {(
              [
                { id: "class_teacher" as const, label: "Class teacher" },
                { id: "subject_teacher" as const, label: "Subject teacher" },
                { id: "principal" as const, label: "Principal" },
              ] satisfies { id: RecipientMode; label: string }[]
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setMode(o.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                  mode === o.id
                    ? "border-primary bg-primary text-primary-foreground shadow-glow"
                    : "border-border bg-muted text-foreground hover:border-primary/40",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === "subject_teacher" && (
            <div className="mb-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Pick subject first</div>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Deliver to: </span>
                <span className="font-medium">
                  {subjectTeachers.map((t) => t.name).join(", ") || "—"}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Only teachers mapped to {subject} receive this thread.
                </span>
              </div>
            </div>
          )}

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Type your message…"
            className="rounded-xl"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={send} className="gap-2 rounded-xl shadow-glow">
              <Send className="size-4" /> Send
            </Button>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h3 className="mb-3 font-semibold">Recent threads</h3>
          <div className="min-w-0 space-y-2">
            {threads.map((t) => (
              <div
                key={t.who}
                className="min-w-0 cursor-pointer rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{t.who}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t.time}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.last}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
