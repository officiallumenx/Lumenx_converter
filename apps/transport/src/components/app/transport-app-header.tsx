import { Bell, LogOut, Moon, Settings, UserRound } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PendingSyncBadge,
  Switch,
} from "@lumenx/ui";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { useAlerts } from "@/hooks/use-alerts";
import { useSettings } from "@/hooks/use-settings";
import { useTripSession } from "@/hooks/use-trip-session";
import { getInitials } from "@/lib/initials";
import { settingsRepository } from "@/lib/transport";
import { useTransportAuth } from "@/lib/auth";

import { TransportGlobalSearch } from "./transport-global-search";

import { DriverMark } from "./driver-mark";

function formatUnreadBadge(count: number) {
  return count > 9 ? "9+" : String(count);
}

export function TransportAppHeader() {
  const navigate = useNavigate();
  const { signOut } = useTransportAuth();
  const { assignment } = useTripSession();
  const { theme } = useSettings();
  const driver = assignment.driver;
  const unreadCount = useAlerts().filter((item) => item.unread).length;

  const toggleDarkMode = (checked: boolean) => {
    void settingsRepository.setTheme(checked ? "dark" : "light");
  };

  const signOutAndLeave = () => {
    signOut();
    toast.message("Signed out", {
      description: "Trip and attendance data were reset for this demo.",
    });
    void navigate({ to: ROUTES.login });
  };

  return (
    <header className="transport-app-header z-40 shrink-0 border-b pt-[var(--safe-area-top)]">
      <div className="mx-auto flex h-14 max-w-[720px] items-center gap-3 px-4 sm:px-5">
        <DriverMark />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
            {driver.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">Driver</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <PendingSyncBadge />
          <TransportGlobalSearch />
          <Link
            to={ROUTES.notifications}
            aria-label={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
            }
          >
            <Button variant="ghost" size="icon" type="button" className="relative shrink-0">
              <Bell className="size-5" aria-hidden />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {formatUnreadBadge(unreadCount)}
                </span>
              ) : null}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
                <Avatar
                  size="sm"
                  src={driver.photoUrl}
                  alt={driver.name}
                  fallback={getInitials(driver.name)}
                  className="size-8"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[80] w-60 rounded-2xl">
              <DropdownMenuLabel>
                <div className="font-medium">{driver.name}</div>
                <div className="text-xs font-normal text-muted-foreground">{driver.phone}</div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  <span className="size-1.5 rounded-full bg-success" /> Driver portal
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-xl"
                onClick={() => void navigate({ to: ROUTES.profile })}
              >
                <UserRound className="size-4" aria-hidden />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-xl"
                onClick={() => void navigate({ to: ROUTES.settings })}
              >
                <Settings className="size-4" aria-hidden />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-default rounded-xl"
                onSelect={(event) => event.preventDefault()}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Moon className="size-4" aria-hidden />
                    Dark mode
                  </span>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={toggleDarkMode}
                    aria-label="Toggle dark mode"
                  />
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-xl text-destructive focus:text-destructive"
                onClick={signOutAndLeave}
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
