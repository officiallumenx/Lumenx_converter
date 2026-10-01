import type { CSSProperties } from "react";
import type { AttentionSeverity } from "@/lib/dashboard";

export function HomeHero({
  attentionCount,
  hasCritical,
}: {
  attentionCount: number;
  hasCritical: boolean;
}) {
  const statusLabel =
    hasCritical
      ? "Urgent items need your response"
      : attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`
        : "Operations look steady today";

  const statusTone: AttentionSeverity =
    hasCritical ? "critical" : attentionCount > 0 ? "attention" : "info";

  return (
    <section
      className={`lx-home-section lx-home-hero lx-home-hero--${statusTone}`}
      style={{ "--lx-home-i": 1 } as CSSProperties}
    >
      <div className="lx-home-hero__content">
        <p className="lx-home-hero__eyebrow">Command center</p>
        <h2 className="lx-home-hero__title">{statusLabel}</h2>
        <p className="lx-home-hero__sub">
          Focus on what needs a decision — then move through the rest of your day.
        </p>
      </div>
      <div className="lx-home-hero__art" aria-hidden>
        <svg viewBox="0 0 160 120" className="lx-home-hero__svg" fill="none">
          <defs>
            <linearGradient id="lxHomeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <rect x="18" y="28" width="52" height="64" rx="8" fill="url(#lxHomeGrad)" className="lx-home-hero__shape lx-home-hero__shape--a" />
          <path
            d="M78 36h46a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H78V36Z"
            fill="url(#lxHomeGrad)"
            className="lx-home-hero__shape lx-home-hero__shape--b"
          />
          <circle cx="48" cy="48" r="10" className="lx-home-hero__shape lx-home-hero__shape--c" fill="currentColor" fillOpacity="0.18" />
          <path
            d="M92 52h28M92 64h22M92 76h16"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="3"
            strokeLinecap="round"
            className="lx-home-hero__shape lx-home-hero__shape--d"
          />
          <path
            d="M28 86c10-14 26-14 36 0"
            stroke="currentColor"
            strokeOpacity="0.28"
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
