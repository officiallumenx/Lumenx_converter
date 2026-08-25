import { Link } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import type { TransportHubView } from "@/routes/transport";
import {
  LayoutDashboard,
  Bus,
  UserRound,
  MapPin,
  Route,
  Users,
  Navigation,
  Settings,
  BarChart3,
  Siren,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";

const NAV: {
  view: TransportHubView;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
}[] = [
  { view: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { view: "vehicles", label: "Vehicles", short: "Fleet", icon: Bus },
  { view: "drivers", label: "Drivers", short: "Drivers", icon: UserRound },
  { view: "stops", label: "Stops", short: "Stops", icon: MapPin },
  { view: "routes", label: "Routes", short: "Routes", icon: Route },
  { view: "students", label: "Students", short: "Students", icon: Users },
  { view: "reviews", label: "Pending", short: "Review", icon: ClipboardCheck },
  { view: "trips", label: "Trips", short: "Trips", icon: Navigation },
  { view: "attendance", label: "Attendance", short: "Board", icon: UserCheck },
  { view: "emergencies", label: "Emergencies", short: "SOS", icon: Siren },
  { view: "analytics", label: "Analytics", short: "Analytics", icon: BarChart3 },
  { view: "settings", label: "Settings", short: "Settings", icon: Settings },
];

export function TransportHubNav({ active }: { active: TransportHubView }) {
  return (
    <div className="mb-3 sm:mb-6 relative">
      <div className="-mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
        <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max bg-muted/40 rounded-xl border border-border/60">
          {NAV.map(({ view, label, short, icon: Icon }) => {
            const isActive = active === view;
            return (
              <Link
                key={view}
                to="/transport"
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
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden text-[10px]">{short}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div
        className="absolute left-0 top-1 bottom-1 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none rounded-l-xl"
        aria-hidden
      />
      <div
        className="absolute right-0 top-1 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none rounded-r-xl"
        aria-hidden
      />
    </div>
  );
}
