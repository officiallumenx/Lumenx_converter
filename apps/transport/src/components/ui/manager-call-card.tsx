import { Phone } from "lucide-react";

import { openDialer } from "@/lib/open-dialer";
import { MODULE_COLORS } from "@/theme/colors";

import { Button } from "./button";
import { Card, CardContent } from "./card";
import { IconWell } from "./icon-well";

export function ManagerCallCard({
  name,
  phone,
  label = "Manager number",
  buttonLabel = "Call Transport Manager",
}: {
  name: string;
  phone: string;
  label?: string;
  buttonLabel?: string;
}) {
  return (
    <Card className="border-primary/15">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <IconWell icon={Phone} size="lg" color={MODULE_COLORS.primary} />
          <div className="min-w-0 flex-1">
            <p className="transport-stat-label">{label}</p>
            <p className="font-display text-base font-semibold tracking-tight text-foreground">
              {name}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{phone}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          expanded
          className="mt-4 border-primary/25 text-primary hover:bg-primary/5"
          aria-label={`${buttonLabel} ${phone}`}
          onClick={() => openDialer(phone)}
        >
          <Phone aria-hidden />
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
