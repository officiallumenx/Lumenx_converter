import { IconChip } from "@/components/IconChip";
import { Link } from "@tanstack/react-router";
import type { TemplateHubView } from "@/lib/template-management/types";
import {
  LayoutDashboard,
  Library,
  Wand2,
  FileCheck,
  FolderOpen,
  Users,
  MoreHorizontal,
} from "lucide-react";

/** Primary nav only — kind filters live in Library; Imports/Categories/Settings under More. */
const NAV: { view: TemplateHubView; label: string; short: string; icon: typeof LayoutDashboard }[] =
  [
    { view: "dashboard", label: "Overview", short: "Home", icon: LayoutDashboard },
    { view: "library", label: "Library", short: "Library", icon: Library },
    { view: "builder", label: "Builder", short: "Builder", icon: Wand2 },
    { view: "generate", label: "Issue", short: "Issue", icon: FileCheck },
    { view: "students", label: "Students", short: "Students", icon: Users },
    { view: "generated", label: "Generated", short: "Out", icon: FolderOpen },
    { view: "more", label: "More", short: "More", icon: MoreHorizontal },
  ];

export function TemplateHubNav({
  active,
  compact = false,
}: {
  active: TemplateHubView;
  compact?: boolean;
}) {
  const activeNav: TemplateHubView =
    active === "certificates" ||
    active === "reports" ||
    active === "id_cards" ||
    active === "documents"
      ? "library"
      : active === "imports" || active === "categories" || active === "settings"
        ? "more"
        : active;

  return (
    <div className={`${compact ? "mb-2" : "mb-3 sm:mb-6"} -mx-1 px-1 overflow-x-auto lx-sidebar-scroll`}>
      <div className="lx-module-hub-nav flex gap-1 p-1 min-w-max bg-background rounded-lg border border-border">
        {NAV.map(({ view, label, short, icon: Icon }) => {
          const isActive = activeNav === view;
          return (
            <Link
              key={view}
              to="/templates"
              search={{ view }}
              title={label}
              className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <IconChip
                icon={Icon}
                size="xs"
                active={isActive}
                className={isActive ? "bg-primary-foreground/15 text-primary-foreground" : undefined}
              />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
