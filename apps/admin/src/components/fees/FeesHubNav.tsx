import { Link } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import type { FeesHubView } from "@/routes/fees";
import {
  LayoutDashboard,
  BookOpen,
  Bus,
  PlusCircle,
  Send,
  UserRound,
} from "lucide-react";

const NAV: {
  view: FeesHubView;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
}[] = [
  { view: "overview", label: "Overview", short: "Home", icon: LayoutDashboard },
  { view: "class-fees", label: "Class fees", short: "Class", icon: BookOpen },
  { view: "transport", label: "Transport fees", short: "Fee", icon: Bus },
  { view: "extra", label: "Extra fees", short: "Extra", icon: PlusCircle },
  { view: "publish", label: "Publish", short: "Publish", icon: Send },
  { view: "students", label: "Student fees", short: "Student", icon: UserRound },
];

export function FeesHubNav({ active }: { active: FeesHubView }) {
  return (
    <div className="mb-3 sm:mb-6 relative">
      <div className="-mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
        <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max rounded-xl border border-border bg-card">
          {NAV.map(({ view, label, short, icon: Icon }) => {
            const isActive = active === view;
            return (
              <Link
                key={view}
                to="/fees"
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
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden text-[10px]">{short}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
