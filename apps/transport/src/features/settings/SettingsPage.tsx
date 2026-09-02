import {
  Bell,
  ClipboardCheck,
  LogOut,
  MapPin,
  Moon,
  Route,
  Sun,
} from "lucide-react";
import { Switch, TextSizeControl, cn, LumenXFeedbackForm } from "@lumenx/ui";
import { useNavigate } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { SectionHeader } from "@/components/ui/section-header";
import { useSettings } from "@/hooks/use-settings";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import { settingsRepository } from "@/lib/transport/settings";
import type { NotificationPrefs, ThemeMode } from "@/lib/transport/types";
import { MODULE_COLORS, type ModuleColor } from "@/theme/colors";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

function ToggleRow({
  icon: Icon,
  title,
  subtitle,
  checked,
  onCheckedChange,
  color,
}: {
  icon: typeof Bell;
  title: string;
  subtitle: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  color: ModuleColor;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft">
      <IconWell icon={Icon} size="md" color={color} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground sm:text-base">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {subtitle}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}

export function SettingsPage() {
  const { theme, notifications } = useSettings();
  const { signOut } = useTransportAuth();
  const navigate = useNavigate();

  const setToggle = (key: keyof NotificationPrefs, value: boolean) => {
    void settingsRepository.setNotificationPref(key, value);
  };

  const handleSignOut = () => {
    signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <section className="space-y-3">
        <SectionHeader
          title="Appearance"
          subtitle="Light or Dark · default Light · does not follow system"
        />
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => void settingsRepository.setTheme(option.id)}
                className={cn(
                  "transport-pressable flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center shadow-soft",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50",
                )}
                aria-pressed={selected}
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={
                    selected
                      ? {
                          color: MODULE_COLORS.primary.primary,
                          backgroundColor: MODULE_COLORS.primary.iconBackground,
                        }
                      : {
                          color: MODULE_COLORS.slate.primary,
                          backgroundColor: MODULE_COLORS.slate.iconBackground,
                        }
                  }
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold sm:text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft space-y-2">
          <div>
            <p className="text-sm font-semibold text-foreground sm:text-base">Text Size</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Small, Default, Large, or Extra Large. Default is Default.
            </p>
          </div>
          <TextSizeControl />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Notifications"
          subtitle="App look and alerts on this phone"
        />
        <div className="space-y-2.5">
          <ToggleRow
            icon={MapPin}
            title="Location"
            subtitle="Allow location-related alerts on this device"
            checked={notifications.location}
            onCheckedChange={(value) => setToggle("location", value)}
            color={MODULE_COLORS.transport}
          />
          <ToggleRow
            icon={Bell}
            title="Push"
            subtitle="Show push-style alerts in the app"
            checked={notifications.push}
            onCheckedChange={(value) => setToggle("push", value)}
            color={MODULE_COLORS.warning}
          />
          <ToggleRow
            icon={Route}
            title="Route Updates"
            subtitle="Changes to stops, timing, or assigned route"
            checked={notifications.routeUpdates}
            onCheckedChange={(value) => setToggle("routeUpdates", value)}
            color={MODULE_COLORS.primary}
          />
          <ToggleRow
            icon={ClipboardCheck}
            title="Attendance Alerts"
            subtitle="Boarding and dropping reminders"
            checked={notifications.attendanceAlerts}
            onCheckedChange={(value) => setToggle("attendanceAlerts", value)}
            color={MODULE_COLORS.success}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Feedback"
          subtitle="Send product feedback to LumenX (not your school)"
        />
        <Card className="border-border shadow-soft">
          <CardContent className="p-4 sm:p-5">
            <LumenXFeedbackForm source="transport" compact />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Account" subtitle="End your driver session on this device" />
        <button
          type="button"
          onClick={handleSignOut}
          className="transport-pressable flex w-full items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-left shadow-soft"
        >
          <IconWell icon={LogOut} size="md" color={MODULE_COLORS.danger} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive sm:text-base">Sign out</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Clears this device session and returns to login
            </p>
          </div>
        </button>
      </section>

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground sm:p-5">
          Preferences are stored on this device only. No backend or API is used.
        </CardContent>
      </Card>
    </div>
  );
}
