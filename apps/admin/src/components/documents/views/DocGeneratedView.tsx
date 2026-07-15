import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Button,
  Card,
  KpiGrid,
  Kpi,
  Modal,
  PageStack,
  PageToolbar,
  Pill,
  SearchInput,
  TextArea,
  Field,
  SegmentedControl,
} from "@lumenx/ui-admin";
import {
  getGeneratedDocuments,
  advanceWorkflowState,
  batchAdvanceWorkflow,
  rejectWorkflowDocument,
  getNextWorkflowLabel,
  getNextWorkflowState,
} from "@/lib/template-management/store";
import type { GeneratedDocument, WorkflowState } from "@/lib/template-management/types";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Globe,
  History,
  Layers,
  RotateCcw,
  Wand2,
  X,
  XCircle,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<WorkflowState, string> = {
  draft: "Draft",
  teacher_review: "Teacher Review",
  admin_review: "Admin Review",
  published: "Published",
  rejected: "Rejected",
};

const STATE_TONE: Record<WorkflowState, "success" | "warning" | "info" | "danger" | "neutral"> = {
  draft: "neutral",
  teacher_review: "warning",
  admin_review: "info",
  published: "success",
  rejected: "danger",
};

const STATE_COLOR: Record<WorkflowState, string> = {
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  teacher_review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  admin_review: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

const COL_ACCENT: Record<WorkflowState, string> = {
  draft: "border-t-slate-300",
  teacher_review: "border-t-amber-400",
  admin_review: "border-t-blue-400",
  published: "border-t-emerald-400",
  rejected: "border-t-red-400",
};

const COL_EMPTY_ICON: Record<WorkflowState, typeof FileText> = {
  draft: FileText,
  teacher_review: BookOpen,
  admin_review: ShieldCheck,
  published: Globe,
  rejected: XCircle,
};

const COL_EMPTY_MSG: Record<WorkflowState, string> = {
  draft: "No drafts waiting",
  teacher_review: "All clear — no teacher reviews pending",
  admin_review: "No documents awaiting admin review",
  published: "No published documents yet",
  rejected: "No rejected documents",
};

const KIND_LABEL: Record<string, string> = {
  certificate: "Certificate", report: "Report",
  document: "Document", id_card: "ID Card",
};
const KIND_COLOR: Record<string, string> = {
  certificate: "bg-amber-500/10 text-amber-600",
  report: "bg-blue-500/10 text-blue-600",
  document: "bg-slate-500/10 text-slate-600",
  id_card: "bg-indigo-500/10 text-indigo-600",
};

const PIPELINE_STATES: WorkflowState[] = ["draft", "teacher_review", "admin_review", "published"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Workflow timeline ────────────────────────────────────────────────────────

function WorkflowTimeline({ doc }: { doc: GeneratedDocument }) {
  return (
    <div className="space-y-0">
      {doc.workflowHistory.map((ev, i) => (
        <div key={i} className="flex items-start gap-3 pb-3 relative">
          {/* Connector line */}
          {i < doc.workflowHistory.length - 1 && (
            <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border/60" />
          )}
          <div className={`size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 ${
            ev.state === "published" ? "bg-emerald-500 text-white" :
            ev.state === "rejected" ? "bg-red-500 text-white" : "bg-muted border border-border"
          }`}>
            {ev.state === "published" ? <CheckCircle2 className="size-3" /> :
             ev.state === "rejected" ? <X className="size-3" /> :
             <span className="text-[8px] font-bold">{i + 1}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${STATE_COLOR[ev.state]}`}>
                {STATE_LABEL[ev.state]}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">{ev.actor}</span>
            </div>
            {ev.comment && (
              <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{ev.comment}"</p>
            )}
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{fmtDateTime(ev.at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ doc, onConfirm, onClose }: {
  doc: GeneratedDocument;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Reject document"
      subtitle={`${doc.recipientName} · ${doc.templateName}`}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            <XCircle className="size-3.5" /> Reject
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
          <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
          The document will be marked rejected and the requestor will be notified.
        </div>
        <Field label="Rejection reason" required hint="Visible in the workflow history">
          <TextArea
            placeholder="Explain why this document is being rejected…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Slide-in detail panel ────────────────────────────────────────────────────

function DetailPanel({
  doc,
  onAdvance,
  onReject,
  onClose,
}: {
  doc: GeneratedDocument;
  onAdvance: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const nextLabel = getNextWorkflowLabel(doc.kind, doc.workflowState);
  const hasNext = getNextWorkflowState(doc.kind, doc.workflowState) !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-20 transition-all duration-300 ${visible ? "bg-black/25 backdrop-blur-[2px]" : "bg-transparent"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`fixed inset-y-0 right-0 z-30 w-full max-w-md shadow-pop border-l border-border bg-background flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-2 bg-surface/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm truncate">{doc.templateName}</p>
              <Pill tone={STATE_TONE[doc.workflowState]}>{STATE_LABEL[doc.workflowState]}</Pill>
            </div>
            <p className="text-xs text-muted-foreground">{doc.recipientName} · {doc.recipientRef}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-surface-hover text-muted-foreground shrink-0 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status chips */}
          <div className="px-5 pt-4 pb-3 flex flex-wrap gap-2 border-b border-border/40">
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${KIND_COLOR[doc.kind]}`}>
              {KIND_LABEL[doc.kind]}
            </span>
            {doc.certificateNumber && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{doc.certificateNumber}</span>
            )}
            {doc.batchId && (
              <span className="text-[10px] font-mono text-muted-foreground/70">{doc.batchId}</span>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Workflow pipeline strip */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workflow</p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {(doc.kind === "report" ? PIPELINE_STATES : ["draft", "published"] as WorkflowState[]).map((s, i, arr) => {
                  const past = doc.workflowHistory.some((h) => h.state === s);
                  const current = doc.workflowState === s;
                  return (
                    <div key={s} className="flex items-center gap-1 shrink-0">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                        current ? "bg-primary/10 text-primary border-primary/30 shadow-xs" :
                        past ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>
                        {past && !current && <CheckCircle2 className="size-2.5" />}
                        {STATE_LABEL[s]}
                      </div>
                      {i < arr.length - 1 && <ChevronRight className="size-3 text-muted-foreground/30 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metadata grid */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metadata</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Generated by", value: doc.generatedBy },
                  { label: "Generated on", value: fmtDate(doc.generatedAt) },
                  { label: "Batch", value: doc.batchId ?? "—" },
                  { label: "Published on", value: doc.publishedAt ? fmtDate(doc.publishedAt) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-semibold mt-0.5 font-mono truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Portal visibility if published */}
            {doc.workflowState === "published" && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Portal visibility</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { portal: "student" as const, Icon: GraduationCap, label: "Student" },
                    { portal: "parent" as const, Icon: Globe, label: "Parent" },
                    { portal: "teacher" as const, Icon: BookOpen, label: "Teacher" },
                  ]).map(({ portal, Icon, label }) => (
                    <span key={portal} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium ${
                      doc.portalVisibility[portal]
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border opacity-50"
                    }`}>
                      <Icon className="size-3" />
                      {label}
                      {doc.portalVisibility[portal] && <CheckCircle2 className="size-2.5" />}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {doc.notificationCount} notification{doc.notificationCount !== 1 ? "s" : ""} sent
                </p>
              </div>
            )}

            {/* Rejection reason */}
            {doc.workflowState === "rejected" && doc.rejectionReason && (
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
                <p className="text-[10px] font-semibold text-red-600 mb-1 flex items-center gap-1">
                  <XCircle className="size-3" /> Rejection reason
                </p>
                <p className="text-xs text-red-700">{doc.rejectionReason}</p>
              </div>
            )}

            {/* Workflow history */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                <History className="size-3" /> Workflow history
              </p>
              <WorkflowTimeline doc={doc} />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        {doc.workflowState !== "published" && doc.workflowState !== "rejected" && (
          <div className="px-5 py-4 border-t border-border bg-surface/30 flex items-center gap-2">
            {hasNext && (
              <Button variant="primary" className="flex-1 justify-center" onClick={onAdvance}>
                <ArrowRight className="size-3.5" /> {nextLabel}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onReject}
              className="text-destructive hover:bg-destructive/8 hover:text-destructive border border-destructive/20"
            >
              <XCircle className="size-3.5" /> Reject
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Pipeline column ──────────────────────────────────────────────────────────

function PipelineColumn({
  state,
  docs,
  selected,
  onToggle,
  onSelect,
}: {
  state: WorkflowState;
  docs: GeneratedDocument[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (doc: GeneratedDocument) => void;
}) {
  const EmptyIcon = COL_EMPTY_ICON[state];

  return (
    <div className={`rounded-xl border-2 border-t-4 border-border bg-background ${COL_ACCENT[state]} flex flex-col min-h-[340px] shadow-xs`}>
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${STATE_COLOR[state]}`}>
            {docs.length}
          </span>
          <span className="text-xs font-semibold">{STATE_LABEL[state]}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-3 gap-2 text-center h-full min-h-[200px]">
            <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center">
              <EmptyIcon className="size-5 text-muted-foreground/40" />
            </div>
            <p className="text-[10px] text-muted-foreground/60 leading-snug max-w-[110px]">
              {COL_EMPTY_MSG[state]}
            </p>
            {state === "draft" && (
              <Link to="/documents" search={{ view: "generate" }}>
                <button type="button" className="text-[10px] text-primary hover:underline font-medium mt-0.5">
                  Generate →
                </button>
              </Link>
            )}
          </div>
        ) : (
          docs.map((doc) => (
            <PipelineCard
              key={doc.id}
              doc={doc}
              selected={selected.has(doc.id)}
              onToggle={() => onToggle(doc.id)}
              onOpen={() => onSelect(doc)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PipelineCard({
  doc, selected, onToggle, onOpen,
}: {
  doc: GeneratedDocument;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`rounded-lg border bg-surface p-3 transition-all duration-150 hover:shadow-sm hover:border-border-strong cursor-pointer group ${
        selected ? "border-primary/50 bg-primary/5 shadow-xs" : "border-border"
      }`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onToggle(); }}
          className="mt-0.5 accent-primary shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight truncate">{doc.templateName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{doc.recipientName}</p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${KIND_COLOR[doc.kind]}`}>
              {KIND_LABEL[doc.kind]}
            </span>
            {doc.batchId && (
              <span className="text-[9px] font-mono text-muted-foreground/60 truncate max-w-[80px]">
                {doc.batchId}
              </span>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-1.5 flex items-center gap-0.5">
            <Clock className="size-2.5" />
            {new Date(doc.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </p>
        </div>
        <Eye className="size-3.5 text-muted-foreground/30 group-hover:text-primary/60 shrink-0 mt-0.5 transition-colors" />
      </div>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ docs, onSelect }: { docs: GeneratedDocument[]; onSelect: (doc: GeneratedDocument) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            {["Template", "Kind", "Recipient", "Ref", "State", "Generated", "Batch", ""].map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="size-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No documents match your filters</p>
                  <p className="text-xs text-muted-foreground/60">Try adjusting the search or filter</p>
                </div>
              </td>
            </tr>
          ) : (
            docs.map((doc) => (
              <tr
                key={doc.id}
                className="border-b border-border/50 hover:bg-surface-hover/60 transition-colors cursor-pointer group"
                onClick={() => onSelect(doc)}
              >
                <td className="px-3 py-2.5 text-xs font-medium max-w-[160px] truncate">{doc.templateName}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${KIND_COLOR[doc.kind]}`}>
                    {KIND_LABEL[doc.kind]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs">{doc.recipientName}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{doc.recipientRef}</td>
                <td className="px-3 py-2.5">
                  <Pill tone={STATE_TONE[doc.workflowState]}>{STATE_LABEL[doc.workflowState]}</Pill>
                </td>
                <td className="px-3 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                  {fmtDate(doc.generatedAt)}
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground max-w-[100px] truncate">
                  {doc.batchId ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onSelect(doc); }}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type ViewMode = "pipeline" | "table";
type StateFilter = WorkflowState | "all" | "pending";

export function DocGeneratedView() {
  const [docs, setDocs] = useState<GeneratedDocument[]>(() => getGeneratedDocuments());
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [stateFilter, setStateFilter] = useState<StateFilter>("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailDoc, setDetailDoc] = useState<GeneratedDocument | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<GeneratedDocument | null>(null);

  const refresh = useCallback(() => setDocs(getGeneratedDocuments()), []);

  const kpis = useMemo(() => ({
    draft: docs.filter((d) => d.workflowState === "draft").length,
    teacherReview: docs.filter((d) => d.workflowState === "teacher_review").length,
    adminReview: docs.filter((d) => d.workflowState === "admin_review").length,
    published: docs.filter((d) => d.workflowState === "published").length,
    rejected: docs.filter((d) => d.workflowState === "rejected").length,
  }), [docs]);

  const filtered = useMemo(() => {
    let list = docs;
    if (stateFilter === "pending") {
      list = list.filter((d) => d.workflowState !== "published" && d.workflowState !== "rejected");
    } else if (stateFilter !== "all") {
      list = list.filter((d) => d.workflowState === stateFilter);
    }
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter((d) =>
        [d.recipientName, d.templateName, d.recipientRef, d.batchId ?? ""].join(" ").toLowerCase().includes(lq),
      );
    }
    return list;
  }, [docs, stateFilter, q]);

  const handleAdvance = (doc: GeneratedDocument) => {
    advanceWorkflowState(doc.id, "Admin User");
    refresh();
    setDetailDoc((prev) =>
      prev?.id === doc.id ? (getGeneratedDocuments().find((d) => d.id === doc.id) ?? null) : prev,
    );
  };

  const handleReject = (doc: GeneratedDocument, reason: string) => {
    rejectWorkflowDocument(doc.id, "Admin User", reason);
    refresh();
    setRejectingDoc(null);
    setDetailDoc(null);
  };

  const handleBatchAdvance = () => {
    batchAdvanceWorkflow([...selected], "Admin User");
    setSelected(new Set());
    refresh();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const byState = useMemo(() => {
    const groups: Record<WorkflowState, GeneratedDocument[]> = {
      draft: [], teacher_review: [], admin_review: [], published: [], rejected: [],
    };
    filtered.forEach((d) => groups[d.workflowState].push(d));
    return groups;
  }, [filtered]);

  // Show rejected column only when filter is "all" or "rejected"
  const pipelineCols = useMemo(() => {
    if (stateFilter === "rejected" || stateFilter === "all") {
      return [...PIPELINE_STATES, "rejected" as WorkflowState];
    }
    return PIPELINE_STATES;
  }, [stateFilter]);

  return (
    <PageStack>
      {/* KPIs */}
      <KpiGrid cols={5}>
        <Kpi label="Draft" value={String(kpis.draft)} tone="neutral" />
        <Kpi label="Teacher review" value={String(kpis.teacherReview)} tone={kpis.teacherReview > 0 ? "down" : "neutral"} />
        <Kpi label="Admin review" value={String(kpis.adminReview)} tone={kpis.adminReview > 0 ? "down" : "neutral"} />
        <Kpi label="Published" value={String(kpis.published)} tone="up" />
        <Kpi label="Rejected" value={String(kpis.rejected)} tone={kpis.rejected > 0 ? "down" : "neutral"} />
      </KpiGrid>

      <Card>
        <PageToolbar>
          <SearchInput
            placeholder="Search recipient, template, batch…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[180px] max-w-sm"
          />

          <SegmentedControl
            value={stateFilter}
            onChange={(v) => setStateFilter(v as StateFilter)}
            options={[
              { label: "Pending", value: "pending" },
              { label: "All", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
              { label: "Rejected", value: "rejected" },
            ]}
          />

          {/* View toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-md border border-border bg-muted/40">
            {(["pipeline", "table"] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                title={m === "pipeline" ? "Pipeline view" : "Table view"}
                className={`px-2.5 h-7 rounded text-[11px] font-medium capitalize transition-colors ${
                  viewMode === m ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "pipeline" ? <Layers className="size-3.5" /> : <FileText className="size-3.5" />}
              </button>
            ))}
          </div>

          <Link to="/documents" search={{ view: "generate" }}>
            <Button variant="primary" size="sm">
              <Wand2 className="size-3.5" /> Generate new
            </Button>
          </Link>
        </PageToolbar>

        {/* Batch action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/15 flex items-center gap-3 flex-wrap">
            <div className="size-5 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">{selected.size}</span>
            </div>
            <span className="text-xs font-medium text-primary">{selected.size} selected</span>
            <Button size="sm" variant="primary" onClick={handleBatchAdvance}>
              <ArrowRight className="size-3.5" /> Advance selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-muted-foreground">
              Clear
            </Button>
          </div>
        )}

        <div className="p-4">
          {viewMode === "pipeline" ? (
            <div className={`grid gap-3 ${pipelineCols.length === 5 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
              {pipelineCols.map((state) => (
                <PipelineColumn
                  key={state}
                  state={state}
                  docs={byState[state]}
                  selected={selected}
                  onToggle={toggleSelect}
                  onSelect={setDetailDoc}
                />
              ))}
            </div>
          ) : (
            <TableView docs={filtered} onSelect={setDetailDoc} />
          )}
        </div>
      </Card>

      {/* Detail panel */}
      {detailDoc && (
        <DetailPanel
          doc={getGeneratedDocuments().find((d) => d.id === detailDoc.id) ?? detailDoc}
          onAdvance={() => handleAdvance(detailDoc)}
          onReject={() => setRejectingDoc(detailDoc)}
          onClose={() => setDetailDoc(null)}
        />
      )}

      {/* Reject modal */}
      {rejectingDoc && (
        <RejectModal
          doc={rejectingDoc}
          onConfirm={(reason) => handleReject(rejectingDoc, reason)}
          onClose={() => setRejectingDoc(null)}
        />
      )}
    </PageStack>
  );
}
