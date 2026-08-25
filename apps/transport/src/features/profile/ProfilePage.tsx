import { Bus, Hash, Phone, UserRound } from "lucide-react";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { InfoField } from "@/components/ui/info-field";
import { StatusChip } from "@/components/ui/status-chip";
import { useDriverAssignment } from "@/hooks/use-driver-assignment";
import { getInitials } from "@/lib/initials";
import { MODULE_COLORS } from "@/theme/colors";

export function ProfilePage() {
  const assignment = useDriverAssignment();
  const profile = assignment.driver;

  return (
    <DriverAssignmentGate assignment={assignment}>
      <div className="min-w-0 space-y-5 sm:space-y-6">
        <div className="flex items-center justify-end">
          <StatusChip label="Read only" tone="neutral" />
        </div>

        {profile ? (
          <>
            <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-transport/[0.06]">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-7">
                <div className="relative">
                  <Avatar
                    size="xl"
                    src={profile.photoUrl}
                    alt={profile.name}
                    fallback={getInitials(profile.name)}
                    className="size-24 text-xl ring-4 ring-primary/10"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-card px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-soft ring-1 ring-border">
                    Photo
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {profile.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{profile.employeeId}</p>
                </div>
              </CardContent>
            </Card>

            <section className="grid gap-3 sm:grid-cols-2">
              <InfoField
                icon={UserRound}
                label="Name"
                value={profile.name}
                color={MODULE_COLORS.primary}
              />
              <InfoField
                icon={Phone}
                label="Phone"
                value={profile.phone}
                color={MODULE_COLORS.success}
              />
              <InfoField
                icon={Hash}
                label="Employee ID"
                value={profile.employeeId}
                color={MODULE_COLORS.transport}
              />
              <InfoField
                icon={Bus}
                label="Bus number"
                value={profile.busNumber}
                color={MODULE_COLORS.warning}
              />
            </section>
          </>
        ) : null}
      </div>
    </DriverAssignmentGate>
  );
}
