import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Pill,
  Field,
  Select,
  SegmentedControl,
} from "@lumenx/ui-admin";
import {
  Users,
  GraduationCap,
  Heart,
  Building2,
  CalendarRange,
  ClipboardCheck,
  FileText,
  MessageSquareWarning,
  Bell,
  Megaphone,
  CalendarDays,
  Siren,
  ShieldCheck,
  HardDrive,
  BarChart3,
  Bus,
  IndianRupee,
  Briefcase,
  School,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { isNexusApiMode } from "@/lib/auth-mode";
import { ModulesLicensesApiPanel } from "@/components/modules/ModulesLicensesApiPanel";
import {
  syncDirectoryFromLicense,
  listPlatformInstitutes,
  subscribeInstituteDirectory,
} from "@/lib/institute-directory-store";
import {
  CONNECT_PORTAL_CATALOG,
  PLATFORM_APP_CATALOG,
  adminModulesForUi,
  defaultLicense,
  disableModule,
  enableModule,
  getLicense,
  loadLicenses,
  setConnectPortalEnabled,
  setConnectPortalModuleEnabled,
  setPlatformAppEnabled,
  subscribeLicenses,
  type ConnectPortalId,
  type InstituteLicense,
  type PlatformAppId,
} from "@/lib/institute-licensing-store";
import { setAdminBoundNexusInstituteId } from "@lumenx/config";
import { colorForModule, moduleAccentStyle } from "@/lib/nexus-module-colors";

export const Route = createFileRoute("/modules")({
  head: () => ({ meta: [{ title: "Module entitlements — LumenX Nexus" }] }),
  component: ModulesPage,
});

function ModulesPage() {
  if (isNexusApiMode()) {
    const institutes = listPlatformInstitutes()
      .filter((i) => i.status !== "archived")
      .map((i) => ({ id: i.id, name: i.name }));
    return (
      <AppShell
        title="Module entitlements"
        subtitle="Plan + admin module grants · live licenses API"
      >
        <ModulesLicensesApiPanel institutes={institutes} />
      </AppShell>
    );
  }
  return <ModulesDemoPage />;
}

type SurfaceTab = "admin" | "connect" | "careers" | "admissions" | "transport";

const iconMap: Record<string, typeof Users> = {
  students: Users,
  teachers: GraduationCap,
  parents: Heart,
  classes: Building2,
  attendance: ClipboardCheck,
  "student-attendance": ClipboardCheck,
  timetable: CalendarRange,
  exams: FileText,
  marks: FileText,
  complaints: MessageSquareWarning,
  notifications: Bell,
  announcements: Megaphone,
  events: CalendarDays,
  alerts: Siren,
  analytics: BarChart3,
  storage: HardDrive,
  transport: Bus,
  fees: IndianRupee,
  permissions: ShieldCheck,
  careers: Briefcase,
  admissions: School,
};

function mirrorDirectory(license: InstituteLicense) {
  syncDirectoryFromLicense({
    instituteId: license.instituteId,
    plan: license.plan,
    billingCadence: license.cadence,
    amountInr: license.amountInr,
    paidAmountInr: license.paidAmountInr,
    billingStartAt: license.startAt,
    modules: license.modules,
  });
}

function ModulesDemoPage() {
  const [tick, setTick] = useState(0);
  const [surface, setSurface] = useState<SurfaceTab>("admin");
  const [connectPortal, setConnectPortal] = useState<ConnectPortalId>("teachers");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const a = subscribeLicenses(() => setTick((t) => t + 1));
    const b = subscribeInstituteDirectory(() => setTick((t) => t + 1));
    return () => {
      a();
      b();
    };
  }, []);

  const institutes = useMemo(
    () =>
      listPlatformInstitutes()
        .filter((i) => i.status !== "archived")
        .map((i) => ({
          id: i.id,
          name: i.name,
          city: i.city,
          studentCount: i.studentCount,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tick],
  );

  const [instituteId, setInstituteId] = useState(() => institutes[0]?.id ?? "ins-delhi-riverside");

  useEffect(() => {
    if (!institutes.some((i) => i.id === instituteId) && institutes[0]) {
      setInstituteId(institutes[0].id);
    }
  }, [institutes, instituteId]);

  useEffect(() => {
    setAdminBoundNexusInstituteId(instituteId);
  }, [instituteId]);

  void tick;
  const draft = loadLicenses()[instituteId] ?? defaultLicense(instituteId);
  const license = getLicense(instituteId);
  const institute = institutes.find((i) => i.id === instituteId) ?? {
    id: instituteId,
    name: instituteId,
    city: "—",
    studentCount: 0,
  };

  const adminCatalog = useMemo(() => adminModulesForUi(), []);
  const adminGroups = useMemo(
    () => Array.from(new Set(adminCatalog.map((m) => m.group))),
    [adminCatalog],
  );
  const adminOn = adminCatalog.filter((m) => draft.modules[m.id]).length;

  const refresh = (message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 2800);
    setTick((t) => t + 1);
  };

  const selectInstitute = (id: string) => {
    setInstituteId(id);
    setFlash(null);
  };

  const toggleAdminModule = (moduleId: string) => {
    const on = Boolean(draft.modules[moduleId]);
    const lic = on ? disableModule(instituteId, moduleId) : enableModule(instituteId, moduleId);
    if (!lic) return;
    mirrorDirectory(lic);
    refresh(on ? `Disabled ${moduleId}` : `Enabled ${moduleId}`);
  };

  const togglePortal = (portalId: ConnectPortalId, enabled: boolean) => {
    const lic = setConnectPortalEnabled(instituteId, portalId, enabled);
    mirrorDirectory(lic);
    refresh(
      enabled
        ? `${CONNECT_PORTAL_CATALOG.find((p) => p.id === portalId)!.label} portal on`
        : `${CONNECT_PORTAL_CATALOG.find((p) => p.id === portalId)!.label} portal off`,
    );
  };

  const togglePortalModule = (portalId: ConnectPortalId, moduleId: string) => {
    const on = Boolean(draft.connect[portalId].modules[moduleId]);
    const lic = setConnectPortalModuleEnabled(instituteId, portalId, moduleId, !on);
    if (!lic) return;
    mirrorDirectory(lic);
    refresh(on ? `Disabled ${moduleId}` : `Enabled ${moduleId}`);
  };

  const toggleApp = (appId: PlatformAppId, enabled: boolean) => {
    const lic = setPlatformAppEnabled(instituteId, appId, enabled);
    mirrorDirectory(lic);
    const label = PLATFORM_APP_CATALOG.find((a) => a.id === appId)!.label;
    refresh(enabled ? `${label} app on` : `${label} app off`);
  };

  return (
    <AppShell
      title="Module entitlements"
      subtitle="Admin · Connect portals · Careers / Admissions / Transport apps"
    >
      {flash && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {flash}
        </div>
      )}

      <Card className="mb-4">
        <div className="px-4 sm:px-5 py-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field label="Institute" required className="min-w-0 flex-1 sm:min-w-[220px]">
            <Select value={instituteId} onChange={(e) => selectInstitute(e.target.value)}>
              {institutes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 text-[11px] space-y-1 min-w-0 sm:min-w-[180px]">
            <div className="truncate">
              <span className="text-muted-foreground">City · </span>
              {institute.city}
            </div>
            <div>
              <span className="text-muted-foreground">Students · </span>
              {institute.studentCount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <SegmentedControl
          value={surface}
          onChange={(v) => setSurface(v as SurfaceTab)}
          options={[
            { value: "admin", label: "Admin" },
            { value: "connect", label: "Connect" },
            { value: "careers", label: "Careers" },
            { value: "admissions", label: "Admissions" },
            { value: "transport", label: "Transport" },
          ]}
        />
      </div>

      {surface === "admin" && (
        <>
          <Card className="mb-4">
            <CardHeader
              title="Admin"
              hint={`${adminOn} modules on · institute ops app · Careers / Admissions / Transport are under their own tabs`}
              action={<Layers className="size-4 text-muted-foreground" />}
            />
            <div className="px-5 pb-4 text-[11px] text-muted-foreground">
              Turn modules on or off for this institute’s Admin app. Disabling hides nav; data stays.
            </div>
          </Card>

          {adminGroups.map((g) => (
            <Card key={g} className="mb-4">
              <CardHeader
                title={g}
                hint={`${adminCatalog.filter((m) => m.group === g).length} modules`}
              />
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {adminCatalog
                  .filter((m) => m.group === g)
                  .map((m) => {
                    const Icon = iconMap[m.id] ?? Users;
                    const on = Boolean(draft.modules[m.id]);
                    const accent = colorForModule(m.id);
                    const well = moduleAccentStyle(accent, on);
                    return (
                      <FeatureTile
                        key={m.id}
                        label={m.label}
                        description={m.description}
                        on={on}
                        icon={<Icon className="size-4" />}
                        wellStyle={well}
                        borderColor={on ? accent.border : undefined}
                        onToggle={() => toggleAdminModule(m.id)}
                      />
                    );
                  })}
              </div>
            </Card>
          ))}
        </>
      )}

      {surface === "connect" && (
        <>
          <Card className="mb-4">
            <CardHeader
              title="Connect"
              hint="Teachers · Parents · Students — portal on/off plus module on/off"
            />
            <div className="px-5 pb-4">
              <SegmentedControl
                value={connectPortal}
                onChange={(v) => setConnectPortal(v as ConnectPortalId)}
                options={CONNECT_PORTAL_CATALOG.map((p) => ({
                  value: p.id,
                  label: p.label,
                }))}
              />
            </div>
          </Card>

          {CONNECT_PORTAL_CATALOG.filter((p) => p.id === connectPortal).map((portal) => {
            const ent = license.connect[portal.id];
            const moduleOn = Object.values(ent.modules).filter(Boolean).length;
            return (
              <Card key={portal.id} className="mb-4">
                <CardHeader
                  title={`${portal.label} portal`}
                  hint={portal.description}
                  action={
                    <div className="flex items-center gap-3">
                      <Pill tone={ent.enabled ? "success" : "danger"}>
                        {ent.enabled ? "Portal on" : "Portal off"}
                      </Pill>
                      <Toggle
                        on={ent.enabled}
                        onChange={() => togglePortal(portal.id, !ent.enabled)}
                      />
                    </div>
                  }
                />
                <div className="px-5 pb-3 text-[11px] text-muted-foreground">
                  {ent.enabled
                    ? `${moduleOn}/${portal.features.length} modules granted · turning the portal off hides the whole ${portal.label.toLowerCase()} experience`
                    : `Portal is off — module toggles below are preserved but Connect will not show this portal`}
                </div>
                <div
                  className={`px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${
                    !ent.enabled ? "opacity-60" : ""
                  }`}
                >
                  {portal.features.map((f) => {
                    const on = Boolean(ent.modules[f.id]);
                    const locked = f.toggleable === false;
                    return (
                      <FeatureTile
                        key={f.id}
                        label={f.label}
                        description={
                          locked ? `${f.description} · always on with portal` : f.description
                        }
                        on={on}
                        locked={locked}
                        onToggle={
                          locked ? undefined : () => togglePortalModule(portal.id, f.id)
                        }
                      />
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </>
      )}

      {(surface === "careers" || surface === "admissions" || surface === "transport") && (
        <AppEntitlementPanel
          appId={surface}
          enabled={license.apps[surface].enabled}
          onToggle={(enabled) => toggleApp(surface, enabled)}
        />
      )}

      <p className="mt-2 text-[11px] text-muted-foreground font-mono">
        Admin modules gate Admin nav. Connect portal/module flags are stored per institute. Careers,
        Admissions, and Transport are whole-app switches — feature lists are for visibility only.
        Disabling never deletes data.
      </p>
    </AppShell>
  );
}

function AppEntitlementPanel({
  appId,
  enabled,
  onToggle,
}: {
  appId: PlatformAppId;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const app = PLATFORM_APP_CATALOG.find((a) => a.id === appId)!;
  const Icon =
    appId === "careers" ? Briefcase : appId === "admissions" ? School : Bus;

  return (
    <Card className="mb-4">
      <CardHeader
        title={app.label}
        hint={app.description}
        action={
          <div className="flex items-center gap-3">
            <Pill tone={enabled ? "success" : "danger"}>
              {enabled ? "App on" : "App off"}
            </Pill>
            <Toggle on={enabled} onChange={() => onToggle(!enabled)} />
          </div>
        }
      />
      <div className="px-5 pb-3 flex items-start gap-3">
        <div className="size-10 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          This surface is controlled as a <span className="text-foreground font-medium">whole app</span>
          . Features below are listed so you can see what’s included — they are not toggled
          individually. Turning the app off disables the entire {app.label.toLowerCase()} experience
          for this institute (Admin mirror module stays in sync).
        </div>
      </div>
      <div className={`px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${!enabled ? "opacity-60" : ""}`}>
        {app.features.map((f) => (
          <div
            key={f.id}
            className="rounded-lg border border-border bg-background/40 px-3 py-3"
          >
            <div className="text-xs font-semibold flex items-center gap-2">
              {f.label}
              <Pill tone="neutral">Included</Pill>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">{f.description}</div>
            <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Follows app · {enabled ? "available" : "hidden with app"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeatureTile({
  label,
  description,
  on,
  icon,
  wellStyle,
  borderColor,
  locked,
  onToggle,
}: {
  label: string;
  description: string;
  on: boolean;
  icon?: ReactNode;
  wellStyle?: CSSProperties;
  borderColor?: string;
  locked?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      className={`p-3.5 sm:p-4 rounded-lg border transition-all min-w-0 flex flex-col gap-3 ${
        on ? "bg-background/60" : "border-border bg-background/40"
      }`}
      style={borderColor ? { borderColor } : undefined}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <div
            className="size-9 rounded-md flex items-center justify-center border shrink-0"
            style={wellStyle}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-semibold leading-snug break-words">{label}</div>
          <div className="flex flex-wrap gap-1.5">
            {!on && <Pill tone="neutral">Off</Pill>}
            {on && <Pill tone="success">On</Pill>}
            {locked && <Pill tone="info">Always</Pill>}
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">{description}</div>
        </div>
      </div>
      {onToggle ? (
        <div className="mt-auto pt-1 flex items-center justify-between gap-3 border-t border-border/60">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {on ? "Granted" : "Hidden"}
          </span>
          <Toggle on={on} onChange={onToggle} disabled={locked} />
        </div>
      ) : null}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

