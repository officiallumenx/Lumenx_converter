import { useEffect, useState, type CSSProperties } from "react";
import { CalendarDays } from "lucide-react";
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
  });
}

export function HomeHero({
  attentionCount,
  hasCritical,
}: {
  attentionCount: number;
  hasCritical: boolean;
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
        : "You're all set for today";

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
          {greeting}, <span className="lx-home-hero__name">{name}</span>
        </h2>
        <p className="lx-home-hero__sub">{statusLabel}</p>
        <p className="lx-home-hero__date-pill">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          <time dateTime={now.toISOString()}>{formatHeroDate(now)}</time>
        </p>
      </div>
      <div className="lx-home-hero__art" aria-hidden>
        <svg viewBox="0 0 160 120" className="lx-home-hero__svg" fill="none">
          <defs>
            <linearGradient id="lxHomeSchoolA" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="lxHomeSchoolB" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {/* Sun */}
          <circle
            cx="128"
            cy="28"
            r="12"
            fill="#fbbf24"
            fillOpacity="0.85"
            className="lx-home-hero__shape lx-home-hero__shape--c"
          />
          {/* Main building */}
          <rect
            x="42"
            y="42"
            width="70"
            height="52"
            rx="6"
            fill="url(#lxHomeSchoolA)"
            className="lx-home-hero__shape lx-home-hero__shape--a"
          />
          {/* Roof */}
          <path
            d="M34 48 L77 22 L120 48"
            stroke="url(#lxHomeSchoolB)"
            strokeWidth="8"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            className="lx-home-hero__shape lx-home-hero__shape--b"
          />
          {/* Door */}
          <rect x="68" y="70" width="18" height="24" rx="3" fill="#fff" fillOpacity="0.55" />
          {/* Windows */}
          <rect x="52" y="54" width="12" height="10" rx="2" fill="#fff" fillOpacity="0.45" />
          <rect x="90" y="54" width="12" height="10" rx="2" fill="#fff" fillOpacity="0.45" />
          {/* Trees */}
          <circle cx="28" cy="78" r="10" fill="#34d399" fillOpacity="0.55" />
          <rect x="26" y="84" width="4" height="12" rx="1" fill="#0f766e" fillOpacity="0.45" />
          <circle cx="138" cy="82" r="9" fill="#34d399" fillOpacity="0.45" />
          <rect x="136" y="88" width="4" height="10" rx="1" fill="#0f766e" fillOpacity="0.4" />
          {/* Ground */}
          <path
            d="M18 98h124"
            stroke="#94a3b8"
            strokeOpacity="0.35"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="lx-home-hero__blob lx-home-hero__blob--1" />
        <div className="lx-home-hero__blob lx-home-hero__blob--2" />
      </div>
    </section>
  );
}
