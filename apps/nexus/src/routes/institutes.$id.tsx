import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InstituteLogo } from "@/components/institutes/InstituteDirectoryCard";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  KpiGrid,
  Pill,
} from "@lumenx/ui-admin";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Layers,
  Mail,
  MapPin,
  Phone,
  Power,
  RotateCcw,
  ShieldOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InstituteBillingPanel } from "@/components/billing/InstituteBillingPanel";
import { InstituteSubscriptionPricingPanel } from "@/components/billing/InstituteSubscriptionPricingPanel";
import { InstituteSubscriptionPricingApiPanel } from "@/components/billing/InstituteSubscriptionPricingApiPanel";
import { InstituteInvoiceIssueApiPanel } from "@/components/billing/InstituteInvoiceIssueApiPanel";
import { NexusSubscriptionBillingHistoryPanel } from "@/components/billing/NexusSubscriptionBillingHistoryPanel";
import { NexusSubscriptionBillingHistoryApiPanel } from "@/components/billing/NexusSubscriptionBillingHistoryApiPanel";
import { isNexusApiMode } from "@/lib/auth-mode";
import { loadInstitutesDirectory } from "@/lib/institutes/load-directory";
import {
  activateInstitute,
  archiveInstitute,
  formatCount,
  fullAddress,
  getPlatformInstitute,
  labelRenewal,
  labelRisk,
  labelStatus,
  labelUsage,
  locationLabel,
  renewalTone,
  restoreInstitute,
  riskTone,
  statusTone,
  subscribeInstituteDirectory,
  suspendInstitute,
  usageTone,
  type PlatformInstitute,
} from "@/lib/institute-directory-store";
import {
  adminModulesForUi,
  getLicense,
  resolveInstituteModules,
  subscribeLicenses,
  type NexusModuleGroup,
} from "@/lib/institute-licensing-store";
import { colorForModule, moduleAccentStyle } from "@/lib/nexus-module-colors";
import {
  billingPaymentTone,
  getInstituteBillingView,
  labelBillingPaymentStatus,
  subscribeInstituteBilling,
} from "@/lib/institute-billing-store";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  getInstituteSubscription,
  labelSubscriptionLifecycle,
  subscribeSubscriptions,
} from "@lumenx/utils";

export const Route = createFileRoute("/institutes/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} — Institutes — LumenX Nexus` }],
  }),
  component: InstituteDetailPage,
});

function monthsBetween(startIso: string, end = new Date()): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 0;
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

function formatSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric", day: "numeric" });
}

function InstituteDetailPage() {
  const { id } = Route.useParams();
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [apiInstitute, setApiInstitute] = useState<PlatformInstitute | null | undefined>(
    undefined,
  );
  const apiMode = isNexusApiMode();

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    const a = subscribeInstituteDirectory(refresh);
    const b = subscribeLicenses(refresh);
    const c = subscribeInstituteBilling(refresh);
    const d = subscribeSubscriptions(refresh);
    return () => {
      a();
      b();
      c();
      d();
    };
  }, [id]);

  useEffect(() => {
    if (!apiMode) {
      setApiInstitute(undefined);
      return;
    }
    let cancelled = false;
    void loadInstitutesDirectory().then((dir) => {
      if (cancelled) return;
      if (dir.status === "ready") {
        setApiInstitute(dir.institutes.find((row) => row.id === id) ?? null);
        return;
      }
      setApiInstitute(null);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, id, tick]);

  void tick;
  const inst = apiMode
    ? apiInstitute === undefined
      ? undefined
      : (apiInstitute ?? undefined)
    : getPlatformInstitute(id);
  const adminCatalog = useMemo(() => adminModulesForUi(), []);
  const groups = useMemo(
    () => Array.from(new Set(adminCatalog.map((m) => m.group))) as NexusModuleGroup[],
    [adminCatalog],
  );

  if (apiMode && apiInstitute === undefined) {
    return (
      <AppShell title="Institute" subtitle={id}>
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading institute…</Card>
      </AppShell>
    );
  }

  if (!inst) {
    return (
      <AppShell title="Institute not found" subtitle={id}>
        <Card className="p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">This institute is not in the platform directory.</p>
          <Link to="/institutes">
            <Button>Back to Institutes</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  const license = getLicense(id);
  const modules = resolveInstituteModules(id);
  const billingView = getInstituteBillingView(id);
  const subscription = getInstituteSubscription(id);
  const rateLabel = subscription
    ? `₹${subscription.assignedRateInr}/student`
    : `₹${DEFAULT_PER_STUDENT_RATE_INR}/student`;
  const lifecycleLabel = subscription
    ? labelSubscriptionLifecycle(subscription.lifecycleStatus)
    : "No subscription";

  const onboardingStart = inst.createdAt || license.startAt;
  const billingStart = billingView.config.billingStartAt || license.startAt || inst.billingStartAt;
  const monthsLive = monthsBetween(onboardingStart);
  const monthsBilled = monthsBetween(billingStart);

  const enabledCount = adminCatalog.filter((m) => modules[m.id]).length;
  const disabledCount = adminCatalog.length - enabledCount;
  const connect = license.connect ?? {
    teachers: { enabled: true, modules: {} },
    parents: { enabled: true, modules: {} },
    students: { enabled: true, modules: {} },
  };
  const apps = license.apps ?? {
    careers: { enabled: true },
    admissions: { enabled: true },
    transport: { enabled: true },
  };
  const connectOn = (["teachers", "parents", "students"] as const).filter(
    (p) => connect[p]?.enabled !== false,
  ).length;
  const appsOn = (["careers", "admissions", "transport"] as const).filter(
    (a) => apps[a]?.enabled !== false,
  ).length;

  const archived = inst.status === "archived";

  const run = (action: () => PlatformInstitute | undefined, message: string) => {
    const next = action();
    if (next) {
      setTick((t) => t + 1);
      setFlash(message);
      window.setTimeout(() => setFlash(null), 2500);
    }
  };

  return (
    <AppShell
      title={inst.name}
      subtitle={`${locationLabel(inst)} · full platform record`}
      actions={
        <Link to="/institutes">
          <Button>
            <ArrowLeft className="size-3.5" /> All institutes
          </Button>
        </Link>
      }
    >
      {flash && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {flash}
        </div>
      )}

      {/* Status strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <InstituteLogo mark={inst.logoMark} hue={inst.logoHue} src={inst.logoUrl} name={inst.name} size="sm" />
        <Pill tone={statusTone(inst.status)}>{labelStatus(inst.status)}</Pill>
        <Pill tone="info">{rateLabel}</Pill>
        <Pill tone="info">{lifecycleLabel}</Pill>
        <Pill tone={billingPaymentTone(billingView.paymentStatus)}>
          {labelBillingPaymentStatus(billingView.paymentStatus)}
        </Pill>
        <Pill tone={renewalTone(inst.renewalStatus)}>Renewal · {labelRenewal(inst.renewalStatus)}</Pill>
        <Pill tone={riskTone(inst.riskStatus)}>Risk · {labelRisk(inst.riskStatus)}</Pill>
      </div>

      {/* 1. Subscription pricing (SoT) — Nexus assigns rate; Admin cannot edit */}
      {isNexusApiMode() ? (
        <InstituteSubscriptionPricingApiPanel
          instituteId={id}
          instituteName={inst.name}
        />
      ) : (
        <InstituteSubscriptionPricingPanel instituteId={id} />
      )}

      {isNexusApiMode() ? (
        <InstituteInvoiceIssueApiPanel
          instituteId={id}
          instituteName={inst.name}
        />
      ) : null}

      {isNexusApiMode() ? (
        <NexusSubscriptionBillingHistoryApiPanel instituteId={id} />
      ) : (
        <NexusSubscriptionBillingHistoryPanel instituteId={id} />
      )}

      {/* 2. Invoices / renewals (legacy demo tooling — not plan tiers) */}
      {!isNexusApiMode() ? <InstituteBillingPanel instituteId={id} /> : null}

      {/* 3. Tenure on platform */}
      <Card className="mb-4">
        <CardHeader
          title="Time on LumenX"
          hint="How long this institute has been on the platform"
          action={<CalendarDays className="size-4 text-muted-foreground" />}
        />
        <div className="px-5 pb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DetailCell label="Onboarded" value={formatSince(onboardingStart)} />
          <DetailCell
            label="Months on platform"
            value={monthsLive === 0 ? "Less than 1 month" : `${monthsLive} month${monthsLive === 1 ? "" : "s"}`}
          />
          <DetailCell label="Billing since" value={formatSince(billingStart)} />
          <DetailCell
            label="Months billed"
            value={monthsBilled === 0 ? "Less than 1 month" : `${monthsBilled} month${monthsBilled === 1 ? "" : "s"}`}
          />
        </div>
      </Card>

      {/* 4. Lifecycle operations */}
      {apiMode ? (
        <Card className="mb-4">
          <CardHeader
            title="Lifecycle"
            hint="Status from live institute record"
            action={<Pill tone={statusTone(inst.status)}>{labelStatus(inst.status)}</Pill>}
          />
          <div className="px-5 pb-5 text-xs text-muted-foreground">
            Demo activate/suspend/archive controls are disabled in API mode. Manage status via
            registrations and identity APIs.
          </div>
        </Card>
      ) : (
      <Card className="mb-4">
        <CardHeader
          title="Lifecycle operations"
          hint="Activate · Suspend · Archive · Restore"
          action={<Pill tone={statusTone(inst.status)}>{labelStatus(inst.status)}</Pill>}
        />
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Activate</strong> brings trial/suspended institutes online.{" "}
            <strong className="text-foreground">Deactivate / Suspend</strong> pauses platform access.{" "}
            <strong className="text-foreground">Archive</strong> hides from normal ops.{" "}
            <strong className="text-foreground">Restore</strong> returns an archived institute.
          </p>
          <div className="flex flex-wrap gap-2">
            {!archived && inst.status !== "active" && (
              <Button
                variant="primary"
                onClick={() => run(() => activateInstitute(id), "Institute activated")}
              >
                <Power className="size-3.5" /> Activate
              </Button>
            )}
            {!archived && inst.status === "active" && (
              <Button disabled variant="primary">
                <Power className="size-3.5" /> Already active
              </Button>
            )}
            {!archived && inst.status !== "suspended" && (
              <Button onClick={() => run(() => suspendInstitute(id), "Institute deactivated (suspended)")}>
                <ShieldOff className="size-3.5" /> Deactivate / Suspend
              </Button>
            )}
            {!archived && inst.status === "suspended" && (
              <Button disabled>
                <ShieldOff className="size-3.5" /> Already deactivated
              </Button>
            )}
            {!archived && (
              <Button
                variant="danger"
                onClick={() => run(() => archiveInstitute(id), "Institute archived")}
              >
                <Archive className="size-3.5" /> Archive
              </Button>
            )}
            {archived && (
              <Button
                variant="primary"
                onClick={() => run(() => restoreInstitute(id), "Institute restored")}
              >
                <RotateCcw className="size-3.5" /> Restore
                {inst.statusBeforeArchive
                  ? ` → ${labelStatus(inst.statusBeforeArchive)}`
                  : ""}
              </Button>
            )}
          </div>
          {archived && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Archived. Restore returns status to{" "}
              <span className="font-medium text-foreground">
                {inst.statusBeforeArchive ? labelStatus(inst.statusBeforeArchive) : "Trial"}
              </span>
              .
            </div>
          )}
        </div>
      </Card>
      )}

      {/* 5. Modules — every module, simple On/Off */}
      <Card className="mb-4">
        <CardHeader
          title="Modules"
          hint={`${enabledCount} Admin on · ${disabledCount} off · Connect ${connectOn}/3 · Apps ${appsOn}/3`}
          action={
            <Link to="/modules">
              <Button>
                <Layers className="size-3.5" /> Manage modules
              </Button>
            </Link>
          }
        />
        <div className="px-5 pb-5 space-y-5">
          {groups.map((group) => {
            const mods = adminCatalog.filter((m) => m.group === group);
            return (
              <div key={group}>
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                  {group}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {mods.map((m) => {
                    const on = modules[m.id] === true;
                    const accent = colorForModule(m.id);
                    const well = moduleAccentStyle(accent, on);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-md border px-3 py-2.5 bg-background/50"
                        style={on ? { borderColor: accent.border } : undefined}
                      >
                        <div
                          className="size-8 rounded-md border flex items-center justify-center shrink-0 text-[10px] font-mono font-semibold"
                          style={well}
                          aria-hidden
                        >
                          {m.label.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{m.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {m.description}
                          </div>
                        </div>
                        <Pill tone={on ? "success" : "neutral"}>{on ? "On" : "Off"}</Pill>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 6. Institute profile */}
      <Card className="mb-4">
        <CardHeader title="Institute profile" hint="Identity & contact · no person-level records" />
        <div className="px-5 pb-5 flex flex-col lg:flex-row gap-6">
          <InstituteLogo mark={inst.logoMark} hue={inst.logoHue} src={inst.logoUrl} name={inst.name} size="lg" />
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{inst.name}</h2>
              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="size-3.5 mt-0.5 shrink-0" />
                <span>{fullAddress(inst)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <DetailCell label="Institute ID" value={inst.id} mono />
              <DetailCell label="Board" value={inst.board} />
              <DetailCell label="Type" value={inst.instituteType} />
              <DetailCell label="Established" value={String(inst.establishedYear)} />
              <DetailCell label="City / State" value={`${inst.city}, ${inst.state}`} />
              <DetailCell label="Country" value={inst.country} />
              <a
                href={`mailto:${inst.contactEmail}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-surface-hover"
              >
                <Mail className="size-3.5 text-muted-foreground" />
                <span className="truncate">{inst.contactEmail}</span>
              </a>
              <a
                href={`tel:${inst.contactPhone.replace(/\s+/g, "")}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-surface-hover"
              >
                <Phone className="size-3.5 text-muted-foreground" />
                <span>{inst.contactPhone}</span>
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* 7. Usage aggregates */}
      <KpiGrid cols={5} className="mb-4">
        <Kpi label="Students" value={formatCount(inst.studentCount)} />
        <Kpi label="Faculty" value={formatCount(inst.facultyCount)} />
        <Kpi label="Parents" value={formatCount(inst.parentCount)} />
        <Kpi label="Admins" value={formatCount(inst.adminCount)} />
        <Kpi
          label="Active usage"
          value={`${inst.activeUsagePct}%`}
          delta={labelUsage(inst.usageStatus)}
          tone={inst.usageStatus === "healthy" ? "up" : inst.usageStatus === "inactive" ? "down" : "neutral"}
        />
      </KpiGrid>
      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone={usageTone(inst.usageStatus)}>Usage · {labelUsage(inst.usageStatus)}</Pill>
        <Pill tone={riskTone(inst.riskStatus)}>Risk · {labelRisk(inst.riskStatus)}</Pill>
        <Pill tone={billingPaymentTone(billingView.paymentStatus)}>
          Billing · {labelBillingPaymentStatus(billingView.paymentStatus)}
        </Pill>
      </div>

      <p className="text-[11px] text-muted-foreground font-mono">
        Privacy: no student, parent, or teacher names; no attendance, marks, or private academic records
        in Nexus.
      </p>
    </AppShell>
  );
}

function DetailCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono leading-none">
        {label}
      </div>
      <div
        className={`mt-1.5 text-xs font-medium leading-snug break-words ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}
