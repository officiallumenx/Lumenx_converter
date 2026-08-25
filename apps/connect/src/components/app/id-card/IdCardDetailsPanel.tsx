import {
  Building2,
  Calendar,
  Droplets,
  Home,
  IdCard,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import { cn } from "@lumenx/ui";

export type IdCardDetails = {
  id: string;
  rollNo: string;
  className: string;
  section: string;
  institute: string;
  address: string;
  issuedOn: string;
  validTill: string;
  bloodGroup: string;
  emergencyContact: string;
  parentName: string;
  house: string;
};

function emptyLabel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "—" ? trimmed : "Not added";
}

export function IdCardDetailsPanel({ details }: { details: IdCardDetails }) {
  return (
    <SectionCard title="Card details" className="h-full">
      <div className="space-y-4">
        <DetailGroup title="Identity">
          <DetailItem icon={IdCard} label="Student ID" value={details.id} />
          <DetailItem icon={User} label="Roll number" value={emptyLabel(details.rollNo)} />
          <DetailItem
            icon={Building2}
            label="Class & section"
            value={`${emptyLabel(details.className)} · Sec ${emptyLabel(details.section)}`}
          />
          <DetailItem icon={Home} label="House" value={emptyLabel(details.house)} />
        </DetailGroup>

        <DetailGroup title="Institute">
          <DetailItem icon={Building2} label="School" value={emptyLabel(details.institute)} />
          <DetailItem
            icon={MapPin}
            label="Address"
            value={emptyLabel(details.address)}
            multiline
          />
        </DetailGroup>

        <DetailGroup title="Validity & safety">
          <DetailItem icon={Calendar} label="Issued on" value={emptyLabel(details.issuedOn)} />
          <DetailItem
            icon={Calendar}
            label="Valid till"
            value={emptyLabel(details.validTill)}
            highlight
          />
          <DetailItem icon={Droplets} label="Blood group" value={emptyLabel(details.bloodGroup)} />
          <DetailItem
            icon={Phone}
            label="Emergency"
            value={emptyLabel(details.emergencyContact)}
          />
          <DetailItem
            icon={Users}
            label="Parent / guardian"
            value={emptyLabel(details.parentName)}
          />
        </DetailGroup>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
          <ShieldCheck className="size-4" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This card is digitally signed by the school. Scan the QR code to verify identity at gates,
          events, and transport checkpoints. Missing fields stay blank until Admin updates the
          student record.
        </p>
      </div>
    </SectionCard>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5">
      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h4>
      <dl className="space-y-2.5">{children}</dl>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  multiline,
  highlight,
}: {
  icon: typeof IdCard;
  label: string;
  value: string;
  multiline?: boolean;
  highlight?: boolean;
}) {
  const isEmpty = value === "Not added";
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm ring-1 ring-border/60">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "mt-0.5 text-sm font-semibold",
            isEmpty ? "font-medium text-muted-foreground" : "text-foreground",
            multiline && "leading-relaxed",
            highlight && !isEmpty && "text-primary",
          )}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
