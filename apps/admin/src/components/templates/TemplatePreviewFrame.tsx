import type { PreviewDevice, TemplateBlock, TemplateRecord } from "@/lib/template-management/types";
import { getPreviewSizeConfig } from "@/lib/template-management/preview-sizes";
import { applyTemplateVariables, sampleVariableMap } from "@/lib/template-management/variable-resolve";
import { defaultVisualFields } from "@/lib/template-management/visual-themes";
import { VisualCertificateRenderer } from "@/components/templates/VisualCertificateRenderer";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { Monitor, Tablet, Smartphone, Printer } from "lucide-react";

function BlockPreview({
  block,
  variables,
  logoUrl,
  logoLabel,
  principalName,
  compact = false,
}: {
  block: TemplateBlock;
  variables: Record<string, string>;
  logoUrl?: string;
  logoLabel: string;
  principalName: string;
  compact?: boolean;
}) {
  const titleCls = compact
    ? "text-[9px] font-bold tracking-wide uppercase"
    : "text-sm font-bold tracking-wide uppercase";
  const bodyCls = compact ? "text-[8px] leading-snug" : "text-xs leading-relaxed";
  const logoCls = compact ? "size-9 rounded-md text-[8px]" : "size-14 rounded-xl text-xs";
  const photoCls = compact ? "size-10 rounded-md text-[8px]" : "size-16 rounded-lg text-[10px]";

  switch (block.type) {
    case "header":
      return (
        <div
          className={`text-center text-foreground border-b border-border pb-1.5 mb-2 ${titleCls}`}
        >
          {applyTemplateVariables(block.content ?? block.label, variables)}
        </div>
      );
    case "logo":
      return (
        <div className={`flex justify-center ${compact ? "mb-1.5" : "mb-3"}`}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={logoLabel}
              className={`${logoCls} object-cover border border-primary/25`}
            />
          ) : (
            <div
              className={`${logoCls} bg-primary/15 border border-primary/25 flex items-center justify-center font-semibold text-primary text-center px-1`}
            >
              {logoLabel.slice(0, 12)}
            </div>
          )}
        </div>
      );
    case "text":
      return (
        <p className={`${bodyCls} text-muted-foreground mb-2 text-center`}>
          {applyTemplateVariables(block.content ?? "", variables)}
        </p>
      );
    case "variable":
      return (
        <p
          className={`${compact ? "text-[7px]" : "text-[10px]"} font-mono text-primary mb-1 text-center`}
        >
          {applyTemplateVariables(`{{${block.variable ?? "Variable"}}}`, variables)}
        </p>
      );
    case "table":
      return (
        <div className="mb-3 rounded-md border border-border overflow-hidden text-[10px]">
          <div className="grid grid-cols-3 bg-muted/50 font-medium">
            <div className="px-2 py-1 border-r border-border">Subject</div>
            <div className="px-2 py-1 border-r border-border">Marks</div>
            <div className="px-2 py-1">Grade</div>
          </div>
          <div className="grid grid-cols-3 border-t border-border">
            <div className="px-2 py-1 border-r border-border">Mathematics</div>
            <div className="px-2 py-1 border-r border-border">92</div>
            <div className="px-2 py-1">A1</div>
          </div>
        </div>
      );
    case "signature":
      return (
        <div className="mt-4 pt-3 border-t border-dashed border-border text-center">
          <div className="text-[10px] text-muted-foreground italic mb-1">Principal signature</div>
          <div className="text-xs font-medium">
            {variables.PrincipalName ?? principalName}
          </div>
        </div>
      );
    case "qr":
      return (
        <div className={`flex justify-center ${compact ? "mt-1" : "mt-3"}`}>
          <div
            className={`${compact ? "size-8 text-[7px]" : "size-12 text-[8px]"} rounded bg-foreground/10 border border-border grid place-items-center text-muted-foreground`}
          >
            QR
          </div>
        </div>
      );
    case "barcode":
      return (
        <div className="flex justify-center mt-2">
          <div className="h-8 w-24 bg-[repeating-linear-gradient(90deg,#000_0_2px,transparent_2px_4px)] opacity-40 rounded-sm" />
        </div>
      );
    case "seal":
      return (
        <div className="flex justify-center my-2">
          <div className="size-10 rounded-full border-2 border-primary/40 text-[8px] flex items-center justify-center text-primary font-bold text-center px-1">
            {logoLabel.slice(0, 8)}
          </div>
        </div>
      );
    case "watermark":
      return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <span className="text-4xl font-bold rotate-[-24deg]">
            {variables.InstituteName?.slice(0, 12) ?? "OFFICIAL"}
          </span>
        </div>
      );
    case "image":
      return (
        <div className={`flex justify-center ${compact ? "mb-1" : "mb-2"}`}>
          <div
            className={`${photoCls} bg-muted border border-border text-muted-foreground flex items-center justify-center`}
          >
            Photo
          </div>
        </div>
      );
    default:
      return (
        <div className="text-[10px] text-muted-foreground mb-2 px-2 py-1 rounded bg-muted/40 border border-border">
          {block.label}
        </div>
      );
  }
}

export function TemplatePreviewFrame({
  template,
  device = "desktop",
  showDeviceToggle = false,
  onDeviceChange,
  variableOverrides,
}: {
  template: Pick<
    TemplateRecord,
    "blocks" | "previewAspect" | "name" | "layoutMode" | "visualTheme" | "visualFields"
  >;
  device?: PreviewDevice;
  showDeviceToggle?: boolean;
  onDeviceChange?: (d: PreviewDevice) => void;
  variableOverrides?: Record<string, string>;
}) {
  const { instituteProfile } = useDemoProfile();
  const size = getPreviewSizeConfig(template.previewAspect, device);

  const variables: Record<string, string> = {
    ...sampleVariableMap(instituteProfile.name, instituteProfile.principal),
    ...(variableOverrides ?? {}),
  };

  const logoUrl = template.visualFields?.logoOverrideUrl || instituteProfile.profilePhoto || undefined;
  const logoLabel = instituteProfile.logo || instituteProfile.name.slice(0, 2).toUpperCase();

  const isVisual = template.layoutMode === "visual" && template.visualTheme;
  const visualFields =
    template.visualFields ??
    defaultVisualFields(template.visualTheme ?? "achievement_elegant", instituteProfile.name, instituteProfile.principal);

  const devices: { id: PreviewDevice; icon: typeof Monitor; label: string }[] = [
    { id: "desktop", icon: Monitor, label: "Desktop" },
    { id: "tablet", icon: Tablet, label: "Tablet" },
    { id: "mobile", icon: Smartphone, label: "Mobile" },
    { id: "print", icon: Printer, label: "Print" },
  ];

  return (
    <div className="space-y-3">
      {showDeviceToggle && onDeviceChange && (
        <div className="flex flex-wrap gap-1">
          {devices.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onDeviceChange(id)}
              className={`inline-flex items-center gap-1 px-2 h-7 rounded text-[10px] font-medium transition-colors ${
                device === id
                  ? "bg-surface border border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
        </div>
      )}
      <div
        className={`mx-auto transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${size.frameClass}`}
      >
        <div
          className={`relative ${size.aspectClass} rounded-lg border-2 border-border bg-surface shadow-elevated overflow-hidden ${
            template.previewAspect === "id_card" ? "rounded-[3mm]" : ""
          }`}
        >
          {isVisual ? (
            <VisualCertificateRenderer
              theme={template.visualTheme!}
              fields={visualFields}
              variables={variables}
              instituteLogoUrl={logoUrl}
              instituteLogoLabel={logoLabel}
              compact={size.compact}
            />
          ) : (
            <div
              className={`absolute inset-0 overflow-y-auto ${size.compact ? "p-2" : "p-4 sm:p-6"}`}
            >
              {template.blocks.map((block) => (
                <BlockPreview
                  key={block.id}
                  block={block}
                  variables={variables}
                  logoUrl={logoUrl}
                  logoLabel={logoLabel}
                  principalName={instituteProfile.principal}
                  compact={size.compact}
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">{template.name}</p>
        <p className="text-center text-[10px] font-medium text-foreground/80 mt-0.5">
          {size.label}
        </p>
        <p className="text-center text-[9px] text-muted-foreground">{size.deviceNote}</p>
      </div>
    </div>
  );
}
