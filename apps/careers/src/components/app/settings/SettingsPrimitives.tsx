import type { LucideIcon } from "lucide-react";
import { ChevronDown, HelpCircle, MessageSquarePlus } from "lucide-react";
import { cn } from "@lumenx/ui";

/** Centered, readable settings column for mobile → desktop. */
export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 mx-auto w-full max-w-3xl space-y-4 md:space-y-5 pb-2 animate-in-up">
      {children}
    </div>
  );
}

export function SettingsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 md:p-6 transition-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <SettingsCard>
      <div className="mb-4 flex min-w-0 items-start gap-2.5">
        {Icon && (
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="min-w-0 divide-y divide-border/80">{children}</div>
    </SettingsCard>
  );
}

export function SettingsRow({
  label,
  desc,
  right,
  icon: Icon,
}: {
  label: string;
  desc?: string;
  right: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="settings-row flex min-w-0 items-center gap-3 py-3.5 first:pt-0 last:pb-0 sm:py-4">
      {Icon && (
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/50 text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-sm font-medium leading-snug break-words">{label}</div>
        {desc && (
          <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed break-words">
            {desc}
          </div>
        )}
      </div>
      <div className="shrink-0 touch-manipulation">{right}</div>
    </div>
  );
}

export function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="settings-field-label">{label}</label>
      {children}
    </div>
  );
}

export function SettingsSupportPanel({
  open,
  onToggle,
  portalName,
  version,
  supportEmail,
  supportPhone,
  onFaq,
  onHelp,
  onContact,
  onFeedback,
  onIssue,
}: {
  open: boolean;
  onToggle: () => void;
  portalName: string;
  version: string;
  supportEmail: string;
  supportPhone?: string;
  onFaq: () => void;
  onHelp: () => void;
  onContact: () => void;
  onFeedback: () => void;
  onIssue: () => void;
}) {
  return (
    <SettingsCard className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="settings-support-toggle hover:bg-muted/20"
      >
        <span className="inline-flex items-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="size-4" aria-hidden />
          </span>
          Support & help
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-border px-2 pb-4 pt-1 sm:px-3 animate-in-up">
          <SettingsSupportLink label="FAQs" onClick={onFaq} />
          <SettingsSupportLink label="Help center" onClick={onHelp} />
          <SettingsSupportLink label="Contact support" onClick={onContact} />
          <SettingsSupportLink
            label="LumenX Feedback"
            icon={MessageSquarePlus}
            onClick={onFeedback}
          />
          <SettingsSupportLink label="Report an issue" onClick={onIssue} />
          <div className="settings-meta-panel space-y-0.5">
            <p className="font-medium text-foreground/80">{portalName}</p>
            <p>Version {version}</p>
            <p>Email: {supportEmail}</p>
            {supportPhone && <p>Phone: {supportPhone}</p>}
            <p className="pt-1">© LumenX Education Platform</p>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

function SettingsSupportLink({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon?: typeof HelpCircle;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="settings-support-link">
      {Icon ? <Icon className="size-4 shrink-0 text-primary" aria-hidden /> : null}
      {label}
    </button>
  );
}
