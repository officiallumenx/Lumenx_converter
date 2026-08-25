import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  Field,
  FormGrid,
  Kpi,
  Modal,
  PageToolbar,
  Pill,
  SegmentedControl,
  Select,
  TextArea,
  TextInput,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  CheckCircle2,
  LifeBuoy,
  Lock,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  StickyNote,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { listPlatformInstitutes } from "@/lib/institute-directory-store";
import {
  NEXUS_OPERATORS,
  addInternalNote,
  assignThread,
  createSupportThread,
  formatSupportDate,
  formatSupportTime,
  labelCategory,
  labelPriority,
  labelStatus,
  listSupportThreads,
  markThreadResolved,
  priorityTone,
  reopenThread,
  replyToThread,
  setThreadPriority,
  setThreadStatus,
  statusTone,
  subscribeSupportThreads,
  supportStats,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
  type SupportThread,
} from "@/lib/support-center-store";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support Center — LumenX Nexus" }] }),
  component: SupportCenterPage,
});

type StatusFilter = "all" | SupportStatus;
type CategoryFilter = "all" | SupportCategory;

const COMPOSER_MODES = [
  { value: "reply", label: "Reply" },
  { value: "internal", label: "Internal note" },
] as const;

function SupportCenterPage() {
  const [tick, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<"reply" | "internal">("reply");
  const [draft, setDraft] = useState("");
  const [operator, setOperator] = useState<string>(NEXUS_OPERATORS[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeSupportThreads(() => setTick((t) => t + 1)), []);

  const threads = useMemo(() => listSupportThreads(), [tick]);
  const stats = useMemo(() => supportStats(threads), [threads]);

  const filtered = useMemo(() => {
    return threads.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [threads, statusFilter, categoryFilter]);

  const selected = useMemo(() => {
    if (selectedId) {
      const fromAll = threads.find((t) => t.id === selectedId);
      if (fromAll) return fromAll;
    }
    return filtered[0] ?? null;
  }, [threads, filtered, selectedId]);

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [selectedId, filtered]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.id, selected?.messages.length]);

  function afterMutate(id: string) {
    setSelectedId(id);
  }

  function send() {
    if (!selected || !draft.trim()) return;
    const next =
      composerMode === "internal"
        ? addInternalNote(selected.id, draft, operator)
        : replyToThread(selected.id, draft, operator);
    if (next) {
      setDraft("");
      afterMutate(next.id);
    }
  }

  return (
    <AppShell
      title="Support Center"
      subtitle="Institute threads · issues, requests, feedback · no person-level records"
      actions={
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> New thread
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Threads" value={String(stats.total)} icon={<LifeBuoy className="size-3.5" />} />
        <Kpi label="Open" value={String(stats.open)} />
        <Kpi label="In progress" value={String(stats.inProgress)} tone="up" />
        <Kpi label="Waiting" value={String(stats.waiting)} tone={stats.waiting ? "down" : "neutral"} />
        <Kpi
          label="High priority"
          value={String(stats.high)}
          tone={stats.high ? "down" : "up"}
          delta={`${stats.resolved} resolved`}
        />
      </div>

      <Card className="mb-4">
        <PageToolbar>
          <ToolbarGroup>
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In progress" },
                { value: "waiting", label: "Waiting" },
                { value: "resolved", label: "Resolved" },
              ]}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="min-w-[180px]"
            >
              <option value="all">All categories</option>
              <option value="issue">Issue</option>
              <option value="feature_request">Feature Request</option>
              <option value="feedback">Feedback</option>
              <option value="improvement_request">Improvement Request</option>
            </Select>
          </ToolbarGroup>
          <ToolbarMeta>{filtered.length} threads</ToolbarMeta>
        </PageToolbar>
      </Card>

      <div className="grid grid-cols-12 gap-4 min-h-[640px]">
        {/* Thread list */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Threads</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[70vh] divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="p-6 text-xs text-muted-foreground text-center">No threads match filters.</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selected?.id === t.id ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-surface-hover border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{t.subject}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{t.instituteName}</div>
                    </div>
                    <Pill tone={statusTone(t.status)}>{labelStatus(t.status)}</Pill>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
                      {labelCategory(t.category)}
                    </span>
                    <Pill tone={priorityTone(t.priority)}>{labelPriority(t.priority)}</Pill>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                      {formatSupportTime(t.updatedAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Conversation */}
        <Card className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden min-h-[640px]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-8">
              Select a thread to open the conversation.
            </div>
          ) : (
            <>
              <ThreadHeader
                thread={selected}
                operator={operator}
                onOperatorChange={setOperator}
                onChange={() => afterMutate(selected.id)}
              />
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background/30 max-h-[48vh] lg:max-h-none">
                {selected.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-border p-4 space-y-3 bg-card">
                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedControl
                    value={composerMode}
                    onChange={setComposerMode}
                    options={[...COMPOSER_MODES]}
                  />
                  {composerMode === "internal" && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lock className="size-3" /> Visible to Nexus only
                    </span>
                  )}
                </div>
                <TextArea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder={
                    composerMode === "internal"
                      ? "Add an internal note for operators…"
                      : "Reply to the institute…"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button variant="primary" onClick={send} disabled={!draft.trim()}>
                    {composerMode === "internal" ? (
                      <>
                        <StickyNote className="size-3.5" /> Add note
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" /> Send reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <CreateThreadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          setSelectedId(id);
          setTick((t) => t + 1);
        }}
      />
    </AppShell>
  );
}

function ThreadHeader({
  thread,
  operator,
  onOperatorChange,
  onChange,
}: {
  thread: SupportThread;
  operator: string;
  onOperatorChange: (v: string) => void;
  onChange: () => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-border space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{thread.subject}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <Link
              to="/institutes/$id"
              params={{ id: thread.instituteId }}
              className="text-primary hover:underline"
            >
              {thread.instituteName}
            </Link>
            {" · "}
            {labelCategory(thread.category)}
            {" · "}
            Created {formatSupportDate(thread.createdAt)}
            {" · "}
            Updated {formatSupportDate(thread.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={statusTone(thread.status)}>{labelStatus(thread.status)}</Pill>
          <Pill tone={priorityTone(thread.priority)}>{labelPriority(thread.priority)}</Pill>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Status" className="min-w-[140px]">
          <Select
            value={thread.status}
            onChange={(e) => {
              setThreadStatus(thread.id, e.target.value as SupportStatus);
              onChange();
            }}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
          </Select>
        </Field>
        <Field label="Priority" className="min-w-[120px]">
          <Select
            value={thread.priority}
            onChange={(e) => {
              setThreadPriority(thread.id, e.target.value as SupportPriority);
              onChange();
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Assign" className="min-w-[150px]">
          <Select
            value={thread.assignee ?? ""}
            onChange={(e) => {
              assignThread(thread.id, e.target.value || null);
              onChange();
            }}
          >
            <option value="">Unassigned</option>
            {NEXUS_OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Acting as" className="min-w-[150px]">
          <Select value={operator} onChange={(e) => onOperatorChange(e.target.value)}>
            {NEXUS_OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center gap-1.5 pb-0.5">
          {thread.status !== "resolved" ? (
            <Button
              onClick={() => {
                markThreadResolved(thread.id);
                onChange();
              }}
            >
              <CheckCircle2 className="size-3.5" /> Mark resolved
            </Button>
          ) : (
            <Button
              onClick={() => {
                reopenThread(thread.id);
                onChange();
              }}
            >
              <RotateCcw className="size-3.5" /> Reopen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: SupportThread["messages"][number];
}) {
  const isInternal = message.authorRole === "internal" || message.internal;
  const isNexus = message.authorRole === "nexus";
  const isInstitute = message.authorRole === "institute";

  if (isInternal) {
    return (
      <div className="mx-auto max-w-xl w-full rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-warning">
          <Lock className="size-3" /> Internal · {message.authorLabel}
        </div>
        <p className="text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">{message.body}</p>
        <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{formatSupportTime(message.createdAt)}</p>
      </div>
    );
  }

  return (
    <div className={`flex ${isNexus ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 border ${
          isNexus
            ? "bg-primary/10 border-primary/20 rounded-br-md"
            : "bg-muted/40 border-border rounded-bl-md"
        }`}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {isInstitute ? "Institute" : "Nexus"} · {message.authorLabel}
        </div>
        <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap">{message.body}</p>
        <p className="text-[10px] font-mono text-muted-foreground mt-1.5 text-right">
          {formatSupportTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function CreateThreadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const institutes = useMemo(
    () =>
      listPlatformInstitutes()
        .filter((i) => i.status !== "archived")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [open],
  );
  const [instituteId, setInstituteId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("issue");
  const [priority, setPriority] = useState<SupportPriority>("medium");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setInstituteId(institutes[0]?.id ?? "");
      setSubject("");
      setCategory("issue");
      setPriority("medium");
      setBody("");
    }
  }, [open, institutes]);

  function submit() {
    const t = createSupportThread({ instituteId, subject, category, priority, body });
    if (t) onCreated(t.id);
  }

  return (
    <Modal open={open} onClose={onClose} title="New support thread" size="md">
      <p className="text-[11px] text-muted-foreground mb-4">
        Simulates an institute submission. Categories: Issue, Feature Request, Feedback, Improvement
        Request. No personal student/teacher/parent data.
      </p>
      <FormGrid>
        <Field label="Institute" className="sm:col-span-2">
          <Select value={instituteId} onChange={(e) => setInstituteId(e.target.value)}>
            {institutes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
            <option value="issue">Issue</option>
            <option value="feature_request">Feature Request</option>
            <option value="feedback">Feedback</option>
            <option value="improvement_request">Improvement Request</option>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as SupportPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Subject" className="sm:col-span-2">
          <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short subject…" />
        </Field>
        <Field label="Message" className="sm:col-span-2">
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Institute message…"
          />
        </Field>
      </FormGrid>
      <div className="flex justify-end gap-2 mt-5">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={!instituteId || !subject.trim() || !body.trim()}>
          Create thread
        </Button>
      </div>
    </Modal>
  );
}
