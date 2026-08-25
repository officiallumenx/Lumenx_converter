import { Link } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import type { AttendanceHubView } from "@/routes/attendance";
import { LayoutDashboard, FileSpreadsheet, BarChart3 } from "lucide-react";

const NAV: {
  view: AttendanceHubView;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
}[] = [
  { view: "monitor", label: "Monitor", short: "Monitor", icon: LayoutDashboard },
  { view: "reports", label: "Reports", short: "Reports", icon: FileSpreadsheet },
  { view: "analytics", label: "Analytics", short: "Analytics", icon: BarChart3 },
];

export function AttendanceHubNav({ active }: { active: AttendanceHubView }) {
  return (
    <div className="mb-3 sm:mb-6 relative">
      <div className="-mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
        <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max bg-muted/40 rounded-xl border border-border/60">
          {NAV.map(({ view, label, short, icon: Icon }) => {
            const isActive = active === view;
            return (
              <Link
                key={view}
                to="/attendance"
                search={{ view }}
                title={label}
                className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/50 ring-1 ring-border/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/70"
                }`}
              >
                <IconChip
                  icon={Icon}
                  size="xs"
                  variant={isActive ? "brand" : "soft"}
                  active={isActive}
                />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden text-[10px]">{short}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
