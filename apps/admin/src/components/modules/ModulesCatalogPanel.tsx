import { useMemo } from "react";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAdminWriteAccess } from "@/components/admin-write/AdminWriteAccessContext";
import {
  MODULE_CATALOG,
  isModuleToggleable,
  saveEnabledModules,
  useEnabledModules,
  type ModuleDef,
} from "@/lib/admin-plan-config";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  NEXUS_OPT_IN_ADMIN_MODULES,
  readNexusModuleEntitlements,
} from "@lumenx/config";
import {
  Users,
  GraduationCap,
  Heart,
  CalendarRange,
  ClipboardCheck,
  MessageSquareWarning,
  Bell,
  Megaphone,
  CalendarDays,
  Siren,
  ShieldCheck,
  HardDrive,
  BarChart3,
  ClipboardList,
  Bus,
  UserCheck,
  UserPlus,
  Briefcase,
  Landmark,
  FileBarChart,
  Award,
  BookOpen,
  LayoutGrid,
  CalendarOff,
  IndianRupee,
  CalendarCheck,
  ClipboardPen,
  Layers,
  Calendar,
  LayoutTemplate,
  LayoutDashboard,
  KeyRound,
  Settings,
  CreditCard,
  Camera,
  School,
  NotebookPen,
  FolderOpen,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  analytics: BarChart3,
  students: Users,
  teachers: GraduationCap,
  photos: Camera,
  parents: Heart,
  accounts: KeyRound,
  classes: LayoutGrid,
  enrollments: UserPlus,
  "academic-management": School,
  subjects: BookOpen,
  "student-attendance": ClipboardCheck,
  attendance: BarChart3,
  "teacher-attendance": CalendarCheck,
  timetable: CalendarRange,
  exams: ClipboardPen,
  marks: ClipboardList,
  "homework-logs": NotebookPen,
  "teacher-diary": BookOpen,
  complaints: MessageSquareWarning,
  notifications: Bell,
  messages: MessageSquare,
  announcements: Megaphone,
  events: CalendarDays,
  alerts: Siren,
  subscription: CreditCard,
  modules: Layers,
  permissions: ShieldCheck,
  storage: HardDrive,
  settings: Settings,
  transport: Bus,
  leave: CalendarOff,
  fees: IndianRupee,
  admissions: UserCheck,
  careers: Briefcase,
  institute: Landmark,
  templates: LayoutTemplate,
  documents: FolderOpen,
  calendar: Calendar,
  reports: FileBarChart,
  "teacher-performance": Award,
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-5 w-10 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ModuleCard({
  mod,
  on,
  locked,
  nexusOff,
  nexusOptIn,
  onToggle,
}: {
  mod: ModuleDef;
  on: boolean;
  locked: boolean;
  nexusOff: boolean;
  nexusOptIn: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[mod.id] ?? Users;
  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        on
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border bg-background/40 opacity-80"
      }`}
    >
      <div className="flex items-center gap-3">
        <IconChip icon={Icon} size="md" variant={on ? "brand" : "soft"} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {mod.label}
            {locked ? <Pill tone="info">Always on</Pill> : null}
            {nexusOptIn ? <Pill tone="warning">Nexus opt-in</Pill> : null}
            {nexusOff ? <Pill tone="neutral">Hidden</Pill> : null}
            {!locked && !nexusOff && !on ? <Pill tone="neutral">Disabled</Pill> : null}
          </div>
          <div className="text-[10px] text-muted-foreground">{mod.description}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {locked
            ? "Required"
            : nexusOff
              ? "Enable in Nexus first"
              : on
                ? "Enabled"
                : "Disabled in Admin"}
        </span>
        {locked || nexusOff ? (
          <span className="text-[10px] text-muted-foreground">—</span>
        ) : (
          <Toggle on={on} onChange={onToggle} />
        )}
      </div>
    </div>
  );
}

/** Full Admin module catalog with enable / disable toggles. */
export function ModulesCatalogPanel() {
  const notify = useAdminToast();
  const { guardWriteAction } = useAdminWriteAccess();
  const enabled = useEnabledModules();
  const apiMode = isApiAuthMode();
  const nexusEntitlements = useMemo(() => {
    if (apiMode) {
      try {
        const raw = localStorage.getItem("lumenx.admin.apiModuleEntitlements.v1");
        if (!raw) return {} as Record<string, boolean>;
        return JSON.parse(raw) as Record<string, boolean>;
      } catch {
        return {} as Record<string, boolean>;
      }
    }
    return readNexusModuleEntitlements();
  }, [apiMode, enabled]);

  const groups = useMemo(
    () => Array.from(new Set(MODULE_CATALOG.map((m) => m.group))),
    [],
  );
  const toggleableModules = MODULE_CATALOG.filter((m) => isModuleToggleable(m));
  const activeCount = toggleableModules.filter((m) => enabled[m.id]).length;
  const disabledCount = toggleableModules.filter((m) => !enabled[m.id]).length;

  const toggle = (id: string) => {
    const mod = MODULE_CATALOG.find((m) => m.id === id);
    if (!mod || !isModuleToggleable(mod)) return;
    const turningOn = !enabled[id];
    if (turningOn) {
      const entitlements = apiMode ? nexusEntitlements : readNexusModuleEntitlements();
      const optIn = (NEXUS_OPT_IN_ADMIN_MODULES as readonly string[]).includes(id);
      const blocked = optIn
        ? entitlements?.[id] !== true
        : entitlements?.[id] === false;
      if (blocked) {
        notify(
          `${mod.label} is disabled by Nexus for this institute. Re-enable it in Nexus to restore access.`,
        );
        return;
      }
    }
    saveEnabledModules({ ...enabled, [id]: !enabled[id] });
    notify(
      turningOn
        ? `${mod.label} enabled in Admin`
        : `${mod.label} disabled in Admin`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="lx-kpi-grid">
        <Card>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Enabled
          </div>
          <div className="lx-kpi-stat__value">{activeCount}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Disabled
          </div>
          <div className="lx-kpi-stat__value">{disabledCount}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Catalog
          </div>
          <div className="lx-kpi-stat__value">{MODULE_CATALOG.length}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Groups
          </div>
          <div className="lx-kpi-stat__value">{groups.length}</div>
        </Card>
      </div>

      {groups.map((group) => {
        const mods = MODULE_CATALOG.filter((m) => m.group === group);
        return (
          <Card key={group}>
            <CardHeader title={group} hint={`${mods.length} modules`} />
            <div className="grid grid-cols-1 gap-3 px-5 pb-5 md:grid-cols-2 lg:grid-cols-3">
              {mods.map((mod) => {
                const locked = !isModuleToggleable(mod);
                const optIn = (NEXUS_OPT_IN_ADMIN_MODULES as readonly string[]).includes(
                  mod.id,
                );
                const nexusOff = optIn
                  ? nexusEntitlements?.[mod.id] !== true
                  : nexusEntitlements?.[mod.id] === false;
                const on = locked || Boolean(enabled[mod.id]);
                return (
                  <ModuleCard
                    key={mod.id}
                    mod={mod}
                    on={on}
                    locked={locked}
                    nexusOff={Boolean(nexusOff)}
                    nexusOptIn={optIn}
                    onToggle={() => guardWriteAction(() => toggle(mod.id))}
                  />
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
