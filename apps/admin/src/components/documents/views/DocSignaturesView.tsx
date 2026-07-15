import { IconChip } from "@/components/IconChip";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Pill,
  Button,
  KpiGrid,
  Kpi,
  PageStack,
  PageToolbar,
  SegmentedControl,
  ToolbarMeta,
  Modal,
  Field,
  TextInput,
  TextArea,
  Select,
  FormStack,
  FormGrid,
} from "@lumenx/ui-admin";
import {
  SIGNATORIES_V2,
  ROLE_LABEL,
  ROLE_COLOR,
  ROLE_AVATAR_COLOR,
  KIND_LABEL,
  KIND_COLOR,
  POSITION_LABEL,
  type Signatory,
  type SignatoryRole,
  type SignatoryTemplateAssignment,
} from "@/lib/doc-signatures-data";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  Hash,
  ImageIcon,
  Info,
  Lock,
  PenLine,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
  Zap,
} from "lucide-react";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ signatory: s, size = "md" }: { signatory: Signatory; size?: "sm" | "md" | "lg" }) {
  const initials = s.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const sizeClass = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  return (
    <div className={`${sizeClass} rounded-full font-bold flex items-center justify-center shrink-0 ${ROLE_AVATAR_COLOR[s.role]}`}>
      {initials}
    </div>
  );
}

// ─── Signature image panel ────────────────────────────────────────────────────

function SignaturePreview({
  signatory,
  onUpload,
  onRemove,
}: {
  signatory: Signatory;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {signatory.signatureImageUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-lg border border-border bg-white overflow-hidden flex items-center justify-center p-3 min-h-[80px]">
            <img
              src={signatory.signatureImageUrl}
              alt={`${signatory.name}'s signature`}
              className="max-h-16 max-w-full object-contain"
            />
            <div className="absolute inset-0 flex items-end justify-end p-1.5 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/10">
              <button
                type="button"
                onClick={onRemove}
                className="size-6 rounded bg-destructive/80 flex items-center justify-center"
                title="Remove signature"
              >
                <X className="size-3 text-white" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Uploaded {signatory.signatureImageUploadedOn}
            {signatory.signatureImageNote && ` · ${signatory.signatureImageNote}`}
          </div>
          <label className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded border border-border bg-surface hover:bg-surface-hover text-xs font-medium cursor-pointer transition-colors">
            <Upload className="size-3" /> Replace signature
            <input type="file" accept="image/*,image/svg+xml" className="hidden" onChange={handleFile} />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-8 gap-2">
            <PenLine className="size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No signature uploaded</p>
            <label className="inline-flex items-center gap-1.5 px-3 h-8 rounded border border-border bg-surface hover:bg-surface-hover text-xs font-medium cursor-pointer transition-colors mt-1">
              <Upload className="size-3" /> Upload signature image
              <input type="file" accept="image/*,image/svg+xml" className="hidden" onChange={handleFile} />
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Upload a PNG, JPG, or SVG of the handwritten signature on a white or transparent background.
            Recommended size: 400 × 120 px.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Digital signature future panel ──────────────────────────────────────────

function DigitalSignaturePanel() {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <IconChip icon={ShieldCheck} size="xs" />
        <div>
          <p className="text-xs font-semibold">Digital Signature</p>
          <p className="text-[10px] text-muted-foreground">Cryptographically signed documents</p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-semibold text-muted-foreground">
          Coming soon
        </span>
      </div>

      <div className="space-y-2">
        {[
          { icon: Lock, label: "DSC (Digital Signature Certificate)", desc: "USB token-based PKI signature" },
          { icon: ShieldCheck, label: "Aadhaar eSign", desc: "OTP-based Aadhaar signing via NSDL" },
          { icon: Zap, label: "eMudhra / DocuSign", desc: "Enterprise cloud signature platforms" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-border bg-background">
            <Icon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground/60 mt-0.5">—</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        The signatory schema already includes provider, certificate serial, and validity fields.
        Digital signing will activate on each signatory record when enabled in a future release.
      </p>
    </div>
  );
}

// ─── Template assignment panel ────────────────────────────────────────────────

const ALL_TEMPLATES: SignatoryTemplateAssignment[] = [
  { templateId: "tpl-sys-bonafide", templateName: "Bonafide Certificate — Ornate", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-conduct", templateName: "Conduct Certificate", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-achievement", templateName: "Certificate of Achievement — Elegant", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-character", templateName: "Character Certificate", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-study", templateName: "Study Certificate", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-attendance-cert", templateName: "Attendance Excellence Certificate", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-sports-winner", templateName: "Sports Winner Certificate", documentKind: "certificate", assignedOn: "", position: "right" },
  { templateId: "tpl-sys-sports-participation", templateName: "Sports Participation Certificate", documentKind: "certificate", assignedOn: "", position: "right" },
  { templateId: "tpl-sys-toppers-cert", templateName: "Subject Topper Certificate", documentKind: "certificate", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-progress", templateName: "Progress Report — Term", documentKind: "report", assignedOn: "", position: "right" },
  { templateId: "tpl-sys-annual", templateName: "Annual Report Card", documentKind: "report", assignedOn: "", position: "right" },
  { templateId: "tpl-sys-semester-report", templateName: "Semester Report Card", documentKind: "report", assignedOn: "", position: "right" },
  { templateId: "tpl-sys-transfer", templateName: "Transfer Certificate — Board Format", documentKind: "document", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-marksheet", templateName: "Mark Sheet — Semester", documentKind: "document", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-migration", templateName: "Migration Certificate", documentKind: "document", assignedOn: "", position: "left" },
  { templateId: "tpl-sys-student-id", templateName: "Student ID — Standard", documentKind: "id_card", assignedOn: "", position: "center" },
  { templateId: "tpl-sys-teacher-id", templateName: "Teacher ID — Professional", documentKind: "id_card", assignedOn: "", position: "center" },
  { templateId: "tpl-sys-staff-id", templateName: "Staff ID Card — Standard", documentKind: "id_card", assignedOn: "", position: "center" },
  { templateId: "tpl-sys-visitor-pass", templateName: "Visitor Pass", documentKind: "id_card", assignedOn: "", position: "center" },
];

function TemplateAssignmentPanel({
  signatory,
  onAdd,
  onRemove,
}: {
  signatory: Signatory;
  onAdd: (assignment: SignatoryTemplateAssignment) => void;
  onRemove: (templateId: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<"left" | "right" | "center">("left");

  const assignedIds = new Set(signatory.assignedTemplates.map((a) => a.templateId));
  const available = ALL_TEMPLATES.filter((t) => !assignedIds.has(t.templateId));

  const handleAdd = () => {
    const tpl = ALL_TEMPLATES.find((t) => t.templateId === selectedTemplateId);
    if (!tpl) return;
    onAdd({ ...tpl, position: selectedPosition, assignedOn: new Date().toISOString().slice(0, 10) });
    setAddOpen(false);
    setSelectedTemplateId("");
  };

  const byKind = signatory.assignedTemplates.reduce(
    (acc, a) => {
      (acc[a.documentKind] = acc[a.documentKind] ?? []).push(a);
      return acc;
    },
    {} as Record<string, SignatoryTemplateAssignment[]>,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {signatory.assignedTemplates.length} template{signatory.assignedTemplates.length !== 1 ? "s" : ""} assigned
        </span>
        {available.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
            <Plus className="size-3" /> Assign template
          </Button>
        )}
      </div>

      {signatory.assignedTemplates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <FileText className="size-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No templates assigned yet.</p>
          <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
            <Plus className="size-3" /> Assign first template
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(["certificate", "report", "document", "id_card"] as const)
            .filter((k) => byKind[k]?.length)
            .map((kind) => (
              <div key={kind}>
                <p className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1.5 w-fit ${KIND_COLOR[kind]}`}>
                  {KIND_LABEL[kind]}
                </p>
                <div className="space-y-1.5">
                  {byKind[kind].map((a) => (
                    <div
                      key={a.templateId}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:border-border-strong transition-colors"
                    >
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{a.templateName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {POSITION_LABEL[a.position]} · since {a.assignedOn}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(a.templateId)}
                        className="size-6 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors shrink-0"
                        title="Remove assignment"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add assignment modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Assign to template"
        subtitle={`Adding ${signatory.name} as a signatory`}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={!selectedTemplateId}>
              <Check className="size-3.5" /> Assign
            </Button>
          </div>
        }
      >
        <FormStack>
          <Field label="Template" required>
            <Select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
              <option value="">Select a template…</option>
              {(["certificate", "report", "document", "id_card"] as const).map((kind) => {
                const group = available.filter((t) => t.documentKind === kind);
                if (!group.length) return null;
                return (
                  <optgroup key={kind} label={KIND_LABEL[kind]}>
                    {group.map((t) => (
                      <option key={t.templateId} value={t.templateId}>{t.templateName}</option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
          </Field>
          <Field label="Signature position on document">
            <Select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value as typeof selectedPosition)}>
              <option value="left">Left slot</option>
              <option value="right">Right slot</option>
              <option value="center">Center / single slot</option>
            </Select>
          </Field>
        </FormStack>
      </Modal>
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function SignatoryDetail({
  signatory: initial,
  onBack,
  onPatch,
}: {
  signatory: Signatory;
  onBack: () => void;
  onPatch: (id: string, patch: Partial<Signatory>) => void;
}) {
  const sig = initial;

  const handleUpload = (url: string) => {
    onPatch(sig.id, {
      signatureImageUrl: url,
      signatureImageUploadedOn: new Date().toISOString().slice(0, 10),
    });
  };

  const handleRemoveSig = () => onPatch(sig.id, { signatureImageUrl: null, signatureImageUploadedOn: null });

  const handleAddTemplate = (a: SignatoryTemplateAssignment) =>
    onPatch(sig.id, { assignedTemplates: [...sig.assignedTemplates, a] });

  const handleRemoveTemplate = (templateId: string) =>
    onPatch(sig.id, { assignedTemplates: sig.assignedTemplates.filter((a) => a.templateId !== templateId) });

  return (
    <PageStack>
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5" /> All signatories
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar signatory={sig} size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{sig.name}</h2>
              {sig.isDefault && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-semibold">
                  <Star className="size-2.5 fill-amber-500 text-amber-500" /> Default signer
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold ${ROLE_COLOR[sig.role]}`}>
                {ROLE_LABEL[sig.role]}
              </span>
              <span className="text-xs text-muted-foreground">{sig.designation} · {sig.department}</span>
              <Pill tone={sig.status === "active" ? "success" : "neutral"}>{sig.status}</Pill>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!sig.isDefault && sig.status === "active" && (
            <Button size="sm" onClick={() => onPatch(sig.id, { isDefault: true })}>
              <Star className="size-3.5" /> Set as default
            </Button>
          )}
          <Button
            size="sm"
            variant={sig.status === "active" ? "ghost" : "primary"}
            onClick={() => onPatch(sig.id, { status: sig.status === "active" ? "inactive" : "active" })}
          >
            {sig.status === "active" ? <><XCircle className="size-3.5" /> Deactivate</> : <><CheckCircle2 className="size-3.5" /> Reactivate</>}
          </Button>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left — 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          {/* Info */}
          <Card>
            <CardHeader title="Signatory information" />
            <CardBody>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  { label: "Full name", value: sig.name },
                  { label: "Designation", value: sig.designation },
                  { label: "Department", value: sig.department },
                  { label: "Role", value: ROLE_LABEL[sig.role] },
                  { label: "Email", value: <a href={`mailto:${sig.email}`} className="text-primary hover:underline text-xs">{sig.email}</a> },
                  { label: "Phone", value: <span className="font-mono text-xs">{sig.phone}</span> },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">{item.label}</p>
                    <div className="font-medium text-xs">{item.value}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Signature image */}
          <Card>
            <CardHeader title="Signature image" hint="PNG, JPG, or SVG on white/transparent background" />
            <CardBody>
              <SignaturePreview
                signatory={sig}
                onUpload={handleUpload}
                onRemove={handleRemoveSig}
              />
            </CardBody>
          </Card>

          {/* Digital signature — future */}
          <Card>
            <CardHeader title="Digital signature" />
            <CardBody>
              <DigitalSignaturePanel />
            </CardBody>
          </Card>
        </div>

        {/* Right — 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader title="Usage statistics" />
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center px-3 py-3 rounded-lg border border-border bg-background">
                  <p className="text-xl font-bold text-foreground">{sig.totalDocumentsSigned.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Total docs signed</p>
                </div>
                <div className="text-center px-3 py-3 rounded-lg border border-border bg-background">
                  <p className="text-xl font-bold text-foreground">{sig.assignedTemplates.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Templates assigned</p>
                </div>
                <div className="text-center px-3 py-3 rounded-lg border border-border bg-background">
                  <p className="text-xs font-bold text-foreground">{sig.lastUsedOn ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Last used</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="size-3" /> Added {sig.addedOn}
                {sig.signatureImageUrl && <><span>·</span><CheckCircle2 className="size-3 text-emerald-500" /> Signature image on file</>}
              </div>
            </CardBody>
          </Card>

          {/* Template assignments */}
          <Card>
            <CardHeader title="Template assignments" hint="Documents this person signs" />
            <CardBody>
              <TemplateAssignmentPanel
                signatory={sig}
                onAdd={handleAddTemplate}
                onRemove={handleRemoveTemplate}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </PageStack>
  );
}

// ─── Signatory card (list view) ───────────────────────────────────────────────

function SignatoryCard({
  sig,
  onSelect,
  onToggle,
  onSetDefault,
}: {
  sig: Signatory;
  onSelect: () => void;
  onToggle: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div
      className={`rounded-xl border bg-surface flex flex-col transition-all duration-150 ${
        sig.status === "inactive"
          ? "opacity-55 border-border/50"
          : "border-border hover:border-primary/40 hover:shadow-elevated"
      }`}
    >
      <div className="p-4 flex-1 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar signatory={sig} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="font-semibold text-sm leading-tight">{sig.name}</p>
              {sig.isDefault && (
                <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{sig.designation}</p>
            <p className="text-[10px] text-muted-foreground">{sig.department}</p>
          </div>
        </div>

        {/* Role + status */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold ${ROLE_COLOR[sig.role]}`}>
            {ROLE_LABEL[sig.role]}
          </span>
          <Pill tone={sig.status === "active" ? "success" : "neutral"}>{sig.status}</Pill>
        </div>

        {/* Signature preview */}
        <div className="rounded-lg border border-border bg-white overflow-hidden min-h-[48px] flex items-center justify-center p-2">
          {sig.signatureImageUrl ? (
            <img
              src={sig.signatureImageUrl}
              alt={`${sig.name}'s signature`}
              className="max-h-10 max-w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <PenLine className="size-3" /> No signature uploaded
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <FileText className="size-3" /> {sig.assignedTemplates.length} template{sig.assignedTemplates.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-0.5">
            <Hash className="size-3" /> {sig.totalDocumentsSigned.toLocaleString()}
          </span>
          {sig.lastUsedOn && (
            <span className="ml-auto">{sig.lastUsedOn}</span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2">
        <Button size="sm" variant="primary" className="flex-1 justify-center" onClick={onSelect}>
          <Eye className="size-3" /> View details
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle}>
          {sig.status === "active" ? "Disable" : "Enable"}
        </Button>
        {!sig.isDefault && sig.status === "active" && (
          <button
            type="button"
            onClick={onSetDefault}
            title="Set as default signer"
            className="size-8 rounded flex items-center justify-center hover:bg-surface-hover border border-transparent hover:border-border text-muted-foreground hover:text-amber-500 transition-colors"
          >
            <Star className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add signatory modal ──────────────────────────────────────────────────────

function AddSignatoryModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (sig: Signatory) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<SignatoryRole>("custom");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sigUrl, setSigUrl] = useState<string | null>(null);

  const reset = () => {
    setStep(1); setName(""); setDesignation(""); setRole("custom");
    setDepartment(""); setEmail(""); setPhone(""); setSigUrl(null);
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSigUrl(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newSig: Signatory = {
      id: `SIG-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      designation: designation.trim(),
      role,
      department: department.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status: "active",
      isDefault: false,
      signatureImageUrl: sigUrl,
      signatureImageUploadedOn: sigUrl ? today : null,
      signatureImageNote: "",
      assignedTemplates: [],
      digitalSignature: { enabled: false, provider: null, certificateSerial: null, certValidUntil: null, setupGuideUrl: null },
      addedOn: today,
      lastUsedOn: null,
      totalDocumentsSigned: 0,
    };
    onAdd(newSig);
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={reset}
      title="Add signatory"
      subtitle="Authorise a staff member to sign institute documents"
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" onClick={step === 1 ? reset : () => setStep(1)}>
            {step === 1 ? "Cancel" : "← Back"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Step {step} of 2</span>
            {step === 1 ? (
              <Button variant="primary" onClick={() => setStep(2)} disabled={!name.trim() || !designation.trim()}>
                Next →
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit}>
                <Check className="size-3.5" /> Add signatory
              </Button>
            )}
          </div>
        </div>
      }
    >
      {step === 1 && (
        <FormStack>
          <FormGrid cols={2}>
            <Field label="Full name" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Ramesh Kumar" autoFocus />
            </Field>
            <Field label="Role" required>
              <Select value={role} onChange={(e) => setRole(e.target.value as SignatoryRole)}>
                {(Object.entries(ROLE_LABEL) as [SignatoryRole, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Designation" required>
              <TextInput value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Vice Principal" />
            </Field>
            <Field label="Department">
              <TextInput value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Administration" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.edu" />
            </Field>
            <Field label="Phone">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </Field>
          </FormGrid>
        </FormStack>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
            <div className={`size-10 rounded-full font-bold flex items-center justify-center text-sm ${ROLE_AVATAR_COLOR[role]}`}>
              {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-muted-foreground">{designation}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Signature image <span className="text-muted-foreground font-normal text-xs">(optional — can be added later)</span></p>
            {sigUrl ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-white p-3 flex items-center justify-center min-h-[80px]">
                  <img src={sigUrl} alt="Signature preview" className="max-h-16 max-w-full object-contain" />
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1 px-2.5 h-7 rounded border border-border bg-surface hover:bg-surface-hover text-xs font-medium cursor-pointer">
                    <Upload className="size-3" /> Replace
                    <input type="file" accept="image/*,image/svg+xml" className="hidden" onChange={handleFile} />
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => setSigUrl(null)}>
                    <X className="size-3" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/10 hover:bg-primary/5 transition-colors cursor-pointer">
                <Upload className="size-6 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">Click to upload signature image</span>
                <span className="text-[10px] text-muted-foreground/60">PNG, JPG, or SVG · white or transparent background</span>
                <input type="file" accept="image/*,image/svg+xml" className="hidden" onChange={handleFile} />
              </label>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-[10px] text-blue-600">
            <Info className="size-3 mt-0.5 shrink-0" />
            Template assignments can be configured after adding the signatory from the detail view.
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type RoleFilter = SignatoryRole | "all";

export function DocSignaturesView() {
  const [rows, setRows] = useState<Signatory[]>(SIGNATORIES_V2);
  const [selected, setSelected] = useState<Signatory | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [addOpen, setAddOpen] = useState(false);

  const patch = (id: string, p: Partial<Signatory>) => {
    setRows((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, ...p } : null));
    }
  };

  const setDefault = (id: string) => {
    setRows((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
    if (selected) setSelected((prev) => (prev ? { ...prev, isDefault: prev.id === id } : null));
  };

  const addSignatory = (sig: Signatory) => setRows((prev) => [...prev, sig]);

  const kpis = {
    total: rows.length,
    active: rows.filter((s) => s.status === "active").length,
    withSig: rows.filter((s) => s.signatureImageUrl !== null).length,
    defaultSigner: rows.find((s) => s.isDefault)?.name ?? "—",
    totalTemplates: rows.reduce((a, s) => a + s.assignedTemplates.length, 0),
  };

  const filtered = rows.filter((s) => {
    if (roleFilter !== "all" && s.role !== roleFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  if (selected) {
    const live = rows.find((r) => r.id === selected.id) ?? selected;
    return (
      <SignatoryDetail
        signatory={live}
        onBack={() => setSelected(null)}
        onPatch={patch}
      />
    );
  }

  return (
    <PageStack>
      {/* KPIs */}
      <KpiGrid cols={5}>
        <Kpi label="Total signatories" value={String(kpis.total)} tone="neutral" />
        <Kpi label="Active" value={String(kpis.active)} tone="up" />
        <Kpi label="With signature image" value={String(kpis.withSig)} tone="neutral" />
        <Kpi label="Default signer" value={kpis.defaultSigner} tone="neutral" />
        <Kpi label="Template assignments" value={String(kpis.totalTemplates)} tone="neutral" />
      </KpiGrid>

      <Card>
        <PageToolbar>
          <SegmentedControl
            value={roleFilter}
            onChange={(v) => setRoleFilter(v as RoleFilter)}
            options={[
              { label: "All roles", value: "all" },
              { label: "Principal", value: "principal" },
              { label: "Vice Principal", value: "vice_principal" },
              { label: "Coordinator", value: "coordinator" },
              { label: "Admissions", value: "admissions_officer" },
              { label: "Custom", value: "custom" },
            ]}
          />
          <SegmentedControl
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
          />
          <ToolbarMeta>
            {filtered.length} signator{filtered.length !== 1 ? "ies" : "y"}
          </ToolbarMeta>
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> Add signatory
          </Button>
        </PageToolbar>

        {/* Grid */}
        <div className="p-4">
          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center">
                <PenLine className="size-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No signatories found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Adjust your filters or add a new signatory below.</p>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" /> Add signatory
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((sig) => (
                <SignatoryCard
                  key={sig.id}
                  sig={sig}
                  onSelect={() => setSelected(sig)}
                  onToggle={() => patch(sig.id, { status: sig.status === "active" ? "inactive" : "active" })}
                  onSetDefault={() => setDefault(sig.id)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <AddSignatoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addSignatory}
      />
    </PageStack>
  );
}
