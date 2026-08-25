import { Link } from "@tanstack/react-router";
import { Pill } from "@lumenx/ui-admin";
import {
  formatCount,
  labelPayment,
  labelRenewal,
  labelRisk,
  labelStatus,
  labelUsage,
  locationLabel,
  paymentTone,
  renewalTone,
  riskTone,
  statusTone,
  usageTone,
  type PlatformInstitute,
} from "@/lib/institute-directory-store";
import {
  getBillingConfig,
  labelBillingPlanSummary,
} from "@/lib/institute-billing-store";
import { Users, GraduationCap, Heart, KeyRound } from "lucide-react";

export function InstituteLogo({
  mark,
  hue,
  src,
  size = "md",
  name,
}: {
  mark: string;
  hue: number;
  /** Uploaded / monogram image. Prefer over letter mark when set. */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  name?: string;
}) {
  const dim =
    size === "lg" ? "size-16 text-lg" : size === "sm" ? "size-9 text-[10px]" : "size-12 text-xs";
  const label = name ? `${name} logo` : "Institute logo";

  if (src) {
    return (
      <div
        className={`${dim} shrink-0 rounded-lg ring-1 ring-border overflow-hidden bg-muted/40`}
        aria-hidden={!name}
      >
        <img src={src} alt={label} className="size-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${dim} shrink-0 rounded-lg ring-1 ring-border flex items-center justify-center font-semibold tracking-wide text-primary-foreground`}
      style={{
        background: `linear-gradient(135deg, oklch(0.55 0.14 ${hue}), oklch(0.42 0.12 ${hue + 40}))`,
      }}
      aria-hidden
    >
      {mark}
    </div>
  );
}

export function InstituteDirectoryCard({ institute }: { institute: PlatformInstitute }) {
  const i = institute;
  const billing = getBillingConfig(i.id);
  return (
    <Link
      to="/institutes/$id"
      params={{ id: i.id }}
      className="block group h-full"
    >
      <div className="h-full flex flex-col rounded-xl border border-border bg-surface shadow-elevated p-4 sm:p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-border-strong group-hover:shadow-pop">
        <div className="flex items-start gap-3">
          <InstituteLogo
            mark={i.logoMark}
            hue={i.logoHue}
            src={i.logoUrl}
            name={i.name}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="text-sm font-semibold tracking-tight truncate">{i.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {locationLabel(i)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={statusTone(i.status)}>{labelStatus(i.status)}</Pill>
              <Pill tone="info">{labelBillingPlanSummary(billing)}</Pill>
              <Pill tone={paymentTone(i.paymentStatus)}>{labelPayment(i.paymentStatus)}</Pill>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <MetaRow label="Renewal" value={labelRenewal(i.renewalStatus)} tone={renewalTone(i.renewalStatus)} />
          <MetaRow label="Usage" value={labelUsage(i.usageStatus)} tone={usageTone(i.usageStatus)} />
          <MetaRow label="Risk" value={labelRisk(i.riskStatus)} tone={riskTone(i.riskStatus)} />
          <MetaRow label="Active" value={`${i.activeUsagePct}%`} />
        </div>

        <div className="mt-auto pt-4 border-t border-border grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1.5">
          <CountChip icon={Users} label="Students" value={formatCount(i.studentCount)} />
          <CountChip icon={GraduationCap} label="Faculty" value={formatCount(i.facultyCount)} />
          <CountChip icon={Heart} label="Parents" value={formatCount(i.parentCount)} />
          <CountChip icon={KeyRound} label="Admins" value={formatCount(i.adminCount)} />
        </div>
      </div>
    </Link>
  );
}

function MetaRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-2.5 py-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="mt-1.5 min-w-0">
        {tone ? (
          <Pill tone={tone}>{value}</Pill>
        ) : (
          <span className="text-xs font-medium truncate block">{value}</span>
        )}
      </div>
    </div>
  );
}

function CountChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/80 bg-background/30 px-2 py-1.5 min-w-0">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-xs font-semibold font-mono tabular-nums">{value}</div>
    </div>
  );
}
