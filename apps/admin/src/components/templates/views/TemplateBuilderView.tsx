import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Field,
  TextInput,
  TextArea,
  Select,
  FormStack,
  FormGrid,
  Modal,
} from "@lumenx/ui-admin";
import type {
  TemplateBlock,
  TemplateBlockType,
  TemplateRecord,
  VisualTemplateFields,
  VisualThemeId,
} from "@/lib/template-management/types";
import { previewAspectForKind } from "@/lib/template-management/preview-sizes";
import { getTemplateById, saveCustomTemplate } from "@/lib/template-management/store";
import { TEMPLATE_CATEGORY_GROUPS, TEMPLATE_VARIABLES } from "@/lib/template-management/categories";
import {
  defaultVisualFields,
  themeForCategory,
  VISUAL_THEMES,
} from "@/lib/template-management/visual-themes";
import { TemplatePreviewFrame } from "@/components/templates/TemplatePreviewFrame";
import { useAdminToast } from "@/components/AdminActionToast";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  ArrowLeft,
  Save,
  Braces,
  FileText,
  ImageIcon,
  Layers,
  PenLine,
  Upload,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Printer,
  Circle,
  Hash,
  CalendarClock,
  ChevronRight,
  Copy,
  CheckCircle2,
  Trash2,
  Plus,
  Info,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EditorTab = "content" | "elements" | "variables";
type PreviewDevice = "desktop" | "tablet" | "mobile" | "print";

function newBlock(type: TemplateBlockType): TemplateBlock {
  return {
    id: `blk-${Date.now().toString(36)}`,
    type,
    label: type,
    content: type === "text" ? "Enter text here…" : undefined,
    variable: type === "variable" ? "StudentName" : undefined,
  };
}

function newDraft(instituteName: string, principal: string): TemplateRecord {
  const theme: VisualThemeId = "achievement_elegant";
  return {
    id: `tpl-custom-${Date.now().toString(36)}`,
    name: "Untitled template",
    kind: "certificate",
    categoryId: "academic_excellence",
    source: "custom",
    status: "draft",
    tags: [],
    favorite: false,
    usageCount: 0,
    version: 1,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    description: "",
    blocks: [],
    previewAspect: "a4",
    layoutMode: "visual",
    visualTheme: theme,
    visualFields: defaultVisualFields(theme, instituteName, principal),
  };
}

function copyFromTemplate(source: TemplateRecord, instituteName: string, principal: string): TemplateRecord {
  const isSystem = source.source === "system" || source.source === "imported";
  const theme = source.visualTheme ?? themeForCategory(source.categoryId);
  return {
    ...source,
    id: isSystem ? `tpl-custom-${Date.now().toString(36)}` : source.id,
    name: isSystem ? `${source.name} (custom)` : source.name,
    source: "custom",
    status: "draft",
    layoutMode: source.layoutMode ?? "visual",
    visualTheme: theme,
    visualFields: source.visualFields ?? defaultVisualFields(theme, instituteName, principal),
    blocks: source.blocks.map((b) => ({ ...b, id: `${b.id}-e${Date.now()}` })),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

// ─── Variable picker ──────────────────────────────────────────────────────────

function VariablesTab({ onInsert }: { onInsert: (token: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard?.writeText(`{{${key}}}`).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Click a variable to insert it into the body text, or copy to use anywhere.
      </p>
      <div className="space-y-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <div
            key={v.key}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-surface-hover/60 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold font-mono text-primary truncate">{`{{${v.key}}}`}</p>
              <p className="text-[10px] text-muted-foreground">{v.label} · e.g. {v.sample}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onInsert(`{{${v.key}}}`)}
                title="Insert into body text"
                className="size-7 rounded flex items-center justify-center hover:bg-surface border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => handleCopy(v.key)}
                title="Copy to clipboard"
                className="size-7 rounded flex items-center justify-center hover:bg-surface border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === v.key ? (
                  <CheckCircle2 className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-muted/10 p-3 text-[10px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground/80">Tips</p>
        <p>• Wrap variable keys in double braces: <code className="bg-muted px-1 rounded font-mono text-primary">{"{{StudentName}}"}</code></p>
        <p>• Variables fill in automatically when you issue documents.</p>
        <p>• Unresolved variables show as the variable key in preview.</p>
      </div>
    </div>
  );
}

// ─── Content tab ──────────────────────────────────────────────────────────────

function ContentTab({
  fields,
  onChange,
}: {
  fields: VisualTemplateFields;
  onChange: (f: VisualTemplateFields) => void;
}) {
  const patch = (p: Partial<VisualTemplateFields>) => onChange({ ...fields, ...p });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (token: string) => {
    const ta = bodyRef.current;
    if (!ta) {
      patch({ bodyText: `${fields.bodyText} ${token}`.trim() });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = fields.bodyText.slice(0, start) + token + fields.bodyText.slice(end);
    patch({ bodyText: next });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <FormStack>
      <Field label="Main title">
        <TextInput
          value={fields.titleMain}
          onChange={(e) => patch({ titleMain: e.target.value })}
          placeholder="CERTIFICATE"
        />
      </Field>

      <Field label="Subtitle">
        <TextInput
          value={fields.titleSub}
          onChange={(e) => patch({ titleSub: e.target.value })}
          placeholder="OF ACHIEVEMENT"
        />
      </Field>

      <Field label="Presentation line" hint="Shown above the recipient name">
        <TextInput
          value={fields.presentationLine}
          onChange={(e) => patch({ presentationLine: e.target.value })}
          placeholder="This certificate is presented to:"
        />
      </Field>

      <Field label="Body text" hint="Supports {{variables}}">
        <div className="relative">
          <textarea
            ref={bodyRef}
            rows={6}
            value={fields.bodyText}
            onChange={(e) => patch({ bodyText: e.target.value })}
            className="w-full min-h-[6rem] px-3 py-2 rounded-md bg-background border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors resize-y font-mono text-xs leading-relaxed"
            placeholder="Enter body text. Use {{StudentName}}, {{Class}}, etc."
          />
        </div>
      </Field>

      {/* Inline quick-insert variables */}
      <div className="rounded-lg border border-border bg-background p-2">
        <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Braces className="size-3 text-primary" /> Insert variable at cursor
        </p>
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(`{{${v.key}}}`)}
              title={`Sample: ${v.sample}`}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
            >
              {v.key}
            </button>
          ))}
        </div>
      </div>
    </FormStack>
  );
}

// ─── Elements tab ─────────────────────────────────────────────────────────────

function ElementsTab({
  fields,
  onChange,
  instituteLogoUrl,
  instituteLogoLabel,
}: {
  fields: VisualTemplateFields;
  onChange: (f: VisualTemplateFields) => void;
  instituteLogoUrl: string;
  instituteLogoLabel: string;
}) {
  const patch = (p: Partial<VisualTemplateFields>) => onChange({ ...fields, ...p });

  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ logoOverrideUrl: String(reader.result) });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ studentPhotoUrl: String(reader.result) });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const displayLogo = fields.logoOverrideUrl || instituteLogoUrl;

  return (
    <div className="space-y-4">
      {/* Logo */}
      <section className="rounded-lg border border-border bg-background p-3 space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <ImageIcon className="size-3.5 text-primary" /> Logo
        </h4>
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-lg border border-border bg-surface overflow-hidden flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {displayLogo ? (
              <img src={displayLogo} alt="Logo" className="size-full object-contain p-1" />
            ) : (
              <span>{instituteLogoLabel.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {fields.logoOverrideUrl ? (
              <>
                <p className="text-[10px] text-muted-foreground">Using custom logo for this template.</p>
                <div className="flex gap-1.5 flex-wrap">
                  <label className="inline-flex items-center gap-1 px-2 h-6 rounded border border-border bg-surface hover:bg-surface-hover text-[10px] font-medium cursor-pointer">
                    <Upload className="size-2.5" /> Replace
                    <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={() => patch({ logoOverrideUrl: undefined })}
                    className="inline-flex items-center gap-1 px-2 h-6 rounded border border-border bg-surface hover:bg-surface-hover text-[10px] font-medium text-muted-foreground"
                  >
                    <Trash2 className="size-2.5" /> Remove override
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground">
                  {instituteLogoUrl ? "Using institute logo from profile." : "No institute logo set."}
                </p>
                <label className="inline-flex items-center gap-1 px-2.5 h-7 rounded border border-border bg-surface hover:bg-surface-hover text-xs font-medium cursor-pointer">
                  <Upload className="size-3" /> Upload custom logo
                  <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
                </label>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Student / recipient photo */}
      <section className="rounded-lg border border-border bg-background p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-primary" /> Recipient photo
          </h4>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <div
              onClick={() => patch({ showStudentPhoto: !fields.showStudentPhoto })}
              className={`relative w-9 h-5 rounded-full transition-colors ${fields.showStudentPhoto ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${fields.showStudentPhoto ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </div>
            {fields.showStudentPhoto ? "On" : "Off"}
          </label>
        </div>
        {fields.showStudentPhoto && (
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {fields.studentPhotoUrl ? (
                <img src={fields.studentPhotoUrl} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <label className="inline-flex items-center gap-1 px-2.5 h-7 rounded border border-border bg-surface hover:bg-surface-hover text-xs font-medium cursor-pointer">
                <Upload className="size-3" /> Upload sample photo
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />
              </label>
              {fields.studentPhotoUrl && (
                <button
                  type="button"
                  onClick={() => patch({ studentPhotoUrl: "" })}
                  className="block text-[10px] text-destructive hover:underline"
                >
                  Remove sample photo
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">Preview only — real photos load at issue time.</p>
            </div>
          </div>
        )}
      </section>

      {/* Signature blocks */}
      <section className="rounded-lg border border-border bg-background p-3 space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <PenLine className="size-3.5 text-primary" /> Signature blocks
        </h4>
        <FormGrid cols={2}>
          <Field label="Left name">
            <TextInput
              fieldSize="compact"
              value={fields.signatoryLeftName}
              onChange={(e) => patch({ signatoryLeftName: e.target.value })}
              placeholder="Principal name"
            />
          </Field>
          <Field label="Left title">
            <TextInput
              fieldSize="compact"
              value={fields.signatoryLeftTitle}
              onChange={(e) => patch({ signatoryLeftTitle: e.target.value })}
              placeholder="PRINCIPAL"
            />
          </Field>
          <Field label="Right name">
            <TextInput
              fieldSize="compact"
              value={fields.signatoryRightName}
              onChange={(e) => patch({ signatoryRightName: e.target.value })}
              placeholder="Name or role"
            />
          </Field>
          <Field label="Right title">
            <TextInput
              fieldSize="compact"
              value={fields.signatoryRightTitle}
              onChange={(e) => patch({ signatoryRightTitle: e.target.value })}
              placeholder="CLASS TEACHER"
            />
          </Field>
        </FormGrid>
        <p className="text-[10px] text-muted-foreground">Leave blank to hide a signature slot.</p>
      </section>

      {/* Document number */}
      <section className="rounded-lg border border-border bg-background p-3 space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Hash className="size-3.5 text-primary" /> Document number
        </h4>
        <Field label="Number prefix">
          <TextInput
            fieldSize="compact"
            value={fields.documentNumberPrefix ?? ""}
            onChange={(e) => patch({ documentNumberPrefix: e.target.value })}
            placeholder="e.g. LXA/CERT/2026/"
          />
        </Field>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Each issued document gets a sequential number. The prefix combines with an auto-incremented counter (e.g. <code className="bg-muted px-1 rounded font-mono">LXA/CERT/2026/0042</code>).
        </p>
      </section>

      {/* Validity */}
      <section className="rounded-lg border border-border bg-background p-3 space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <CalendarClock className="size-3.5 text-primary" /> Validity period
        </h4>
        <Field label="Expires after">
          <Select
            fieldSize="compact"
            value={String(fields.validityDays ?? 0)}
            onChange={(e) => patch({ validityDays: Number(e.target.value) })}
          >
            <option value="0">No expiry</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days (3 months)</option>
            <option value="180">180 days (6 months)</option>
            <option value="365">1 year</option>
          </Select>
        </Field>
        {(fields.validityDays ?? 0) > 0 && (
          <p className="text-[10px] text-muted-foreground">
            An expiry date will be printed: {fields.validityDays} days after issue date using <code className="bg-muted px-1 rounded font-mono text-primary">{"{{IssueDate}}"}</code>.
          </p>
        )}
      </section>
    </div>
  );
}

// ─── Save As New dialog ───────────────────────────────────────────────────────

function SaveAsDialog({
  defaultName,
  onSave,
  onClose,
}: {
  defaultName: string;
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName.replace(/\s*\(custom\)$/, " (copy)"));
  const [desc, setDesc] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title="Save as new template"
      subtitle="This creates a new custom template. Originals are never modified."
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(name.trim() || defaultName, desc)} disabled={!name.trim()}>
            <Save className="size-3.5" /> Save template
          </Button>
        </div>
      }
    >
      <FormStack>
        <Field label="Template name" required>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name…"
            autoFocus
          />
        </Field>
        <Field label="Description">
          <TextArea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional short description…"
          />
        </Field>
      </FormStack>
    </Modal>
  );
}

// ─── Right settings panel ─────────────────────────────────────────────────────

function SettingsPanel({
  draft,
  setDraft,
  isVisual,
  isSystem,
}: {
  draft: TemplateRecord;
  setDraft: React.Dispatch<React.SetStateAction<TemplateRecord>>;
  isVisual: boolean;
  isSystem: boolean;
}) {
  const { instituteProfile } = useDemoProfile();

  const setVisualTheme = (theme: VisualThemeId) => {
    setDraft((d) => ({
      ...d,
      layoutMode: "visual",
      visualTheme: theme,
      visualFields: defaultVisualFields(theme, instituteProfile.name, instituteProfile.principal),
      previewAspect: theme === "student_id_blue" || theme === "teacher_id_professional" ? "id_card" : "a4",
    }));
  };

  const filteredThemes = isVisual
    ? VISUAL_THEMES.filter((t) => t.forKinds.includes(draft.kind as "certificate" | "report" | "id_card" | "document"))
    : VISUAL_THEMES;

  return (
    <div className="space-y-4 text-sm">
      {isSystem && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-600/80">
          <Info className="size-3 shrink-0 mt-0.5" />
          Editing a copy — the original will never be modified.
        </div>
      )}

      <FormStack>
        <Field label="Template name" required>
          <TextInput
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>

        <Field label="Template type">
          <Select
            value={draft.kind}
            onChange={(e) => {
              const kind = e.target.value as TemplateRecord["kind"];
              setDraft((d) => ({
                ...d,
                kind,
                previewAspect: previewAspectForKind(kind),
              }));
            }}
          >
            <option value="certificate">Certificate</option>
            <option value="report">Report</option>
            <option value="id_card">ID card</option>
            <option value="document">Document</option>
          </Select>
        </Field>

        <Field label="Category">
          <Select
            value={draft.categoryId}
            onChange={(e) => {
              const categoryId = e.target.value;
              const theme = themeForCategory(categoryId);
              setDraft((d) => ({
                ...d,
                categoryId,
                visualTheme: isVisual ? theme : d.visualTheme,
                visualFields: isVisual
                  ? defaultVisualFields(theme, instituteProfile.name, instituteProfile.principal)
                  : d.visualFields,
              }));
            }}
          >
            {TEMPLATE_CATEGORY_GROUPS.flatMap((g) =>
              g.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {g.label} — {i.label}
                </option>
              )),
            )}
          </Select>
        </Field>

        {isVisual && (
          <Field label="Design theme">
            <Select
              value={draft.visualTheme}
              onChange={(e) => setVisualTheme(e.target.value as VisualThemeId)}
            >
              {filteredThemes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Description">
          <TextArea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Short description shown in the library…"
          />
        </Field>

        <Field label="Tags" hint="comma separated">
          <TextInput
            value={draft.tags.join(", ")}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
              }))
            }
            placeholder="e.g. official, bonafide"
          />
        </Field>
      </FormStack>
    </div>
  );
}

// ─── Preview panel ────────────────────────────────────────────────────────────

const DEVICES: { id: PreviewDevice; icon: typeof Monitor; label: string }[] = [
  { id: "desktop", icon: Monitor, label: "Desktop" },
  { id: "tablet", icon: Tablet, label: "Tablet" },
  { id: "mobile", icon: Smartphone, label: "Mobile" },
  { id: "print", icon: Printer, label: "Print" },
];

function PreviewPanel({ draft }: { draft: TemplateRecord }) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  return (
    <div className="flex flex-col h-full">
      {/* Device selector */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border bg-background/50">
        <Eye className="size-3.5 text-muted-foreground mr-1" />
        <span className="text-xs text-muted-foreground mr-2">Preview</span>
        {DEVICES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setDevice(id)}
            title={label}
            className={`inline-flex items-center gap-1 px-2.5 h-7 rounded text-[11px] font-medium transition-colors ${
              device === id
                ? "bg-surface border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto p-4 bg-[repeating-linear-gradient(45deg,transparent,transparent_16px,rgba(0,0,0,0.015)_16px,rgba(0,0,0,0.015)_17px)]">
        <TemplatePreviewFrame
          template={draft}
          device={device}
        />
      </div>
    </div>
  );
}

// ─── Blocks editor (for non-visual templates) ─────────────────────────────────

const BLOCK_TYPE_LIST: { type: TemplateBlockType; label: string; icon: typeof FileText }[] = [
  { type: "header", label: "Header", icon: FileText },
  { type: "text", label: "Text", icon: FileText },
  { type: "logo", label: "Logo", icon: ImageIcon },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "signature", label: "Signature", icon: PenLine },
  { type: "variable", label: "Variable", icon: Braces },
  { type: "qr", label: "QR code", icon: Circle },
  { type: "seal", label: "Seal", icon: Circle },
  { type: "table", label: "Table", icon: Layers },
  { type: "watermark", label: "Watermark", icon: Layers },
];

function BlocksTab({
  draft,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
}: {
  draft: TemplateRecord;
  onAddBlock: (type: TemplateBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, patch: Partial<TemplateBlock>) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedBlock = draft.blocks.find((b) => b.id === selected) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {BLOCK_TYPE_LIST.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => { onAddBlock(type); }}
            className="inline-flex items-center gap-1 px-2 h-7 rounded border border-border bg-surface hover:bg-surface-hover text-[11px] font-medium transition-colors"
          >
            <Plus className="size-2.5" /> {label}
          </button>
        ))}
      </div>

      {draft.blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No blocks yet. Add one above.</p>
      ) : (
        <div className="space-y-1">
          {draft.blocks.map((b, i) => (
            <div key={b.id}>
              <button
                type="button"
                onClick={() => setSelected(selected === b.id ? null : b.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                  selected === b.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-surface-hover text-foreground border border-transparent"
                }`}
              >
                <span className="w-5 text-[10px] text-muted-foreground text-right">{i + 1}</span>
                <span className="flex-1 text-left truncate">{b.label}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{b.type}</span>
                <ChevronRight className={`size-3 text-muted-foreground transition-transform ${selected === b.id ? "rotate-90" : ""}`} />
              </button>
              {selected === b.id && (
                <div className="mx-2 mb-1 p-3 rounded-b-md border border-t-0 border-primary/20 bg-primary/5 space-y-2">
                  {(b.type === "text" || b.type === "header" || b.type === "footer") && (
                    <Field label="Content">
                      <TextArea
                        rows={3}
                        value={b.content ?? ""}
                        onChange={(e) => onUpdateBlock(b.id, { content: e.target.value })}
                      />
                    </Field>
                  )}
                  {b.type === "variable" && (
                    <Field label="Variable key">
                      <Select
                        value={b.variable ?? ""}
                        onChange={(e) => onUpdateBlock(b.id, { variable: e.target.value })}
                      >
                        {TEMPLATE_VARIABLES.map((v) => (
                          <option key={v.key} value={v.key}>{v.label}</option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <Field label="Label">
                    <TextInput
                      value={b.label}
                      onChange={(e) => onUpdateBlock(b.id, { label: e.target.value })}
                    />
                  </Field>
                  <Button size="sm" variant="danger" onClick={() => { onRemoveBlock(b.id); setSelected(null); }}>
                    <Trash2 className="size-3" /> Remove block
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

type BuilderProps = { initialTemplateId?: string };

export function TemplateBuilderView({ initialTemplateId }: BuilderProps) {
  const notify = useAdminToast();
  const { instituteProfile } = useDemoProfile();
  const [draft, setDraft] = useState<TemplateRecord>(() =>
    newDraft(instituteProfile.name, instituteProfile.principal),
  );
  const [savedId] = useState(() => draft.id);
  const [isDirty, setIsDirty] = useState(false);
  const [tab, setTab] = useState<EditorTab>("content");
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [sourceTemplateName, setSourceTemplateName] = useState<string | null>(null);

  // Load from template id
  useEffect(() => {
    if (!initialTemplateId) return;
    const source = getTemplateById(initialTemplateId);
    if (!source) return;
    setSourceTemplateName(source.name);
    setDraft(copyFromTemplate(source, instituteProfile.name, instituteProfile.principal));
    setIsDirty(false);
  }, [initialTemplateId, instituteProfile.name, instituteProfile.principal]);

  // Mark dirty on every draft change (skip initial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setIsDirty(true);
  }, [draft]);

  const isVisual = draft.layoutMode === "visual" && !!draft.visualTheme;
  const isOriginalSystem = initialTemplateId
    ? (getTemplateById(initialTemplateId)?.source === "system" || getTemplateById(initialTemplateId)?.source === "imported")
    : false;

  const handleSaveAs = (name: string, description: string) => {
    const saved = saveCustomTemplate({
      ...draft,
      id: `tpl-custom-${Date.now().toString(36)}`,
      name,
      description: description || draft.description,
      source: "custom",
      status: "active",
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setIsDirty(false);
    setSaveAsOpen(false);
    notify(`Saved "${name}" to your template library`);
    return saved;
  };

  const handleQuickSave = () => {
    if (draft.source === "custom") {
      saveCustomTemplate({
        ...draft,
        status: "active",
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setIsDirty(false);
      notify(`Saved "${draft.name}"`);
    } else {
      setSaveAsOpen(true);
    }
  };

  const patchVisual = (p: Partial<VisualTemplateFields>) => {
    if (!draft.visualFields) return;
    setDraft((d) => ({ ...d, visualFields: { ...d.visualFields!, ...p } }));
  };

  const addBlock = (type: TemplateBlockType) => {
    const block = newBlock(type);
    setDraft((d) => ({ ...d, blocks: [...d.blocks, block], layoutMode: "blocks" }));
  };

  const removeBlock = (id: string) => {
    setDraft((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
  };

  const updateBlock = (id: string, patch: Partial<TemplateBlock>) => {
    setDraft((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  };

  // Tab labels
  const TABS: { id: EditorTab; label: string; icon: typeof FileText }[] = [
    { id: "content", label: "Content", icon: FileText },
    { id: "elements", label: "Elements", icon: Layers },
    { id: "variables", label: "Variables", icon: Braces },
  ];

  return (
    <div className="flex flex-col h-full gap-0 -mt-1">
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-background/60 backdrop-blur-sm rounded-t-xl">
        <Link to="/templates" search={{ view: "library" }}>
          <Button size="sm" variant="ghost">
            <ArrowLeft className="size-3.5" /> Library
          </Button>
        </Link>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold truncate max-w-xs">{draft.name}</span>
          {sourceTemplateName && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              based on <em>{sourceTemplateName}</em>
            </span>
          )}
          {isDirty && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium shrink-0">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => setSaveAsOpen(true)}>
            <Copy className="size-3.5" /> Save as new
          </Button>
          <Button size="sm" variant="primary" onClick={handleQuickSave}>
            <Save className="size-3.5" /> {draft.source === "custom" ? "Save" : "Save as new"}
          </Button>
        </div>
      </div>

      {/* ── Three-column editor ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 border-x border-b border-border rounded-b-xl overflow-hidden min-h-0">

        {/* Left — editor tabs */}
        <div className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="flex border-b border-border bg-background/40 shrink-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 lx-sidebar-scroll">
            {tab === "content" && isVisual && draft.visualFields && (
              <ContentTab
                fields={draft.visualFields}
                onChange={(f) => setDraft((d) => ({ ...d, visualFields: f }))}
              />
            )}
            {tab === "content" && !isVisual && (
              <BlocksTab
                draft={draft}
                onAddBlock={addBlock}
                onRemoveBlock={removeBlock}
                onUpdateBlock={updateBlock}
              />
            )}
            {tab === "elements" && isVisual && draft.visualFields && (
              <ElementsTab
                fields={draft.visualFields}
                onChange={(f) => setDraft((d) => ({ ...d, visualFields: f }))}
                instituteLogoUrl={instituteProfile.profilePhoto || ""}
                instituteLogoLabel={instituteProfile.logo || instituteProfile.name.slice(0, 2)}
              />
            )}
            {tab === "elements" && !isVisual && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>Switch to Visual mode to use element controls.</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const theme = themeForCategory(draft.categoryId);
                    setDraft((d) => ({
                      ...d,
                      layoutMode: "visual",
                      visualTheme: theme,
                      visualFields: defaultVisualFields(theme, instituteProfile.name, instituteProfile.principal),
                    }));
                  }}
                >
                  Switch to Visual mode
                </Button>
              </div>
            )}
            {tab === "variables" && (
              <VariablesTab
                onInsert={(token) => {
                  if (draft.visualFields) {
                    patchVisual({ bodyText: `${draft.visualFields.bodyText} ${token}`.trim() });
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Middle — live preview */}
        <div className="lg:col-span-5 xl:col-span-6 border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-0">
          <PreviewPanel draft={draft} />
        </div>

        {/* Right — settings */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-border bg-background/40 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template settings</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lx-sidebar-scroll">
            <SettingsPanel
              draft={draft}
              setDraft={setDraft}
              isVisual={isVisual}
              isSystem={isOriginalSystem}
            />

            {/* Layout mode toggle */}
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Layout mode</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isVisual) {
                      const theme = themeForCategory(draft.categoryId);
                      setDraft((d) => ({
                        ...d,
                        layoutMode: "visual",
                        visualTheme: theme,
                        visualFields: defaultVisualFields(theme, instituteProfile.name, instituteProfile.principal),
                      }));
                    }
                  }}
                  className={`flex-1 py-2 rounded-md border text-xs font-medium transition-colors ${isVisual ? "border-primary bg-primary/5 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-surface-hover"}`}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => !isVisual || setDraft((d) => ({ ...d, layoutMode: "blocks" }))}
                  className={`flex-1 py-2 rounded-md border text-xs font-medium transition-colors ${!isVisual ? "border-primary bg-primary/5 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-surface-hover"}`}
                >
                  Blocks
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {isVisual ? "Visual mode — rich themed design." : "Blocks mode — manual layout."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save As dialog */}
      {saveAsOpen && (
        <SaveAsDialog
          defaultName={draft.name}
          onSave={handleSaveAs}
          onClose={() => setSaveAsOpen(false)}
        />
      )}
    </div>
  );
}
