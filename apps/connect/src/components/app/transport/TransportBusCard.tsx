import { Bus, Phone, User } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import type { BusDetails, StudentTransportAssignment } from "@/lib/transport/types";
import { Badge, cn } from "@lumenx/ui";

function formatStopDetail(
  stop: { id?: string; name: string; address?: string; scheduledTime?: string },
): string {
  const isUnassigned =
    stop.id === "pickup-unassigned" ||
    stop.id === "drop-unassigned" ||
    !stop.name ||
    stop.name.toLowerCase().includes("not assigned");
  if (isUnassigned) {
    return "Stop not assigned · School assignment pending";
  }
  const cleanName = stop.name.trim();
  const cleanAddr = stop.address?.trim() ?? "";
  let extraDetail = "";
  if (
    cleanAddr &&
    !cleanAddr.toLowerCase().includes("not been assigned") &&
    cleanAddr.toLowerCase() !== cleanName.toLowerCase()
  ) {
    if (cleanAddr.toLowerCase().startsWith(cleanName.toLowerCase())) {
      const remainder = cleanAddr.slice(cleanName.length).replace(/^[,\s-]+/, "").trim();
      if (remainder) extraDetail = remainder;
    } else {
      extraDetail = cleanAddr;
    }
  }

  const stopDisplay = extraDetail ? `${cleanName} (${extraDetail})` : cleanName;
  if (stop.scheduledTime && stop.scheduledTime !== "Not scheduled") {
    return `${stopDisplay} · ${stop.scheduledTime}`;
  }
  return stopDisplay;
}

export function TransportBusCard({
  assignment,
  className,
}: {
  assignment:
    | StudentTransportAssignment
    | {
        bus: BusDetails;
        pickupStop: { id?: string; name: string; address?: string; scheduledTime?: string };
        dropStop: { id?: string; name: string; address?: string; scheduledTime?: string };
        morningPickupTime: string;
        afternoonDropTime: string;
      };
  className?: string;
}) {
  const { bus } = assignment;

  return (
    <SectionCard title="Bus details" className={className}>
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Bus className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{bus.busNumber}</h4>
            <Badge variant="outline" className="text-[10px]">
              {bus.routeCode}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{bus.routeName}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reg: {bus.vehicleReg}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Detail
          label="Assigned stop"
          value={formatStopDetail(assignment.pickupStop || assignment.dropStop)}
        />
        <Detail label="Driver" value={bus.driverName} icon={User} />
        <Detail
          label="Capacity"
          value={
            typeof bus.capacity === "number" && bus.capacity > 0
              ? `${bus.capacity} seats`
              : "Capacity not configured"
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`tel:${bus.driverPhone.replace(/\s/g, "")}`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted/50"
        >
          <Phone className="size-3.5" /> Call driver
        </a>
        {bus.conductorName && (
          <Badge variant="secondary" className="rounded-lg">
            Conductor: {bus.conductorName}
          </Badge>
        )}
      </div>
    </SectionCard>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof User;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-medium flex items-center gap-1.5", Icon && "gap-2")}>
        {Icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
        <span className="break-words">{value}</span>
      </p>
    </div>
  );
}
