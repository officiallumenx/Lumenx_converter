import { Building2, ChevronDown, GraduationCap, Layers, School } from "lucide-react";
import { IconChip } from "@/components/IconChip";
import { useState } from "react";
import { DEMO_PROFILES, useDemoProfile } from "@/lib/demo-profile-context";
import type { DemoProfileId } from "@lumenx/types";

const ICONS: Record<DemoProfileId, typeof Layers> = {
  multi_institute: Layers,
  single_institute: School,
  inter_college: GraduationCap,
};

export function DemoProfileSwitcher({ compact }: { compact?: boolean }) {
  const { profileId, profile, setProfileId } = useDemoProfile();
  const [open, setOpen] = useState(false);
  const Icon = ICONS[profileId];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`lx-demo-profile-trigger ${compact ? "lx-demo-profile-trigger--compact" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <IconChip icon={Icon} size="xs" variant="soft" />
        {!compact && (
          <span className="min-w-0 text-left">
            <span className="block truncate font-medium">{profile.shortLabel}</span>
            <span className="block truncate text-[10px] text-muted-foreground capitalize">
              {profile.campusKind} demo
            </span>
          </span>
        )}
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close demo profile menu"
            onClick={() => setOpen(false)}
          />
          <div className="lx-demo-profile-menu" role="listbox">
            <div className="px-3 py-2 border-b border-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Demo profile
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Switch admin + Connect experience
              </div>
            </div>
            {DEMO_PROFILES.map((p) => {
              const ItemIcon = ICONS[p.id];
              const active = p.id === profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setProfileId(p.id);
                    setOpen(false);
                  }}
                  className={`lx-demo-profile-option ${active ? "lx-demo-profile-option--active" : ""}`}
                >
                  <IconChip icon={ItemIcon} size="xs" variant={active ? "brand" : "soft"} />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-medium">{p.label}</span>
                    <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {p.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function DemoProfileBanner() {
  const { profile } = useDemoProfile();
  return (
    <div className="lx-demo-profile-banner" role="status">
      <Building2 className="size-3.5 shrink-0 text-primary" />
      <span>
        <strong>{profile.label}</strong>
        {" — "}
        {profile.admin.organizationName}
        {profile.admin.showBranchSwitcher
          ? ` · ${profile.admin.branches.length} ${profile.admin.branchSwitcherLabel.toLowerCase()}es`
          : " · single campus"}
      </span>
    </div>
  );
}
