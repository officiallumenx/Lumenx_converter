import { useEffect, useState, type CSSProperties } from "react";
import { Building2, CalendarDays, GraduationCap } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import type { AttentionSeverity } from "@/lib/dashboard";

function firstName(fullName: string | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatHeroDate(now: Date): string {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHeroDateShort(now: Date): string {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function HomeHero({
  attentionCount,
  hasCritical,
  instituteName,
  academicYearLabel,
}: {
  attentionCount: number;
  hasCritical: boolean;
  instituteName?: string | null;
  academicYearLabel?: string | null;
}) {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const name = firstName(user?.name);
  const greeting = greetingForHour(now.getHours());
  const statusLabel =
    hasCritical
      ? "Urgent items need your response"
      : attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`
        : "A great day to make a positive impact.";

  const statusTone: AttentionSeverity =
    hasCritical ? "critical" : attentionCount > 0 ? "attention" : "info";

  return (
    <section
      className={`lx-home-section lx-home-hero lx-home-hero--welcome lx-home-hero--${statusTone}`}
      style={{ "--lx-home-i": 1 } as CSSProperties}
    >
      <div className="lx-home-hero__glow" aria-hidden />
      <div className="lx-home-hero__content">
        <h2 className="lx-home-hero__title">
          {greeting}, <span className="lx-home-hero__name">{name}</span>{" "}
          <span aria-hidden>👋</span>
        </h2>
        <p className="lx-home-hero__sub lx-home-hero__sub--mobile">{statusLabel}</p>
        <p className="lx-home-hero__sub lx-home-hero__sub--desktop">
          Here&apos;s what&apos;s happening at your institute today.
        </p>

        <div className="lx-home-hero__pills">
          <span className="lx-home-hero__date-pill">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <time className="lx-home-hero__date-full" dateTime={now.toISOString()}>
              {formatHeroDate(now)}
            </time>
            <time className="lx-home-hero__date-short" dateTime={now.toISOString()}>
              {formatHeroDateShort(now)}
            </time>
          </span>
          {instituteName ? (
            <span className="lx-home-hero__meta-pill lx-home-hero__meta-pill--desktop">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              {instituteName}
            </span>
          ) : null}
          {academicYearLabel ? (
            <span className="lx-home-hero__meta-pill lx-home-hero__meta-pill--desktop">
              <GraduationCap className="size-3.5 shrink-0" aria-hidden />
              {academicYearLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="lx-home-hero__aside" aria-hidden>
        <p className="lx-home-hero__quote">
          Empowering schools for a brighter tomorrow.
        </p>
        <div className="lx-home-hero__art">
          <svg viewBox="0 0 180 140" className="lx-home-hero__svg" fill="none">
            <defs>
              <linearGradient id="lxHomeSchoolA" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="lxHomeSchoolB" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.65" />
              </linearGradient>
            </defs>
            <circle cx="148" cy="28" r="14" fill="#fbbf24" fillOpacity="0.9" className="lx-home-hero__shape lx-home-hero__shape--c" />
            <ellipse cx="40" cy="36" rx="18" ry="8" fill="#fff" fillOpacity="0.55" />
            <ellipse cx="70" cy="28" rx="14" ry="6" fill="#fff" fillOpacity="0.4" />
            <rect x="48" y="48" width="78" height="58" rx="8" fill="url(#lxHomeSchoolA)" className="lx-home-hero__shape lx-home-hero__shape--a" />
            <path d="M38 54 L87 24 L136 54" stroke="url(#lxHomeSchoolB)" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" fill="none" className="lx-home-hero__shape lx-home-hero__shape--b" />
            <rect x="78" y="78" width="20" height="28" rx="3" fill="#fff" fillOpacity="0.6" />
            <rect x="58" y="60" width="14" height="12" rx="2" fill="#fff" fillOpacity="0.5" />
            <rect x="102" y="60" width="14" height="12" rx="2" fill="#fff" fillOpacity="0.5" />
            <circle cx="28" cy="92" r="12" fill="#34d399" fillOpacity="0.55" />
            <rect x="26" y="100" width="4" height="14" rx="1" fill="#0f766e" fillOpacity="0.45" />
            <circle cx="156" cy="96" r="11" fill="#34d399" fillOpacity="0.5" />
            <rect x="154" y="104" width="4" height="12" rx="1" fill="#0f766e" fillOpacity="0.4" />
            <path d="M16 116h148" stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="lx-home-hero__blob lx-home-hero__blob--1" />
          <div className="lx-home-hero__blob lx-home-hero__blob--2" />
        </div>
      </div>
    </section>
  );
}
