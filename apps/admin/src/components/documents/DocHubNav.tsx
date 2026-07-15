import { Link } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import type { DocHubView } from "@/routes/documents";
import {
  LayoutDashboard,
  Inbox,
  Package,
  FileText,
  FolderCheck,
  Globe,
  PenLine,
  Tags,
  Settings,
  Wand2,
} from "lucide-react";

const NAV: { view: DocHubView; label: string; short: string; icon: typeof LayoutDashboard; highlight?: boolean }[] = [
  { view: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { view: "requests", label: "Requests", short: "Requests", icon: Inbox },
  { view: "packages", label: "Packages", short: "Packages", icon: Package },
  { view: "templates", label: "Templates", short: "Templates", icon: FileText },
  { view: "generate", label: "Generate", short: "Generate", icon: Wand2, highlight: true },
  { view: "generated", label: "Generated", short: "Generated", icon: FolderCheck },
  { view: "published", label: "Published", short: "Published", icon: Globe },
  { view: "signatures", label: "Signatures", short: "Sigs", icon: PenLine },
  { view: "categories", label: "Categories", short: "Cats", icon: Tags },
  { view: "settings", label: "Settings", short: "Settings", icon: Settings },
];

export function DocHubNav({ active }: { active: DocHubView }) {
  return (
    <div className="mb-6 relative">
      <div className="-mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
        <div className="flex gap-0.5 p-1 min-w-max bg-muted/40 rounded-xl border border-border/60">
          {NAV.map(({ view, label, short, icon: Icon, highlight }) => {
            const isActive = active === view;
            return (
              <Link
                key={view}
                to="/documents"
                search={{ view }}
                title={label}
                className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/50 ring-1 ring-border/20"
                    : highlight
                      ? "text-primary hover:text-primary hover:bg-primary/8 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/70"
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
                {highlight && !isActive && (
                  <span className="hidden sm:inline-block size-1.5 rounded-full bg-primary/60 ml-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Scroll fade indicators */}
      <div className="absolute left-0 top-1 bottom-1 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none rounded-l-xl" aria-hidden />
      <div className="absolute right-0 top-1 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none rounded-r-xl" aria-hidden />
    </div>
  );
}
