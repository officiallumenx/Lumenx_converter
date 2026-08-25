import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
  TemplateKind,
  TemplateRecord,
  VisualTemplateFields,
  VisualThemeId,
} from "@/lib/template-management/types";
import { previewAspectForKind } from "@/lib/template-management/preview-sizes";
import { getAllTemplates, getTemplateById, saveCustomTemplate } from "@/lib/template-management/store";
import { TEMPLATE_VARIABLES } from "@/lib/template-management/categories";
import {
  defaultVisualFields,
  themeForCategory,
  VISUAL_THEMES,
} from "@/lib/template-management/visual-themes";
import {
  DESIGN_UPLOAD_ACCEPT,
  DESIGN_UPLOAD_HINT,
  parseDesignUpload,
} from "@/lib/template-management/office-upload";
import { TemplatePreviewFrame } from "@/components/templates/TemplatePreviewFrame";
import { useAdminToast } from "@/components/AdminActionToast";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { ArrowLeft, FileText, Power, Save, Upload, Braces } from "lucide-react";

function newDraft(
  instituteName: string,
  principal: string,
  partial?: Partial<TemplateRecord>,
): TemplateRecord {
  const theme: VisualThemeId = partial?.visualTheme ?? "achievement_elegant";
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
    ...partial,
    source: "custom",
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
    layoutMode: source.layoutMode === "blocks" ? "blocks" : "visual",
    visualTheme: theme,
    visualFields: source.visualFields ?? defaultVisualFields(theme, instituteName, principal),
  };
}

function SaveAsDialog({
  defaultName,
  onSave,
  onClose,
}: {
  defaultName: string;
  onSave: (name: string, description: string, activate: boolean) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName.replace(/\s*\(custom\)$/, " (copy)"));
  const [desc, setDesc] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Save template"
      subtitle="Saved as draft by default. Activate when ready to issue."
      size="sm"
      footer={
        <div className="flex flex-wrap gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(name.trim() || defaultName, desc, false)} disabled={!name.trim()}>
            <Save className="size-3.5" /> Save as draft
          </Button>
          <Button
            variant="primary"
            onClick={() => onSave(name.trim() || defaultName, desc, true)}
            disabled={!name.trim()}
          >
            <Power className="size-3.5" /> Save & activate
          </Button>
        </div>
      }
    >
      <FormStack>
        <Field label="Template name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Description">
          <TextArea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
      </FormStack>
    </Modal>
  );
}

function StartScreen({
  onPickTemplate,
  onUpload,
}: {
  onPickTemplate: (id: string) => void;
  onUpload: (file: { name: string; format: "ppt" | "pptx" }) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const templates = getAllTemplates().filter((t) => t.status !== "archived").slice(0, 12);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const parsed = parseDesignUpload(file);
    if (!parsed) {
      setError(`Upload design: ${DESIGN_UPLOAD_HINT}.`);
      return;
    }
    setError(null);
    onUpload(parsed);
  };

  return (
    <div className="space-y-8 py-6 px-1">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Certificate builder</h1>
        <p className="text-sm text-muted-foreground">
          Use an existing LumenX certificate template or upload your own PowerPoint — then map student fields and save.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            LumenX templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPickTemplate(t.id)}
                className="text-left rounded-xl border border-border bg-surface p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
              >
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                  {t.kind.replace("_", " ")} · {t.source}
                </p>
              </button>
          ))}
        </div>
          <Link to="/templates" search={{ view: "library" }} className="text-xs text-primary hover:underline inline-block">
            Browse full library →
          </Link>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Or upload your own
          </h2>
          <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface p-8 cursor-pointer hover:bg-muted/20 transition-colors">
            <Upload className="size-7 text-muted-foreground" />
            <span className="text-sm font-medium">Upload design</span>
            <span className="text-xs text-muted-foreground text-center">{DESIGN_UPLOAD_HINT}</span>
            <input type="file" accept={DESIGN_UPLOAD_ACCEPT} className="hidden" onChange={onFile} />
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Link to="/templates" search={{ view: "library" }} className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to library
          </Link>
        </section>
      </div>
    </div>
  );
}

type BuilderProps = { initialTemplateId?: string };

export function TemplateBuilderView({ initialTemplateId }: BuilderProps) {
  const notify = useAdminToast();
  const { instituteProfile } = useDemoProfile();
  const [draft, setDraft] = useState<TemplateRecord | null>(null);
  const [mappedKeys, setMappedKeys] = useState<string[]>([]);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [sourceTemplateName, setSourceTemplateName] = useState<string | null>(null);
  const skipDirty = useRef(true);

  useEffect(() => {
    if (!initialTemplateId) {
      setDraft(null);
      setMappedKeys([]);
      setUploadName(null);
      setSourceTemplateName(null);
      return;
    }
    const source = getTemplateById(initialTemplateId);
    if (!source) return;
    skipDirty.current = true;
    setSourceTemplateName(source.name);
    setDraft(copyFromTemplate(source, instituteProfile.name, instituteProfile.principal));
    setMappedKeys(TEMPLATE_VARIABLES.slice(0, 6).map((v) => v.key));
    setUploadName(null);
    setIsDirty(false);
  }, [initialTemplateId, instituteProfile.name, instituteProfile.principal]);

  useEffect(() => {
    if (!draft) return;
    if (skipDirty.current) {
      skipDirty.current = false;
      return;
    }
    setIsDirty(true);
  }, [draft, mappedKeys]);

  const startFromTemplate = (id: string) => {
    const source = getTemplateById(id);
    if (!source) return;
    skipDirty.current = true;
    setSourceTemplateName(source.name);
    setDraft(copyFromTemplate(source, instituteProfile.name, instituteProfile.principal));
    setMappedKeys(["StudentName", "Class", "Section", "AcademicYear", "IssueDate", "InstituteName"]);
    setUploadName(null);
    setIsDirty(false);
  };

  const startFromUpload = (file: { name: string; format: "ppt" | "pptx" }) => {
    skipDirty.current = true;
    const baseName = file.name.replace(/\.pptx?$/i, "") || "Uploaded design";
    setDraft(
      newDraft(instituteProfile.name, instituteProfile.principal, {
        name: baseName,
        description: `Uploaded design: ${file.name}`,
        tags: ["uploaded", file.format],
      }),
    );
    setUploadName(file.name);
    setSourceTemplateName(null);
    setMappedKeys(["StudentName", "Class", "Section"]);
    setIsDirty(false);
  };

  const toggleMap = (key: string) => {
    setMappedKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  };

  const patchFields = (p: Partial<VisualTemplateFields>) => {
    setDraft((d) => (d && d.visualFields ? { ...d, visualFields: { ...d.visualFields, ...p } } : d));
  };

  const handleSaveAs = (name: string, description: string, activate: boolean) => {
    if (!draft) return;
    const saved = saveCustomTemplate({
      ...draft,
      id: `tpl-custom-${Date.now().toString(36)}`,
      name,
      description: description || draft.description,
      source: "custom",
      status: activate ? "active" : "draft",
      tags: [...new Set([...draft.tags, ...mappedKeys.map((k) => `map:${k}`)])],
      updatedAt: new Date().toISOString().slice(0, 10),
      layoutMode: draft.layoutMode === "blocks" ? "blocks" : "visual",
    });
    skipDirty.current = true;
    setDraft(saved);
    setIsDirty(false);
    setSaveAsOpen(false);
    notify(
      activate
        ? `Saved & activated "${name}" — ready to issue`
        : `Saved "${name}" as draft — activate in Library when ready`,
    );
  };

  const handleQuickSave = (activate?: boolean) => {
    if (!draft) return;
    if (draft.source !== "custom") {
      setSaveAsOpen(true);
      return;
    }
    const nextStatus =
      activate === true ? "active" : activate === false ? "draft" : draft.status === "archived" ? "draft" : draft.status;
    const saved = saveCustomTemplate({
      ...draft,
      status: nextStatus,
      tags: [...new Set([...draft.tags.filter((t) => !t.startsWith("map:")), ...mappedKeys.map((k) => `map:${k}`)])],
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    skipDirty.current = true;
    setDraft(saved);
    setIsDirty(false);
    notify(nextStatus === "active" ? `Saved & activated "${draft.name}"` : `Saved "${draft.name}" as draft`);
  };

  if (!draft) {
    return <StartScreen onPickTemplate={startFromTemplate} onUpload={startFromUpload} />;
  }

  const fields = draft.visualFields;
  const isVisual = draft.layoutMode !== "blocks" && !!draft.visualTheme;

  return (
    <div className="flex flex-col h-[calc(100dvh-6.75rem)] min-h-[560px]">
      <div className="flex flex-wrap items-center gap-3 px-3 sm:px-4 py-2.5 border border-border bg-surface/80 backdrop-blur-sm rounded-t-xl shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(null);
            setIsDirty(false);
            setUploadName(null);
            setSourceTemplateName(null);
          }}
        >
          <ArrowLeft className="size-3.5" /> Start over
        </Button>
        <Link to="/templates" search={{ view: "library" }}>
          <Button size="sm" variant="ghost">
            Library
          </Button>
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TextInput
            fieldSize="compact"
            className="max-w-[240px] font-semibold"
            value={draft.name}
            onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
          />
          {sourceTemplateName && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">from {sourceTemplateName}</span>
          )}
          {uploadName && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">· {uploadName}</span>
          )}
          {isDirty && <span className="text-[10px] text-amber-600 font-medium">Unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleQuickSave(false)}>
            <Save className="size-3.5" /> Save draft
          </Button>
          <Button size="sm" variant="primary" onClick={() => handleQuickSave(true)}>
            <Power className="size-3.5" /> Activate
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(320px,1.1fr)] gap-0 border-x border-b border-border rounded-b-xl overflow-hidden min-h-0">
        <div className="border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-[45vh] lg:min-h-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-background/40 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">Setup & mapping</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6 lx-builder-panel-scroll">
            <FormStack>
              <FormGrid cols={2}>
                <Field label="Document type">
                  <Select
                    value={draft.kind}
                    onChange={(e) => {
                      const kind = e.target.value as TemplateKind;
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              kind,
                              previewAspect: previewAspectForKind(kind),
                            }
                          : d,
                      );
                    }}
                  >
                    <option value="certificate">Certificate</option>
                    <option value="report">Report</option>
                    <option value="id_card">ID card</option>
                    <option value="document">Document</option>
                  </Select>
                </Field>
                {isVisual && (
                  <Field label="Design theme">
                    <Select
                      value={draft.visualTheme}
                      onChange={(e) => {
                        const theme = e.target.value as VisualThemeId;
                        setDraft((d) =>
                          d
                            ? {
                      ...d,
                      visualTheme: theme,
                                visualFields:
                                  d.visualFields ??
                                  defaultVisualFields(theme, instituteProfile.name, instituteProfile.principal),
                              }
                            : d,
                        );
                      }}
                    >
                      {VISUAL_THEMES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </FormGrid>
            </FormStack>

            {uploadName && (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex items-start gap-2">
                <FileText className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">Uploaded design</p>
                  <p className="text-[11px] text-muted-foreground truncate">{uploadName}</p>
                </div>
              </div>
            )}

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Braces className="size-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold">Map certificate fields</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Choose which student / institute values fill in when you issue this template.
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((v) => {
                  const on = mappedKeys.includes(v.key);
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => toggleMap(v.key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full text-[11px] font-medium border transition-colors ${
                        on
                          ? "bg-primary/15 border-primary/40 text-foreground"
                          : "bg-surface border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v.label}
                      <span className="font-mono text-[9px] opacity-70">{`{{${v.key}}}`}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">{mappedKeys.length} fields mapped</p>
            </section>

            {isVisual && fields && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold">Wording</h3>
                <Field label="Title">
                  <TextInput
                    fieldSize="compact"
                    value={fields.titleMain}
                    onChange={(e) => patchFields({ titleMain: e.target.value })}
                  />
                </Field>
                <Field label="Subtitle">
                  <TextInput
                    fieldSize="compact"
                    value={fields.titleSub}
                    onChange={(e) => patchFields({ titleSub: e.target.value })}
                  />
                </Field>
                <Field label="Body">
                  <TextArea
                    rows={4}
                    value={fields.bodyText}
                    onChange={(e) => patchFields({ bodyText: e.target.value })}
                  />
                </Field>
              </section>
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-[45vh] lg:min-h-0 overflow-hidden bg-muted/20">
          <div className="px-4 py-2 border-b border-border bg-background/40 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 flex items-start justify-center">
            <div className="w-full max-w-[320px]">
              <TemplatePreviewFrame template={draft} device="print" showCaptions={false} />
            </div>
          </div>
        </div>
      </div>

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
