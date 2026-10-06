import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { PersonalSettingsWorkspace } from "@/components/settings/PersonalSettingsWorkspace";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/profile-settings")({
  head: () => ({ meta: [{ title: adminPageTitle("/profile-settings") }] }),
  component: ProfileSettingsPage,
});

function ProfileSettingsPage() {
  return (
    <AppShell
      title={M.profileSettings}
      subtitle="Your profile, appearance, lock, and device preferences"
    >
      <ModuleHero
        compact
        eyebrow="Settings"
        title={M.profileSettings}
        subtitle="Your profile, appearance, lock, and device preferences"
      />
      <PersonalSettingsWorkspace />
    </AppShell>
  );
}
