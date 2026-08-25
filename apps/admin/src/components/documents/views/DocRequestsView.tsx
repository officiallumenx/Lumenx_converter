import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Pill,
  Button,
  SearchInput,
  SegmentedControl,
  DataTable,
  Th,
  Td,
  Tr,
  PageToolbar,
  ToolbarMeta,
  KpiGrid,
  Kpi,
  PageStack,
  Modal,
  Field,
  TextInput,
  TextArea,
  Select,
  FormStack,
  FormGrid,
} from "@lumenx/ui-admin";
import {
  STUDIO_REQUESTS,
  type StudioRequest,
  type StudioRequestStatus,
  type StudioRequestType,
} from "@/lib/doc-requests-data";
import {
  notifyDocumentRequestApproved,
  notifyDocumentRequestRejected,
  notifyDocumentGenerated,
  notifyDocumentReady,
} from "@lumenx/module-notifications";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Package,
  Plus,
  User,
  XCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StudioRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  draft_generated: "Draft Generated",
  published: "Published",
};

const STATUS_TONE: Record<StudioRequestStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  draft_generated: "info",
  published: "neutral",
};

const TYPE_LABEL: Record<StudioRequestType, string> = {
  single: "Single Document",
  multiple: "Multiple Documents",
  package: "Package",
};

const TYPE_TONE: Record<StudioRequestType, "info" | "success" | "neutral"> = {
  single: "info",
  multiple: "success",
  package: "neutral",
};

const STATUS_NEXT: Partial<Record<StudioRequestStatus, StudioRequestStatus>> = {
  pending: "approved",
  approved: "draft_generated",
  draft_generated: "published",
};

const STATUS_NEXT_LABEL: Partial<Record<StudioRequestStatus, string>> = {
  pending: "Approve request",
  approved: "Mark as Draft Generated",
  draft_generated: "Publish & Issue",
};

// ─── New-request wizard ───────────────────────────────────────────────────────

function NewRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<StudioRequestType>("single");

  const reset = () => { setStep(1); setType("single"); onClose(); };

  return (
    <Modal
      open={open}
      onClose={reset}
      title="New Document Request"
      subtitle="Step a student or parent through the document request workflow"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" onClick={step === 1 ? reset : () => setStep((s) => (s - 1) as 1 | 2 | 3)}>
            {step === 1 ? "Cancel" : "← Back"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Step {step} of 3</span>
            {step < 3 ? (
              <Button variant="primary" onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
                Continue →
              </Button>
            ) : (
              <Button variant="primary" onClick={reset}>Submit Request</Button>
            )}
          </div>
        </div>
      }
    >
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select the type of document request to create.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["single", "multiple", "package"] as StudioRequestType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  type === t
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-border bg-surface hover:bg-surface-hover hover:border-border-strong"
                }`}
              >
                <div className="mb-2">
                  {t === "single" && <FileText className="size-5 text-primary" />}
                  {t === "multiple" && <FileText className="size-5 text-emerald-500" />}
                  {t === "package" && <Package className="size-5 text-purple-500" />}
                </div>
                <p className="text-sm font-semibold">{TYPE_LABEL[t]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t === "single" && "Request one specific document for a student."}
                  {t === "multiple" && "Request several different documents in one go."}
                  {t === "package" && "Request a predefined document bundle."}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <FormStack>
          <p className="text-sm text-muted-foreground">
            {type === "package" ? "Select a package and the student." : "Select the student and document(s)."}
          </p>
          <FormGrid cols={2}>
            <Field label="Student name" required>
              <TextInput placeholder="Search student name…" />
            </Field>
            <Field label="Class & section" required>
              <Select>
                <option value="">Select class…</option>
                {["VI-A","VI-B","VII-A","VII-B","VIII-A","VIII-B","IX-A","IX-B","X-A","X-B","XI-A","XI-B","XI-C","XII-A","XII-B","XII-C"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Roll number">
              <TextInput placeholder="e.g. 2025001" />
            </Field>
            <Field label="Requested by" required>
              <Select>
                <option value="">Select…</option>
                <option value="student">Student</option>
                <option value="parent">Parent / Guardian</option>
                <option value="staff">Staff</option>
              </Select>
            </Field>
          </FormGrid>

          {type === "package" ? (
            <Field label="Document package" required>
              <Select>
                <option value="">Select a package…</option>
                <option value="PKG-001">Class XII School Leaving Bundle</option>
                <option value="PKG-002">Sports NOC Bundle</option>
                <option value="PKG-003">Mid-Year Transfer Bundle</option>
                <option value="PKG-004">State Merit Scholarship Kit</option>
              </Select>
            </Field>
          ) : (
            <Field
              label={type === "multiple" ? "Document types" : "Document type"}
              hint={type === "multiple" ? "Hold Ctrl to select multiple" : ""}
              required
            >
              <Select multiple={type === "multiple"} size={type === "multiple" ? 5 : 1}>
                <option value="bonafide">Bonafide Certificate</option>
                <option value="transfer">Transfer Certificate</option>
                <option value="conduct">Conduct Certificate</option>
                <option value="character">Character Certificate</option>
                <option value="marksheet">Marksheet</option>
                <option value="migration">Migration Certificate</option>
                <option value="custom">Custom / Other</option>
              </Select>
            </Field>
          )}
        </FormStack>
      )}

      {step === 3 && (
        <FormStack>
          <p className="text-sm text-muted-foreground">Provide the purpose and deadline for this request.</p>
          <Field label="Purpose" required>
            <TextInput placeholder="e.g. Bank account opening, Scholarship application…" />
          </Field>
          <Field label="Additional details">
            <TextArea placeholder="Any context the admin should know…" />
          </Field>
          <FormGrid cols={2}>
            <Field label="Required by date" required>
              <TextInput type="date" />
            </Field>
            <Field label="Urgency">
              <Select>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Assign to">
            <Select>
              <option value="">Auto-assign…</option>
              <option value="priya-nair">Mrs. Priya Nair (Vice Principal)</option>
              <option value="vikram-tiwari">Mr. Vikram Tiwari (Head of Academics)</option>
              <option value="sunita-rao">Ms. Sunita Rao (Office Admin)</option>
            </Select>
          </Field>
        </FormStack>
      )}
    </Modal>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StudioRequestStatus }) {
  const icons: Record<StudioRequestStatus, React.ReactNode> = {
    pending: <Clock className="size-3" />,
    approved: <CheckCircle2 className="size-3" />,
    rejected: <XCircle className="size-3" />,
    draft_generated: <FileText className="size-3" />,
    published: <CheckCircle2 className="size-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        status === "pending" ? "bg-amber-500/10 text-amber-600" :
        status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
        status === "rejected" ? "bg-red-500/10 text-red-600" :
        status === "draft_generated" ? "bg-blue-500/10 text-blue-600" :
        "bg-muted text-muted-foreground"
      }`}
    >
      {icons[status]}
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function InfoGrid({ pairs }: { pairs: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      {pairs.map((p, i) => (
        <div key={i}>
          <p className="text-xs text-muted-foreground mb-0.5">{p.label}</p>
          <div className="font-medium">{p.value}</div>
        </div>
      ))}
    </div>
  );
}

function RequestDetail({
  request,
  onBack,
  onPatch,
}: {
  request: StudioRequest;
  onBack: () => void;
  onPatch: (id: string, status: StudioRequestStatus, reason?: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const next = STATUS_NEXT[request.status];
  const nextLabel = STATUS_NEXT_LABEL[request.status];

  return (
    <PageStack>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5" /> Back to requests
        </Button>
      </div>

      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-lg font-bold tracking-tight">{request.id}</span>
          <Pill tone={TYPE_TONE[request.requestType]}>{TYPE_LABEL[request.requestType]}</Pill>
          <StatusBadge status={request.status} />
          {request.urgency === "urgent" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-semibold">
              <AlertTriangle className="size-3" /> Urgent
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {next && nextLabel && (
            <Button variant="primary" size="sm" onClick={() => onPatch(request.id, next)}>
              {nextLabel}
            </Button>
          )}
          {(request.status === "pending" || request.status === "approved") && (
            <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>
              Reject request
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left — 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card>
            <CardHeader title="Student information" />
            <CardBody>
              <InfoGrid pairs={[
                { label: "Student name", value: <span className="flex items-center gap-1.5"><User className="size-3.5 text-muted-foreground" />{request.studentName}</span> },
                { label: "Class & section", value: `${request.studentClass}-${request.studentSection}` },
                { label: "Roll number", value: <span className="font-mono">{request.studentRollNo}</span> },
                { label: "Requested by", value: <span className="capitalize">{request.requestedBy}</span> },
                { label: "Parent / Guardian", value: request.parentName },
                { label: "Parent phone", value: <span className="font-mono text-xs">{request.parentPhone}</span> },
              ]} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={request.requestType === "package"
                ? `Package — ${request.packageName}`
                : "Requested documents"}
              hint={request.packageId ?? undefined}
            />
            <CardBody>
              <div className="space-y-2">
                {request.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-md border border-border bg-background">
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{doc.categoryLabel}</p>
                        <p className="text-xs text-muted-foreground capitalize font-mono">{doc.documentKind}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-surface px-2 py-0.5 rounded border border-border">×{doc.quantity}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Purpose & details" />
            <CardBody>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Purpose</p>
                  <p className="font-semibold">{request.purpose}</p>
                </div>
                {request.purposeDetails && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Additional details</p>
                    <p className="text-sm leading-relaxed text-foreground/80">{request.purposeDetails}</p>
                  </div>
                )}
                {request.rejectionReason && (
                  <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive mb-1">Rejection reason</p>
                    <p className="text-sm text-destructive/90">{request.rejectionReason}</p>
                  </div>
                )}
                {request.remarks && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Admin remarks</p>
                    <p className="text-sm">{request.remarks}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right — 5 cols */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card>
            <CardHeader title="Request details" />
            <CardBody>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Requested on</p>
                    <p className="font-mono text-xs">{request.requestedOn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Required by</p>
                    <p className="font-mono text-xs">{request.requiredBy}</p>
                  </div>
                  {request.approvedOn && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Approved on</p>
                      <p className="font-mono text-xs">{request.approvedOn}</p>
                    </div>
                  )}
                  {request.generatedOn && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Draft generated</p>
                      <p className="font-mono text-xs">{request.generatedOn}</p>
                    </div>
                  )}
                  {request.publishedOn && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Published on</p>
                      <p className="font-mono text-xs">{request.publishedOn}</p>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-0.5">Assigned to</p>
                  <p className="font-medium">{request.assignedTo ?? <span className="text-muted-foreground italic">Unassigned</span>}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity log" />
            <CardBody>
              {request.timeline.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Clock className="size-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <ol className="relative border-l border-border ml-3 space-y-4">
                  {request.timeline.map((entry, idx) => (
                    <li key={idx} className="pl-4 -ml-px relative">
                      <span className="absolute -left-1.5 top-1.5 size-3 rounded-full bg-primary/80 ring-2 ring-background" />
                      <p className="text-xs font-semibold">{entry.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.date} · {entry.time}
                      </p>
                      <p className="text-xs text-muted-foreground">by {entry.by}</p>
                      {entry.note && <p className="text-xs mt-0.5 text-foreground/70 italic">{entry.note}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this request"
        subtitle={`${request.id} — ${request.studentName}`}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                onPatch(request.id, "rejected", rejectReason);
                setRejectOpen(false);
              }}
            >
              Confirm rejection
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            The student will be notified of this rejection. You can re-approve later if needed.
          </div>
          <Field label="Reason for rejection" required>
            <TextArea
              placeholder="Explain why this request is being rejected…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </Field>
        </div>
      </Modal>
    </PageStack>
  );
}

// ─── Main list view ───────────────────────────────────────────────────────────

type StatusFilter = StudioRequestStatus | "all";
type TypeFilter = StudioRequestType | "all";

export function DocRequestsView() {
  const [rows, setRows] = useState(STUDIO_REQUESTS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "urgent">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<StudioRequest | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const summary = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    draft: rows.filter((r) => r.status === "draft_generated").length,
    published: rows.filter((r) => r.status === "published").length,
    urgent: rows.filter((r) => r.urgency === "urgent" && r.status !== "published" && r.status !== "rejected").length,
  }), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.requestType !== typeFilter) return false;
      if (urgencyFilter === "urgent" && r.urgency !== "urgent") return false;
      if (q) {
        const lq = q.toLowerCase();
        const docs = r.documents.map((d) => d.categoryLabel).join(" ");
        const pkg = r.packageName ?? "";
        return `${r.studentName} ${r.studentClass}-${r.studentSection} ${r.studentRollNo} ${r.id} ${r.purpose} ${docs} ${pkg}`.toLowerCase().includes(lq);
      }
      return true;
    });
  }, [rows, statusFilter, typeFilter, urgencyFilter, q]);

  const patch = (id: string, status: StudioRequestStatus, reason?: string) => {
    const current = rows.find((r) => r.id === id);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const now = new Date().toISOString().split("T")[0];
        const timeNow = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
        const actionMap: Partial<Record<StudioRequestStatus, string>> = {
          approved: "Request approved",
          rejected: "Request rejected",
          draft_generated: "Draft generated",
          published: "Published & issued",
        };
        return {
          ...r,
          status,
          approvedOn: status === "approved" ? now : r.approvedOn,
          generatedOn: status === "draft_generated" ? now : r.generatedOn,
          publishedOn: status === "published" ? now : r.publishedOn,
          timeline: [
            ...r.timeline,
            {
              date: now,
              time: timeNow,
              action: actionMap[status] ?? `Status → ${status}`,
              by: "Admin",
              note: status === "rejected" ? reason?.trim() || "" : "",
            },
          ],
        };
      }),
    );
    if (current) {
      const documentLabel =
        current.packageName ||
        current.documents.map((d) => d.categoryLabel).join(", ") ||
        "Document";
      if (status === "approved") {
        notifyDocumentRequestApproved({
          requestId: current.id,
          documentLabel,
          studentName: current.studentName,
        });
      } else if (status === "rejected") {
        notifyDocumentRequestRejected({
          requestId: current.id,
          documentLabel,
          studentName: current.studentName,
          reason: reason?.trim() || "No reason provided",
        });
      } else if (status === "draft_generated") {
        notifyDocumentGenerated({
          requestId: current.id,
          documentLabel,
          studentName: current.studentName,
        });
      } else if (status === "published") {
        notifyDocumentReady({
          requestId: current.id,
          documentLabel,
          studentName: current.studentName,
        });
      }
    }
    if (selected?.id === id) {
      setSelected((prev) => (prev ? rows.find((r) => r.id === id) ?? prev : null));
    }
  };

  if (selected) {
    const live = rows.find((r) => r.id === selected.id) ?? selected;
    return (
      <RequestDetail
        request={live}
        onBack={() => setSelected(null)}
        onPatch={patch}
      />
    );
  }

  return (
    <PageStack>
      <KpiGrid cols={5}>
        <Kpi label="Pending" value={String(summary.pending)} tone={summary.pending > 0 ? "down" : "neutral"} />
        <Kpi label="Approved" value={String(summary.approved)} tone="up" />
        <Kpi label="Draft generated" value={String(summary.draft)} tone="neutral" />
        <Kpi label="Published" value={String(summary.published)} tone="up" />
        <Kpi label="Urgent open" value={String(summary.urgent)} tone={summary.urgent > 0 ? "down" : "neutral"} />
      </KpiGrid>

      <Card>
        <PageToolbar>
          <SearchInput
            placeholder="Search student, roll no, request ID, document…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[220px] max-w-sm"
          />
          <SegmentedControl
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { label: "All types", value: "all" },
              { label: "Single", value: "single" },
              { label: "Multiple", value: "multiple" },
              { label: "Package", value: "package" },
            ]}
          />
          <SegmentedControl
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Draft", value: "draft_generated" },
              { label: "Published", value: "published" },
              { label: "Rejected", value: "rejected" },
            ]}
          />
          <SegmentedControl
            value={urgencyFilter}
            onChange={(v) => setUrgencyFilter(v as typeof urgencyFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Urgent only", value: "urgent" },
            ]}
          />
          <ToolbarMeta>{filtered.length} requests</ToolbarMeta>
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="size-3.5" /> New request
          </Button>
        </PageToolbar>

        <DataTable>
          <thead>
            <tr>
              <Th>Request ID</Th>
              <Th>Type</Th>
              <Th>Student</Th>
              <Th>Class</Th>
              <Th>Documents</Th>
              <Th>Purpose</Th>
              <Th>Required by</Th>
              <Th>Assigned to</Th>
              <Th>Status</Th>
              <Th>
                {""}
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="size-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No requests match your filters</p>
                    <p className="text-xs text-muted-foreground/60">Try adjusting the filters or search term</p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((req) => (
              <tr
                key={req.id}
                className="lx-table-tr transition-colors duration-150 cursor-pointer hover:bg-surface-hover/60 group"
                onClick={() => setSelected(req)}
              >
                <Td className="font-mono text-xs whitespace-nowrap">{req.id}</Td>
                <Td>
                  <Pill tone={TYPE_TONE[req.requestType]}>
                    {req.requestType === "single" ? "Single" : req.requestType === "multiple" ? "Multiple" : "Package"}
                  </Pill>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-medium">{req.studentName}</span>
                    {req.urgency === "urgent" && (
                      <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                    )}
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{req.studentClass}-{req.studentSection}</Td>
                <Td>
                  {req.requestType === "package" ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Package className="size-3 text-muted-foreground" />
                      <span className="truncate max-w-[140px]">{req.packageName}</span>
                    </span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {req.documents.slice(0, 2).map((d, i) => (
                        <span key={i} className="text-xs text-muted-foreground truncate max-w-[160px]">{d.categoryLabel}</span>
                      ))}
                      {req.documents.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{req.documents.length - 2} more</span>
                      )}
                    </div>
                  )}
                </Td>
                <Td className="text-xs text-muted-foreground max-w-[160px] truncate">{req.purpose}</Td>
                <Td className="text-xs text-muted-foreground whitespace-nowrap">{req.requiredBy}</Td>
                <Td className="text-xs text-muted-foreground whitespace-nowrap">
                  {req.assignedTo ?? <span className="italic">Unassigned</span>}
                </Td>
                <Td>
                  <Pill tone={STATUS_TONE[req.status]}>{STATUS_LABEL[req.status]}</Pill>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setSelected(req); }}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>

      <NewRequestModal open={newOpen} onClose={() => setNewOpen(false)} />
    </PageStack>
  );
}
