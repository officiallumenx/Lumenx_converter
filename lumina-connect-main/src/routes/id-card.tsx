import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { studentProfile, children as allChildren } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { Printer, Download, ShieldCheck, Phone, Heart, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/id-card")({
  head: () => ({
    meta: [
      { title: "Digital ID Card — Unify" },
      { name: "description", content: "Wallet-style digital student identity card with QR code." },
    ],
  }),
  component: () => (
    <AppShell>
      <IdCardPage />
    </AppShell>
  ),
});

function IdCardPage() {
  const { role, user, activeChildId } = useApp();
  const child = allChildren.find((c) => c.id === activeChildId) ?? allChildren[0];

  const profile =
    role === "parent"
      ? {
          name: child.name,
          initials: child.initials,
          className: child.className,
          section: child.section,
          rollNo: child.rollNo,
          id: `S-${2040 + allChildren.indexOf(child)}`,
        }
      : {
          name: user?.name ?? studentProfile.name,
          initials: (user?.name ?? studentProfile.name)
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join(""),
          className: studentProfile.class,
          section: studentProfile.section,
          rollNo: studentProfile.rollNo,
          id: studentProfile.id,
        };

  return (
    <div className="min-w-0 max-w-full" key={role === "parent" ? activeChildId : "id-student"}>
      <PageHeader
        title="Digital ID Card"
        subtitle="Wallet-ready identity card. Print or save for offline access."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              className="rounded-xl gap-2 shadow-glow"
              onClick={() => toast.success("Saved to device wallet (demo)")}
            >
              <Download className="size-4" /> Save
            </Button>
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 justify-center">
          <IdCard
            name={profile.name}
            initials={profile.initials}
            className={profile.className}
            section={profile.section}
            rollNo={profile.rollNo}
            sid={profile.id}
          />
        </div>

        <SectionCard title="Card details">
          <dl className="min-w-0">
            <Row k="Student ID" v={profile.id} />
            <Row k="Roll No" v={profile.rollNo} />
            <Row k="Class" v={`${profile.className} • Sec ${profile.section}`} />
            <Row k="Institute" v="Unify Academy" />
            <Row k="Issued on" v="01 Apr 2024" />
            <Row k="Valid till" v="31 Mar 2025" />
            <Row k="Blood group" v="O+" />
            <Row k="Emergency" v="+91 98•••••12" />
            <Row k="Parent" v="Rajesh Sharma" />
            <Row k="House" v="Sapphire" />
          </dl>
          <div className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success mt-0.5 shrink-0" />
            This card is digitally signed by the school. Reusable structure prepared for Teacher and
            Staff ID cards in upcoming releases.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-0.5 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,40%)_1fr] sm:items-baseline sm:gap-x-4">
      <dt className="text-sm text-muted-foreground">{k}</dt>
      <dd className="break-words text-sm font-medium sm:text-right">{v}</dd>
    </div>
  );
}

function IdCard({
  name,
  initials,
  className,
  section,
  rollNo,
  sid,
}: {
  name: string;
  initials: string;
  className: string;
  section: string;
  rollNo: string;
  sid: string;
}) {
  return (
    <div className="relative w-full min-w-0 max-w-sm rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow overflow-hidden print:shadow-none">
      <div className="absolute -top-12 -right-12 size-44 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 size-44 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="size-9 rounded-xl bg-white/15 grid place-items-center font-bold">U</div>
        <div className="leading-tight">
          <div className="font-display font-semibold">Unify Academy</div>
          <div className="text-[11px] opacity-80 uppercase tracking-widest">Student ID</div>
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-4">
        <Avatar className="size-20 ring-4 ring-white/30">
          <AvatarFallback className="bg-white/20 text-primary-foreground font-display text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold truncate">{name}</div>
          <div className="text-sm opacity-85 truncate inline-flex items-center gap-1.5">
            <GraduationCap className="size-3.5" /> {className} • Sec {section}
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
            Roll {rollNo} • {sid}
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-3 text-[11px]">
        <Mini k="Blood" v="O+" icon={Heart} />
        <Mini k="House" v="Sapphire" />
        <Mini k="SOS" v="+91 98•••••12" icon={Phone} />
      </div>

      <div className="relative mt-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] opacity-75 uppercase tracking-widest">Valid till</div>
          <div className="text-sm font-medium">31 Mar 2025</div>
        </div>
        <div className="size-16 rounded-xl bg-white grid place-items-center text-primary p-1.5">
          <QrPlaceholder />
        </div>
      </div>
    </div>
  );
}

function Mini({ k, v, icon: Icon }: { k: string; v: string; icon?: typeof Heart }) {
  return (
    <div className="rounded-xl bg-white/10 px-2.5 py-1.5">
      <div className="opacity-75 uppercase tracking-widest text-[9px] flex items-center gap-1">
        {Icon && <Icon className="size-3" />} {k}
      </div>
      <div className="font-medium truncate">{v}</div>
    </div>
  );
}

function QrPlaceholder() {
  // Simple decorative QR-like pattern; real QR generation can be wired later.
  const cells = Array.from(
    { length: 49 },
    (_, i) => [(i * 7 + 13) % 5 === 0, (i * 3 + 1) % 4 === 0, (i * 11 + 5) % 6 === 0][i % 3],
  );
  return (
    <div className="grid grid-cols-7 gap-[1px] w-full h-full">
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-primary" : "bg-transparent"} />
      ))}
    </div>
  );
}
