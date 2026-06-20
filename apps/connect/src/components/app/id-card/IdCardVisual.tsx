import { GraduationCap, MapPin, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { StudentQrCode } from "@/components/app/student/StudentQrCode";

export type IdCardVisualProps = {
  instituteName: string;
  name: string;
  initials: string;
  className: string;
  section: string;
  rollNo: string;
  sid: string;
  address: string;
  validTill: string;
  qrPayload: string;
  onQrClick: () => void;
};

export function IdCardVisual({
  instituteName,
  name,
  initials,
  className,
  section,
  rollNo,
  sid,
  address,
  validTill,
  qrPayload,
  onQrClick,
}: IdCardVisualProps) {
  return (
    <div className="relative mx-auto w-full max-w-[360px] px-1 pb-2 pt-1">
      {/* Showcase glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-8 bottom-4 rounded-[2rem] bg-primary/25 blur-3xl"
      />

      <article
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-white",
          "shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]",
          "ring-1 ring-slate-900/5",
          "transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-1",
          "motion-safe:hover:shadow-[0_32px_70px_-18px_rgba(15,23,42,0.5)]",
          "print:shadow-none print:hover:translate-y-0",
        )}
      >
        {/* Header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-5 pb-5 pt-4 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-indigo-400/20 blur-2xl"
          />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-amber-400/40 bg-white/10 font-display text-lg font-bold shadow-inner ring-2 ring-amber-400/25">
              {instituteName.charAt(0)}
            </div>
            <h2 className="font-display text-[15px] font-bold leading-tight tracking-tight sm:text-base">
              {instituteName}
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
              Student Identity Card
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white px-5 pb-4 pt-5">
          {/* Photo + name block */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-amber-400/70 via-primary/40 to-indigo-500/50 blur-[2px]"
              />
              <Avatar className="relative size-[7.5rem] rounded-[1.25rem] ring-[3px] ring-white shadow-lg sm:size-32">
                <AvatarFallback className="rounded-[1.15rem] bg-gradient-to-br from-indigo-600 to-violet-700 font-display text-3xl text-white sm:text-4xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <h3 className="mt-4 text-center font-display text-xl font-bold leading-tight text-slate-900 sm:text-[1.35rem]">
              {name}
            </h3>
            <span className="mt-1.5 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
              {sid}
            </span>
          </div>

          {/* Roll / class / section */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <InfoPill label="Roll No" value={rollNo} />
            <InfoPill label="Class" value={className.replace(/^Class\s*/i, "")} />
            <InfoPill label="Section" value={section} />
          </div>

          {/* Address */}
          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="flex gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Residential address
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{address}</p>
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="mt-5 flex flex-col items-center">
            <div className="relative rounded-[1.25rem] border-2 border-dashed border-slate-200 bg-white p-3 shadow-inner">
              <StudentQrCode
                value={qrPayload}
                size={112}
                className="size-[124px] rounded-xl p-2 shadow-sm"
                onClick={onQrClick}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-1 -top-1 size-3 border-l-2 border-t-2 border-amber-400"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-1 -top-1 size-3 border-r-2 border-t-2 border-amber-400"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-amber-400"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-amber-400"
              />
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <GraduationCap className="size-3" />
              Scan to open profile
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-900 px-5 py-3 text-white">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Valid until
            </p>
            <p className="mt-0.5 text-sm font-semibold text-amber-300">{validTill}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              Verified
            </span>
          </div>
        </footer>
      </article>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-center shadow-sm">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="mt-0.5 w-full truncate text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
