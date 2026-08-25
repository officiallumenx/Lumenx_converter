import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@lumenx/ui";
import { MapPinned, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MORE_NAV, PRIMARY_NAV, ROUTES } from "@/constants";
import { useAlerts } from "@/hooks/use-alerts";
import { useTripSession } from "@/hooks/use-trip-session";
import { attendanceRepository } from "@/lib/transport";

/**
 * Transport Global Search — Driver portal + current bus/route only.
 * Never searches other institutes, other drivers, or Admin/Connect portals.
 */
export function TransportGlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { assignment } = useTripSession();
  const alerts = useAlerts();
  const roster = useMemo(() => attendanceRepository.getSnapshot(), [open, assignment.bus.vehicleId]);

  const scopeLabel = `${assignment.bus.busNumber} · ${assignment.route.code}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Search this route"
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" aria-hidden />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={`Search ${scopeLabel} (Driver portal only)…`} />
        <CommandList className="max-h-[min(420px,70vh)]">
          <CommandEmpty>No results on this route.</CommandEmpty>

          <CommandGroup heading={`Quick links · Driver · ${scopeLabel}`}>
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`nav ${item.label} ${item.path}`}
                  onSelect={() => go(item.path)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="More · this bus">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`more ${item.label} ${item.description}`}
                  onSelect={() => go(item.path)}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {assignment.route.stops.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Stops · ${assignment.route.name}`}>
                {assignment.route.stops.map((stop) => (
                  <CommandItem
                    key={stop.id}
                    value={`stop ${stop.name} ${stop.sequence}`}
                    onSelect={() => go(ROUTES.routeSetup)}
                  >
                    <MapPinned className="size-4 text-muted-foreground" />
                    <span className="truncate">{stop.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">#{stop.sequence}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {roster.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Students · ${assignment.bus.busNumber}`}>
                {roster.slice(0, 12).map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`student ${s.name} ${s.rollNo} ${s.stopName} ${s.grade}`}
                    onSelect={() => go(ROUTES.attendance)}
                  >
                    <Users className="size-4 text-muted-foreground" />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground truncate max-w-[7rem]">
                      {s.stopName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {alerts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Notifications · this shift">
                {alerts.slice(0, 6).map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`alert ${a.title} ${a.message}`}
                    onSelect={() => go(ROUTES.notifications)}
                  >
                    <span className="truncate">{a.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
