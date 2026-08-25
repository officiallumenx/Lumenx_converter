import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { TeacherMessagesPage } from "@/teacher-portal";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { children } from "@/lib/mock-data";
import { sentMessagesStore } from "@/lib/messages-store";
import { Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@lumenx/ui";
import { toast } from "sonner";
import { Send, User } from "lucide-react";
import { subjects, teachers } from "@/lib/mock-data";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <MessagesPage />
    </AppShell>
  ),
});

type RecipientMode = "class_teacher" | "subject_teacher" | "principal";

function MessagesPage() {
  const { role, activeChildId, setActiveChildId } = useApp();
  const portal = useParentPortal();
  const studentPortal = useStudentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const studentSnap =
    role === "student" && studentPortal.isStudent ? studentPortal.snapshot : null;
  const isParent = role === "parent";
  const isStudent = role === "student";
  const [messageChildId, setMessageChildId] = useState(
    () => activeChildId ?? children[0]?.id ?? "",
  );
  const [mode, setMode] = useState<RecipientMode>("class_teacher");
  const [subject, setSubject] = useState(subjects[0]);
  const [text, setText] = useState("");

  useEffect(() => {
    // Keep the message context in sync with the global active child (header switcher),
    // not just on first mount, so the two never diverge.
    if (isParent && activeChildId) {
      setMessageChildId(activeChildId);
    }
  }, [isParent, activeChildId]);

  const messageChild = useMemo(
    () => children.find((c) => c.id === messageChildId) ?? children[0],
    [messageChildId],
  );

  const subjectTeachers = useMemo(() => teachers.filter((t) => t.subject === subject), [subject]);
  const classTeacher = useMemo(() => teachers.find((t) => t.isClassTeacher), []);

  const recipientLabel = useMemo(() => {
    if (role === "teacher") return "Staff / family routing (demo)";
    if (mode === "principal") return "Principal's office";
    if (mode === "class_teacher") return classTeacher?.name ?? "Class teacher";
    return subjectTeachers[0]?.name ?? "Subject teacher";
  }, [role, mode, classTeacher, subjectTeachers]);

  const sentThreads = useSyncExternalStore(
    sentMessagesStore.subscribe,
    sentMessagesStore.getAll,
    sentMessagesStore.getAll,
  );

  const threads = useMemo(() => {
    const base = isStudent
      ? [
          { id: "seed-1", who: "Ananya Iyer", last: "Bring your notebook tomorrow.", time: "2h" },
          { id: "seed-2", who: "Principal Office", last: "Holiday notice attached.", time: "1d" },
          { id: "seed-3", who: "Rahul Verma", last: "Great work in today's class.", time: "2d" },
        ]
      : [
          { id: "seed-1", who: "Ananya Iyer", last: "Thanks for the update.", time: "2h" },
          { id: "seed-2", who: "Principal Office", last: "Holiday notice attached.", time: "1d" },
          { id: "seed-3", who: "Rahul Verma", last: "Aarav did well today.", time: "2d" },
        ];
    const childName = isParent ? messageChild?.name.split(" ")[0] : snap?.shortName;
    const withChild =
      !isStudent && childName
        ? base.map((t, i) =>
            i === 2 ? { ...t, last: `${childName} did well in class today.` } : t,
          )
        : base;
    // Surface messages the user just sent at the top so "Send" is not phantom state.
    return [...sentThreads, ...withChild];
  }, [snap, isParent, isStudent, messageChild, sentThreads]);

  const send = () => {
    if (isParent && !messageChildId) {
      return toast.error("Select a child first", {
        description: "Messages must be linked to a specific learner.",
      });
    }
    if (!text.trim()) return toast.error("Write a message first");
    if (
      (role === "student" || role === "parent") &&
      mode === "subject_teacher" &&
      !subjectTeachers.length
    ) {
      return toast.error("No teacher found for that subject.");
    }
    const childNote = isParent && messageChild
      ? ` about ${messageChild.name} (${messageChild.className}-${messageChild.section})`
      : "";
    sentMessagesStore.add(`To ${recipientLabel}`, `${text.trim()}${childNote}`);
    setText("");
    toast.success(`Message queued for ${recipientLabel}${childNote}`);
    if (isParent && messageChildId !== activeChildId) {
      setActiveChildId(messageChildId);
    }
  };

  if (role === "teacher") return <TeacherMessagesPage />;

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Messages"
        subtitle={
          isParent
            ? "Select your child first — teachers receive messages linked to that learner."
            : isStudent && studentSnap
              ? `Message your teachers · ${studentSnap.profile.class} ${studentSnap.profile.section}`
              : "Choose who you are writing to, then pick subject teachers by subject when needed."
        }
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2">
          {isParent && (
            <div className="mb-4 space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <User className="size-4 text-primary" />
                Select child before sending
              </div>

              {children.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {children.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setMessageChildId(c.id);
                        setActiveChildId(c.id);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation",
                        messageChildId === c.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {c.name.split(" ")[0]} · {c.className}-{c.section}
                    </button>
                  ))}
                </div>
              ) : null}

              <Select
                value={messageChildId}
                onValueChange={(id) => {
                  setMessageChildId(id);
                  setActiveChildId(id);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border border-input bg-background text-foreground shadow-soft">
                  <SelectValue placeholder="Choose child before sending" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100] rounded-xl border-border bg-popover">
                  {children.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="rounded-lg focus:bg-primary/10 focus:text-foreground"
                    >
                      {c.name} · {c.className}-{c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {messageChild ? (
                <p className="text-xs text-muted-foreground">
                  Message will be sent in context of{" "}
                  <span className="font-medium text-foreground">{messageChild.name}</span> (
                  {messageChild.className}-{messageChild.section}).
                </p>
              ) : (
                <p className="text-xs text-destructive font-medium">
                  Please select a child to continue.
                </p>
              )}
            </div>
          )}

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
                <SelectTrigger className="h-10 rounded-xl border border-input bg-background">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100] rounded-xl border-border bg-popover">
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
            <Button
              onClick={send}
              disabled={isParent && !messageChildId}
              className="gap-2 rounded-xl shadow-glow"
            >
              <Send className="size-4" /> Send
            </Button>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h3 className="mb-3 font-semibold">Recent threads</h3>
          <div className="min-w-0 space-y-2">
            {threads.map((t) => (
              <div
                key={t.id}
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
