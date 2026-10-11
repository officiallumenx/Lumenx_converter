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
      <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max rounded-xl border border-border bg-card">
        {NAV.map(({ view, label, short, icon: Icon }) => {
          const isActive = activeNav === view;
          return (
            <Link
              key={view}
              to="/templates"
              search={{ view }}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? "bg-muted/70 text-foreground border border-border shadow-xs"
                  : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <IconChip
                icon={Icon}
                size="xs"
                variant={isActive ? "brand" : "soft"}
                active={isActive}
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
