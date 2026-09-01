import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Field,
  PageStack,
  Pill,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { Archive, Loader2, Mail, MessageSquare, PenLine, Send, XCircle } from "lucide-react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAuth } from "@/auth/AuthContext";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
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
import { useAdminToast } from "@/components/AdminActionToast";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — LumenX Admin" }] }),
  component: MessagesPage,
});

function statusLabel(status: MessageThreadListItem["status"]): string {
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  return "Archived";
}

function MessagesPage() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [items, setItems] = useState<MessageThreadListItem[]>([]);
  const [listStatus, setListStatus] = useState<MessagesListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

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
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (!apiMode) {
      setItems([]);
      setListStatus("demo");
      setListError(null);
      return;
    }

    if (
      instituteCtx.status === "loading" ||
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setListStatus(
        instituteCtx.status === "loading" ? "loading" : "needs_institute",
      );
      setListError(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    void loadMessagesThreadList(requestInstituteId, currentUserId).then((next) => {
      if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
      setItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    currentUserId,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode || !selectedId || !currentUserId) {
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
  }, [apiMode, selectedId, currentUserId, reloadKey]);

  useEffect(() => {
    if (!composeOpen || !instituteCtx.activeInstituteId) return;
    let cancelled = false;
    setRecipientsLoading(true);
    void listMessageRecipients({ instituteId: instituteCtx.activeInstituteId })
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
  }, [composeOpen, instituteCtx.activeInstituteId]);

  async function handleSend() {
    if (!selectedId || !replyBody.trim() || !writesEnabled) return;
    setSending(true);
    try {
      await sendThreadMessage(selectedId, replyBody.trim());
      setReplyBody("");
      setReloadKey((k) => k + 1);
      notify("Message sent");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleCompose() {
    if (!writesEnabled || !instituteCtx.activeInstituteId) return;

    if (composeMode === "direct") {
      if (!recipientUserId || !composeBody.trim()) {
        notify("Choose a recipient and write a message");
        return;
      }
      setComposing(true);
      try {
        const thread = await createDirectThread({
          instituteId: instituteCtx.activeInstituteId,
          counterpartUserId: recipientUserId,
          subject: composeSubject.trim() || null,
          body: composeBody.trim(),
        });
        setComposeOpen(false);
        setComposeSubject("");
        setComposeBody("");
        setSelectedId(thread.id);
        setReloadKey((k) => k + 1);
        notify("Conversation started");
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to start conversation");
      } finally {
        setComposing(false);
      }
      return;
    }

    if (!groupClassLabel.trim() || !groupSectionLabel.trim() || !composeBody.trim()) {
      notify("Enter class, section, and message body");
      return;
    }
    setComposing(true);
    try {
      const thread = await createGroupThread({
        instituteId: instituteCtx.activeInstituteId,
        subject: composeSubject.trim() || null,
        classLabel: groupClassLabel.trim(),
        sectionLabel: groupSectionLabel.trim(),
        body: composeBody.trim(),
      });
      setComposeOpen(false);
      setComposeSubject("");
      setComposeBody("");
      setSelectedId(thread.id);
      setReloadKey((k) => k + 1);
      notify("Group thread created");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to create group thread");
    } finally {
      setComposing(false);
    }
  }

  async function handleThreadStatus(status: "closed" | "archived" | "open") {
    if (!selectedId || !writesEnabled) return;
    try {
      await updateMessageThread(selectedId, { status });
      setReloadKey((k) => k + 1);
      notify(status === "open" ? "Thread reopened" : `Thread ${status}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update thread");
    }
  }

  return (
    <AppShell title="Messages">
      <PageStack>
        <Card>
          <CardHeader
            title="Messages"
            hint="Staff oversight inbox · direct and class group threads"
            action={
              listStatus === "ready" && writesEnabled ? (
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => setComposeOpen(true)}
                >
                  <PenLine className="size-4" /> Compose
                </Button>
              ) : undefined
            }
          />
        </Card>

        {listStatus === "demo" && (
          <Card>
            <p className="p-5 text-sm text-muted-foreground">
              Message threads from Connect (teachers and parents) appear here in API mode.
              Switch to API auth and select an institute to load the live inbox.
            </p>
          </Card>
        )}

        {listStatus === "loading" && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading threads…
          </div>
        )}

        {listStatus === "needs_institute" && (
          <Card>
            <p className="p-5 text-sm text-muted-foreground">
              Select an institute to view message threads.
            </p>
          </Card>
        )}

        {(listStatus === "error" || listStatus === "forbidden") && (
          <Card>
            <p className="p-5 text-sm text-destructive">{listError ?? "Unable to load messages"}</p>
          </Card>
        )}

        {listStatus === "empty" && (
          <Card>
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Mail className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No message threads yet</p>
              <p className="max-w-md text-xs text-muted-foreground">
                Compose a message or wait for teachers and parents to start conversations in Connect.
              </p>
              {writesEnabled && (
                <Button type="button" className="mt-2 gap-2" onClick={() => setComposeOpen(true)}>
                  <PenLine className="size-4" /> Compose
                </Button>
              )}
            </div>
          </Card>
        )}

        {listStatus === "ready" && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="min-h-[320px]">
              <div className="divide-y">
                {items.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-muted/40 ${
                      selectedId === thread.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {thread.subject ?? thread.counterpartLabel}
                      </span>
                      <Pill tone={thread.status === "open" ? "info" : "neutral"}>
                        {statusLabel(thread.status)}
                      </Pill>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {thread.counterpartLabel}
                      {thread.threadKind === "group" ? " · Group" : ""}
                    </span>
                    {thread.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(thread.lastMessageAt).toLocaleString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="flex min-h-[320px] flex-col">
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
                              className="h-8 gap-1"
                              onClick={() => void handleThreadStatus("closed")}
                            >
                              <XCircle className="size-3.5" /> Close
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => void handleThreadStatus("open")}
                            >
                              Reopen
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
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
                          className="rounded-xl border bg-muted/30 px-3 py-2 text-sm"
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
                  {selected.status === "open" && (
                    <div className="space-y-3 border-t p-4">
                      <Field label="Reply">
                        <TextArea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Type your reply…"
                          rows={3}
                          disabled={!writesEnabled || sending}
                        />
                      </Field>
                      <Button
                        onClick={() => void handleSend()}
                        disabled={!writesEnabled || sending || !replyBody.trim()}
                        className="gap-2"
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
            </Card>
          </div>
        )}

        {composeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-lg p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <MessageSquare className="size-5" /> Compose message
              </h3>

              <div className="mb-4 flex gap-2">
                {(["direct", "group"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={composeMode === mode ? "default" : "outline"}
                    onClick={() => setComposeMode(mode)}
                  >
                    {mode === "direct" ? "Direct" : "Class group"}
                  </Button>
                ))}
              </div>

              {composeMode === "direct" ? (
                <Field label="To" className="mb-3">
                  {recipientsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading recipients…</p>
                  ) : (
                    <Select
                      value={recipientUserId}
                      onChange={(e) => setRecipientUserId(e.target.value)}
                    >
                      <option value="">Choose recipient</option>
                      {recipients.map((r) => (
                        <option key={r.userId} value={r.userId}>
                          {r.displayName} · {r.role}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <Field label="Class">
                    <TextInput
                      value={groupClassLabel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGroupClassLabel(e.target.value)
                      }
                      placeholder="e.g. 10"
                    />
                  </Field>
                  <Field label="Section">
                    <TextInput
                      value={groupSectionLabel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGroupSectionLabel(e.target.value)
                      }
                      placeholder="e.g. B"
                    />
                  </Field>
                </div>
              )}

              <Field label="Subject (optional)" className="mb-3">
                <TextInput
                  value={composeSubject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setComposeSubject(e.target.value)
                  }
                  placeholder="Subject"
                />
              </Field>

              <Field label="Message" className="mb-4">
                <TextArea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={4}
                />
              </Field>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setComposeOpen(false)}
                  disabled={composing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void handleCompose()}
                  disabled={composing}
                >
                  {composing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send
                </Button>
              </div>
            </Card>
          </div>
        )}
      </PageStack>
    </AppShell>
  );
}

