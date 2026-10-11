import { Link } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import {
  DOC_HUB_DEMO_EXTRA_NAV,
  DOC_HUB_PRIMARY_NAV,
  type DocHubView,
} from "@/lib/documents/doc-hub-views";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  Archive,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  PenLine,
  Inbox,
  Settings,
  Tags,
  Wand2,
  Users,
} from "lucide-react";

const ICONS: Record<DocHubView, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  official: Wand2,
  "student-docs": Users,
  templates: FileText,
  archive: Archive,
  requests: Inbox,
  packages: Package,
  signatures: PenLine,
  categories: Tags,
  settings: Settings,
};

export function DocHubNav({ active }: { active: DocHubView }) {
  const apiMode = isApiAuthMode();
  const items = apiMode
    ? DOC_HUB_PRIMARY_NAV
    : [...DOC_HUB_PRIMARY_NAV, ...DOC_HUB_DEMO_EXTRA_NAV];

  return (
    <div className="mb-3 sm:mb-6 relative">
      <div className="-mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
        <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max rounded-xl border border-border bg-card">
          {items.map((item) => {
            const { view, label, short } = item;
            const highlight = "highlight" in item ? item.highlight : false;
            const Icon = ICONS[view] ?? FolderOpen;
            const isActive = active === view;
            return (
              <Link
                key={view}
                to="/documents"
                search={{ view }}
                title={label}
                aria-current={isActive ? "page" : undefined}
                className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? "bg-muted/70 text-foreground border border-border shadow-xs"
                    : highlight
                      ? "border border-transparent text-primary hover:text-primary hover:bg-primary/8 font-semibold"
                      : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <IconChip
                  icon={Icon}
                  size="xs"
                  variant={isActive || highlight ? "brand" : "soft"}
                  active={isActive}
                />
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden text-[10px]">{short}</span>
                {highlight && !isActive ? (
                  <span className="hidden sm:inline-block size-1.5 rounded-full bg-primary/60 ml-0.5" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
