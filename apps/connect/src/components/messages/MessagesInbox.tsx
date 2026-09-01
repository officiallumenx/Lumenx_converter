import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "@lumenx/ui";
import { Archive, Loader2, Mail, MessageSquare, PenLine, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  createDirectThread,
  createGroupThread,
  listMessageRecipients,
  listThreadMessages,
  loadMessagesThreadList,
  markMessageRead,
  sendThreadMessage,
  updateMessageThread,
  type MessageDto,
  type MessageRecipientDto,
  type MessageThreadListItem,
  type MessagesListStatus,
} from "@/lib/messages";

export type MessagesInboxProps = {
  instituteId: string;
  currentUserId: string;
  /** Parent compose: link thread to a student. */
  studentId?: string | null;
  /** Staff/teacher: allow class group threads. */
  canComposeGroup?: boolean;
  classSectionOptions?: Array<{ classLabel: string; sectionLabel: string; label: string }>;
  writesEnabled?: boolean;
};

function statusLabel(status: MessageThreadListItem["status"]): string {
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  return "Archived";
}

export function MessagesInbox({
  instituteId,
  currentUserId,
  studentId,
  canComposeGroup = false,
  classSectionOptions = [],
  writesEnabled = true,
}: MessagesInboxProps) {
  const [items, setItems] = useState<MessageThreadListItem[]>([]);
  const [listStatus, setListStatus] = useState<MessagesListStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const instituteIdRef = useRef(instituteId);
  instituteIdRef.current = instituteId;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"direct" | "group">("direct");
  const [recipients, setRecipients] = useState<MessageRecipientDto[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [groupClassLabel, setGroupClassLabel] = useState("");
  const [groupSectionLabel, setGroupSectionLabel] = useState("");
  const [composing, setComposing] = useState(false);

  const selected = items.find((t) => t.id === selectedId) ?? null;

  const reloadList = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setListStatus("loading");
    void loadMessagesThreadList({
      instituteId,
      currentUserId,
      studentId,
    }).then((next) => {
      if (cancelled || instituteIdRef.current !== instituteId) return;
      setItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteId, currentUserId, studentId, reloadKey]);

  useEffect(() => {
    if (!selectedId) {
      setThreadMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    void listThreadMessages(selectedId)
      .then(async (rows) => {
        if (cancelled) return;
        setThreadMessages(rows);
        setMessagesLoading(false);
        await Promise.all(
          rows
            .filter((m) => m.senderUserId !== currentUserId && !m.readAt)
            .map((m) => markMessageRead(m.id).catch(() => null)),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setThreadMessages([]);
        setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, currentUserId, reloadKey]);

  useEffect(() => {
    if (!composeOpen) return;
    let cancelled = false;
    setRecipientsLoading(true);
    void listMessageRecipients({ instituteId, studentId })
      .then((rows) => {
        if (cancelled) return;
        setRecipients(rows);
        setRecipientUserId(rows[0]?.userId ?? "");
        setRecipientsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRecipients([]);
        setRecipientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [composeOpen, instituteId, studentId]);

  useEffect(() => {
    if (classSectionOptions.length === 0) return;
    const first = classSectionOptions[0];
    setGroupClassLabel(first.classLabel);
    setGroupSectionLabel(first.sectionLabel);
  }, [classSectionOptions]);

  async function handleSendReply() {
    if (!selectedId || !replyBody.trim() || !writesEnabled) return;
    setSending(true);
    try {
      await sendThreadMessage(selectedId, replyBody.trim());
      setReplyBody("");
      reloadList();
      setSelectedId(selectedId);
      setReloadKey((k) => k + 1);
      toast.success("Message sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleCompose() {
    if (!writesEnabled) return;
    if (composeMode === "direct") {
      if (!recipientUserId || !composeBody.trim()) {
        toast.error("Choose a recipient and write a message");
        return;
      }
      setComposing(true);
      try {
        const thread = await createDirectThread({
          instituteId,
          counterpartUserId: recipientUserId,
          subject: composeSubject.trim() || null,
          studentId: studentId ?? null,
          body: composeBody.trim(),
        });
        setComposeOpen(false);
        setComposeSubject("");
        setComposeBody("");
        reloadList();
        setSelectedId(thread.id);
        toast.success("Conversation started");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start conversation");
      } finally {
        setComposing(false);
      }
      return;
    }

    if (!groupClassLabel.trim() || !groupSectionLabel.trim() || !composeBody.trim()) {
      toast.error("Pick class/section and write a message");
      return;
    }
    setComposing(true);
    try {
      const thread = await createGroupThread({
        instituteId,
        subject: composeSubject.trim() || null,
        classLabel: groupClassLabel.trim(),
        sectionLabel: groupSectionLabel.trim(),
        body: composeBody.trim(),
      });
      setComposeOpen(false);
      setComposeSubject("");
      setComposeBody("");
      reloadList();
      setSelectedId(thread.id);
      toast.success("Group thread created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group thread");
    } finally {
      setComposing(false);
    }
  }

  async function handleThreadStatus(status: "closed" | "archived" | "open") {
    if (!selectedId || !writesEnabled) return;
    try {
      await updateMessageThread(selectedId, { status });
      reloadList();
      toast.success(status === "open" ? "Thread reopened" : `Thread ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update thread");
    }
  }

  if (listStatus === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading messages…
      </div>
    );
  }

  if (listStatus === "needs_institute") {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Select an institute to view messages.
      </p>
    );
  }

  if (listStatus === "error" || listStatus === "forbidden") {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        {listError ?? "Unable to load messages"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Institute messages · direct and class threads
        </p>
        {writesEnabled && (
          <Button
            type="button"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => setComposeOpen(true)}
          >
            <PenLine className="size-4" /> New message
          </Button>
        )}
      </div>

      {listStatus === "empty" && !selected && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center">
          <Mail className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No message threads yet</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Start a conversation with teachers, parents, or your class group.
          </p>
        </div>
      )}

      {(listStatus === "ready" || selected) && (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="min-h-[320px] rounded-2xl border border-border bg-card divide-y">
            {items.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedId(thread.id)}
                className={cn(
                  "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-muted/40",
                  selectedId === thread.id && "bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {thread.subject ?? thread.counterpartLabel}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                    {statusLabel(thread.status)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{thread.counterpartLabel}</span>
                {thread.lastMessageAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(thread.lastMessageAt).toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex min-h-[320px] flex-col rounded-2xl border border-border bg-card">
            {!selected ? (
              <p className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Select a thread to read and reply
              </p>
            ) : (
              <>
                <div className="border-b px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{selected.subject ?? selected.counterpartLabel}</h3>
                      <p className="text-xs text-muted-foreground">{selected.counterpartLabel}</p>
                    </div>
                    {writesEnabled && selected.status !== "archived" && (
                      <div className="flex flex-wrap gap-1">
                        {selected.status === "open" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 rounded-lg text-xs"
                            onClick={() => void handleThreadStatus("closed")}
                          >
                            <XCircle className="size-3.5" /> Close
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 rounded-lg text-xs"
                            onClick={() => void handleThreadStatus("open")}
                          >
                            Reopen
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 rounded-lg text-xs"
                          onClick={() => void handleThreadStatus("archived")}
                        >
                          <Archive className="size-3.5" /> Archive
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Loading messages…
                    </div>
                  ) : threadMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages in this thread.</p>
                  ) : (
                    threadMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          msg.senderUserId === currentUserId
                            ? "ml-8 border-primary/20 bg-primary/5"
                            : "mr-8 bg-muted/30",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(msg.sentAt).toLocaleString()}
                          {msg.readAt ? " · read" : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {selected.status === "open" && writesEnabled && (
                  <div className="space-y-3 border-t p-4">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your reply…"
                      rows={3}
                      className="rounded-xl"
                      disabled={sending}
                    />
                    <Button
                      type="button"
                      onClick={() => void handleSendReply()}
                      disabled={sending || !replyBody.trim()}
                      className="gap-2 rounded-xl"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Send reply
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              <h3 className="font-semibold">New message</h3>
            </div>

            {canComposeGroup && (
              <div className="mb-4 flex gap-2">
                {(["direct", "group"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setComposeMode(mode)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      composeMode === mode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted",
                    )}
                  >
                    {mode === "direct" ? "Direct" : "Class group"}
                  </button>
                ))}
              </div>
            )}

            {composeMode === "direct" ? (
              <div className="mb-3 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                {recipientsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading recipients…</p>
                ) : (
                  <Select value={recipientUserId} onValueChange={setRecipientUserId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((r) => (
                        <SelectItem key={r.userId} value={r.userId}>
                          {r.displayName} · {r.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {classSectionOptions.length > 0 ? (
                  <Select
                    value={`${groupClassLabel}::${groupSectionLabel}`}
                    onValueChange={(v) => {
                      const [cls, sec] = v.split("::");
                      setGroupClassLabel(cls);
                      setGroupSectionLabel(sec);
                    }}
                  >
                    <SelectTrigger className="col-span-2 rounded-xl">
                      <SelectValue placeholder="Class & section" />
                    </SelectTrigger>
                    <SelectContent>
                      {classSectionOptions.map((o) => (
                        <SelectItem
                          key={`${o.classLabel}-${o.sectionLabel}`}
                          value={`${o.classLabel}::${o.sectionLabel}`}
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      value={groupClassLabel}
                      onChange={(e) => setGroupClassLabel(e.target.value)}
                      placeholder="Class"
                      className="rounded-xl"
                    />
                    <Input
                      value={groupSectionLabel}
                      onChange={(e) => setGroupSectionLabel(e.target.value)}
                      placeholder="Section"
                      className="rounded-xl"
                    />
                  </>
                )}
              </div>
            )}

            <div className="mb-3 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Subject (optional)</label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject"
                className="rounded-xl"
              />
            </div>

            <Textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Write your message…"
              rows={4}
              className="mb-4 rounded-xl"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setComposeOpen(false)}
                disabled={composing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="gap-2 rounded-xl"
                onClick={() => void handleCompose()}
                disabled={composing}
              >
                {composing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
