import { useEffect, useMemo, useState, useCallback } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
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
import { MessageSquare, Send, Inbox, Archive, FileEdit, Mail } from "lucide-react";
import { toast } from "sonner";
import type { TeacherMessage, TeacherMessageTarget } from "@/lib/teacher/types";

type Tab = "inbox" | "sent" | "drafts" | "archived" | "compose";

export function TeacherMessagesPage() {
  const portal = useTeacherPortal();
  const [tab, setTab] = useState<Tab>("inbox");
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherMessage | null>(null);
  const [to, setTo] = useState("Class 10-B Parents");
  const [role, setRole] = useState<TeacherMessage["recipientRole"]>("class");
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("all");
  const [targets, setTargets] = useState<TeacherMessageTarget[]>([]);
  const [targetId, setTargetId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [q, setQ] = useState("");
  const [editDraftId, setEditDraftId] = useState<string | null>(null);

  const load = useCallback(
    (filter?: Tab) => {
      const f = filter ?? tab;
      if (f === "compose") return;
      setLoading(true);
      teacherRepository.getMessages(f as "inbox" | "sent" | "drafts" | "archived").then((m) => {
        setMessages(m);
        setLoading(false);
      });
    },
    [tab],
  );

  useEffect(() => {
    if (portal.isTeacher && tab !== "compose") load(tab);
  }, [portal.isTeacher, tab, load]);

  const filtered = messages.filter(
    (m) =>
      !q.trim() ||
      m.subject.toLowerCase().includes(q.toLowerCase()) ||
      m.body.toLowerCase().includes(q.toLowerCase()),
  );
  const classes = portal.classes;

  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
    }
  }, [classId, classes]);

  const sectionOptions = useMemo(() => {
    if (!classId) return ["all"];
    const selected = classes.find((item) => item.id === classId);
    if (!selected) return ["all"];
    return ["all", selected.section];
  }, [classId, classes]);

  useEffect(() => {
    if (tab !== "compose") return;
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
        section: section === "all" ? undefined : section,
      })
      .then((items) => {
        setTargets(items);
        if (!items.length) {
          setTargetId("");
          setTo("");
          return;
        }
        if (targetId && items.some((item) => item.id === targetId)) {
          const selected = items.find((item) => item.id === targetId);
          if (selected) setTo(selected.label);
          return;
        }
        setTargetId(items[0].id);
        setTo(items[0].label);
      });
  }, [tab, role, classId, section, targetId]);

  const resetCompose = useCallback(() => {
    setSubject("");
    setBody("");
    setEditDraftId(null);
    setTo("Class 10-B Parents");
    setRole("class");
    setClassId(classes[0]?.id ?? "");
    setSection("all");
    setTargetId("");
  }, [classes]);

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
        to,
        recipientRole: role,
        subject: subject.trim(),
        body: body.trim(),
        draft,
      });
      toast.success(draft ? "Draft saved" : "Message sent");
      resetCompose();
      setTab(draft ? "drafts" : "sent");
    },
    [to, role, subject, body, resetCompose],
  );

  const { run: send, pending: sending } = useAsyncAction(sendFn);

  const openDraft = (m: TeacherMessage) => {
    setEditDraftId(m.id);
    setTo(m.to);
    setRole(m.recipientRole);
    setTargetId("");
    setSubject(m.subject);
    setBody(m.body);
    setTab("compose");
  };

  const openReply = (m: TeacherMessage) => {
    resetCompose();
    setSubject(m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`);
    setTo(m.from);
    setRole("parent");
    setTab("compose");
  };

  if (!portal.isTeacher) return null;

  return (
    <div className="space-y-5">
      <PageHeader title="Messages" subtitle="Inbox, sent, drafts, and archived conversations" />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["inbox", Inbox],
            ["sent", Mail],
            ["compose", Send],
            ["drafts", FileEdit],
            ["archived", Archive],
          ] as const
        ).map(([t, Icon]) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (t === "compose") resetCompose();
              setTab(t);
              setSelected(null);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium capitalize",
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" /> {t}
          </button>
        ))}
      </div>

      {tab === "compose" ? (
        <div className="rounded-2xl border bg-card p-5 shadow-soft space-y-4 max-w-xl">
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
          {(role === "parent" || role === "student" || role === "class") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={classId}
                onValueChange={(value) => {
                  setClassId(value);
                  setTargetId("");
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Class / section" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      Class {item.className}-{item.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={section}
                onValueChange={(value) => {
                  setSection(value);
                  setTargetId("");
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {sectionOptions.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec === "all" ? "All sections" : `Section ${sec}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role !== "principal" ? (
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
          ) : (
            <Input value={to} readOnly className="rounded-xl bg-muted/40" />
          )}
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject * (min 3 chars)"
            className="rounded-xl"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message * (min 8 chars)"
            rows={5}
            className="rounded-xl resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-xl gap-2 shadow-glow"
              disabled={sending}
              onClick={() => send(false)}
            >
              <Send className="size-4" /> Send
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
                setTab("inbox");
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
                        if (m.unread) teacherRepository.markMessageRead(m.id).then(() => load(tab));
                        if (tab === "drafts") openDraft(m);
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
                        <span className="font-medium text-sm truncate">{m.subject}</span>
                        {m.unread && <Badge className="shrink-0">New</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tab === "sent" ? `To ${m.to}` : `From ${m.from}`} · {m.time}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border bg-card p-5 shadow-soft min-h-[200px]">
                {selected && tab !== "drafts" ? (
                  <>
                    <h3 className="font-semibold">{selected.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {selected.from} · To {selected.to}
                    </p>
                    <p className="mt-4 text-sm whitespace-pre-wrap">{selected.body}</p>
                    <div className="mt-4 flex gap-2">
                      {tab === "inbox" && (
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
                          await teacherRepository.archiveMessage(selected.id);
                          toast.success("Archived");
                          load(tab);
                          setSelected(null);
                        }}
                      >
                        Archive
                      </Button>
                    </div>
                  </>
                ) : tab === "drafts" && selected ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Draft selected — open in compose to edit and send.
                    </p>
                    <Button className="rounded-xl" onClick={() => openDraft(selected)}>
                      Edit draft
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
                <Button className="rounded-xl" onClick={() => setTab("compose")}>
                  Compose message
                </Button>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
