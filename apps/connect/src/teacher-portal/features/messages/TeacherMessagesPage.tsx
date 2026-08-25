import { useEffect, useMemo, useState, useCallback } from "react";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { isTeacherAccessDenied } from "@/lib/teacher/portal-access-guard";
import { useAsyncAction } from "@/teacher-portal/core/hooks/useAsyncAction";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  cn,
} from "@lumenx/ui";
import { MessageSquare, Send, Inbox, Archive, FileEdit, Mail, PenLine } from "lucide-react";
import { toast } from "sonner";
import type { TeacherMessage, TeacherMessageTarget } from "@/lib/teacher/types";

type Folder = "inbox" | "sent" | "drafts" | "archived";
type View = Folder | "compose";

/**
 * Inbox folders are for reading notices/threads.
 * Compose is a separate write-and-send flow.
 */
export function TeacherMessagesPage() {
  const portal = useTeacherPortal();
  const [view, setView] = useState<View>("inbox");
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherMessage | null>(null);
  const [to, setTo] = useState("Class 10-B Parents");
  const [role, setRole] = useState<TeacherMessage["recipientRole"]>("class");
  const initialClass = portal.classes[0];
  const [classNameFilter, setClassNameFilter] = useState(initialClass?.className ?? "");
  const [sectionFilter, setSectionFilter] = useState(initialClass?.section ?? "");
  const [targets, setTargets] = useState<TeacherMessageTarget[]>([]);
  const [targetId, setTargetId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [q, setQ] = useState("");
  const [editDraftId, setEditDraftId] = useState<string | null>(null);

  const folder: Folder = view === "compose" ? "inbox" : view;

  const load = useCallback(
    (filter?: Folder, options?: { silent?: boolean }) => {
      const f = filter ?? (view === "compose" ? "inbox" : view);
      if (!options?.silent) setLoading(true);
      teacherRepository.getMessages(f).then((m) => {
        setMessages(m);
        setSelected((prev) => (prev ? (m.find((x) => x.id === prev.id) ?? prev) : null));
        setLoading(false);
      });
    },
    [view],
  );

  useEffect(() => {
    if (portal.isTeacher && view !== "compose") load(view);
  }, [portal.isTeacher, view, load]);

  const filtered = messages.filter(
    (m) =>
      !q.trim() ||
      m.subject.toLowerCase().includes(q.toLowerCase()) ||
      m.body.toLowerCase().includes(q.toLowerCase()),
  );
  const classes = portal.classes;

  const classNames = useMemo(
    () =>
      [...new Set(classes.map((c) => c.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [classes],
  );

  const sections = useMemo(
    () =>
      [...new Set(classes.filter((c) => c.className === classNameFilter).map((c) => c.section))].sort(),
    [classes, classNameFilter],
  );

  const classId = useMemo(
    () =>
      classes.find((c) => c.className === classNameFilter && c.section === sectionFilter)?.id ?? "",
    [classes, classNameFilter, sectionFilter],
  );

  useEffect(() => {
    if (!classNameFilter && classes[0]) {
      setClassNameFilter(classes[0].className);
      setSectionFilter(classes[0].section);
    }
  }, [classNameFilter, classes]);

  useEffect(() => {
    if (!sections.includes(sectionFilter) && sections[0]) {
      setSectionFilter(sections[0]);
    }
  }, [sections, sectionFilter]);

  useEffect(() => {
    if (view !== "compose") return;
    if (role === "principal") {
      setTargets([{ id: "principal", label: "Principal / Admin Office", role: "principal" }]);
      setTargetId("principal");
      setTo("Principal / Admin Office");
      return;
    }

    teacherRepository
      .getMessageTargets({
        role,
        classId: classId || undefined,
        section: sectionFilter || undefined,
      })
      .then((items) => {
        setTargets(items);
        if (!items.length) {
          setTargetId("");
          setTo("");
          return;
        }
        if (targetId && items.some((item) => item.id === targetId)) {
          const selectedTarget = items.find((item) => item.id === targetId);
          if (selectedTarget) setTo(selectedTarget.label);
          return;
        }
        setTargetId(items[0].id);
        setTo(items[0].label);
      });
  }, [view, role, classId, sectionFilter, targetId]);

  const resetCompose = useCallback(() => {
    setSubject("");
    setBody("");
    setEditDraftId(null);
    setTo("Class 10-B Parents");
    setRole("class");
    setClassNameFilter(classes[0]?.className ?? "");
    setSectionFilter(classes[0]?.section ?? "");
    setTargetId("");
  }, [classes]);

  const openCompose = useCallback(() => {
    resetCompose();
    setSelected(null);
    setView("compose");
  }, [resetCompose]);

  const sendFn = useCallback(
    async (draft = false) => {
      if (!to.trim()) {
        toast.error("Enter a recipient");
        return;
      }
      if (subject.trim().length < 3) {
        toast.error("Subject must be at least 3 characters");
        return;
      }
      if (body.trim().length < 8) {
        toast.error("Message must be at least 8 characters");
        return;
      }
      await teacherRepository.sendMessage({
        id: editDraftId ?? undefined,
        to,
        recipientRole: role,
        subject: subject.trim(),
        body: body.trim(),
        draft,
      });
      toast.success(draft ? "Draft saved" : "Message sent");
      resetCompose();
      setView(draft ? "drafts" : "sent");
    },
    [to, role, subject, body, editDraftId, resetCompose],
  );

  const { run: send, pending: sending } = useAsyncAction(sendFn);

  const openDraft = (m: TeacherMessage) => {
    setEditDraftId(m.id);
    setTo(m.to);
    setRole(m.recipientRole);
    setTargetId("");
    setSubject(m.subject);
    setBody(m.body);
    setView("compose");
  };

  const openReply = (m: TeacherMessage) => {
    resetCompose();
    setSubject(m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`);
    setTo(m.from);
    setRole("parent");
    setView("compose");
  };

  if (!portal.isTeacher) return null;

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Messages
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Read inbox notices in the folders. Use Compose to write and send a message.
          </p>
        </div>
        {view !== "compose" ? (
          <Button className="shrink-0 gap-2 rounded-xl shadow-glow" onClick={openCompose}>
            <PenLine className="size-4" />
            Compose
          </Button>
        ) : null}
      </div>

      {view !== "compose" ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["inbox", Inbox, "Inbox"],
              ["sent", Mail, "Sent"],
              ["drafts", FileEdit, "Drafts"],
              ["archived", Archive, "Archived"],
            ] as const
          ).map(([t, Icon, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setView(t);
                setSelected(null);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium",
                view === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      ) : null}

      {view === "compose" ? (
        <div className="max-w-xl space-y-4 rounded-2xl border border-primary/25 bg-card p-5 shadow-soft">
          <div>
            <h2 className="font-semibold">Write & send message</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compose is only for writing and sending. Notices and replies you receive stay in
              Inbox.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Send to</label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as TeacherMessage["recipientRole"]);
                setTargetId("");
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Recipient type" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher (colleague)</SelectItem>
                <SelectItem value="principal">Principal / Admin</SelectItem>
                <SelectItem value="class">Entire class</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(role === "parent" || role === "student" || role === "class") && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Class
                </label>
                <Select
                  value={classNameFilter}
                  onValueChange={(value) => {
                    setClassNameFilter(value);
                    const nextSections = classes
                      .filter((c) => c.className === value)
                      .map((c) => c.section);
                    if (!nextSections.includes(sectionFilter)) {
                      setSectionFilter(nextSections[0] ?? "");
                    }
                    setTargetId("");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {classNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        Class {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Section
                </label>
                <Select
                  value={sectionFilter}
                  onValueChange={(value) => {
                    setSectionFilter(value);
                    setTargetId("");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {sections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {role !== "principal" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Recipient
              </label>
              <Select
                value={targetId}
                onValueChange={(value) => {
                  setTargetId(value);
                  const target = targets.find((item) => item.id === value);
                  if (target) setTo(target.label);
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select recipient *" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {targets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Input value={to} readOnly className="rounded-xl bg-muted/40" />
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject * (min 3 chars)"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Message
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message… *"
              rows={5}
              className="resize-none rounded-xl"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2 rounded-xl shadow-glow"
              disabled={sending}
              onClick={() => send(false)}
            >
              <Send className="size-4" /> Send message
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={sending}
              onClick={() => send(true)}
            >
              Save draft
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                resetCompose();
                setView("inbox");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : loading ? (
        <PageSkeleton rows={5} />
      ) : (
        <>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages…"
            className="max-w-md rounded-xl"
          />
          {filtered.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ul className="space-y-2">
                {filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(m);
                        if (m.unread) {
                          setMessages((prev) =>
                            prev.map((msg) => (msg.id === m.id ? { ...msg, unread: false } : msg)),
                          );
                          teacherRepository
                            .markMessageRead(m.id)
                            .then(() => load(folder, { silent: true }));
                        }
                        if (view === "drafts") openDraft(m);
                      }}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        selected?.id === m.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "bg-card hover:bg-muted/30",
                        m.unread && "border-primary/30",
                      )}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="truncate text-sm font-medium">{m.subject}</span>
                        {m.unread && <Badge className="shrink-0">New</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {view === "sent" ? `To ${m.to}` : `From ${m.from}`} · {m.time}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="min-h-[200px] rounded-2xl border bg-card p-5 shadow-soft">
                {selected && view !== "drafts" ? (
                  <>
                    <h3 className="font-semibold">{selected.subject}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      From {selected.from} · To {selected.to}
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-sm">{selected.body}</p>
                    <div className="mt-4 flex gap-2">
                      {view === "inbox" && (
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => openReply(selected)}
                        >
                          Reply
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={async () => {
                          try {
                            await teacherRepository.archiveMessage(selected.id);
                          } catch (error) {
                            if (isTeacherAccessDenied(error)) return;
                            throw error;
                          }
                          toast.success("Archived");
                          load(folder);
                          setSelected(null);
                        }}
                      >
                        Archive
                      </Button>
                    </div>
                  </>
                ) : view === "drafts" && selected ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Draft selected — open Compose to edit and send.
                    </p>
                    <Button className="rounded-xl gap-2" onClick={() => openDraft(selected)}>
                      <PenLine className="size-4" /> Edit in Compose
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a message to read.</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No messages"
              description="Nothing in this folder yet."
              action={
                <Button className="rounded-xl gap-2" onClick={openCompose}>
                  <PenLine className="size-4" /> Compose message
                </Button>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
