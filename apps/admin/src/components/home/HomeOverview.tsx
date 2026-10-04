import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Users, GraduationCap, Heart, CalendarOff, ChevronRight } from "lucide-react";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function AnimatedNumber({ value }: { value: number }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const prev = useRef(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const to = value;
    prev.current = to;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const duration = 420;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return <>{display.toLocaleString()}</>;
}

const CELLS: Array<{
  key: "students" | "teachers" | "parents" | "pendingLeave";
  label: string;
  icon: typeof Users;
  accent: string;
  contextKey: "year" | "connected" | "none";
  to: "/students" | "/teachers" | "/parents" | "/leave";
}> = [
  {
    key: "students",
    label: "Students",
    icon: Users,
    accent: "lx-home-kpi--students",
    contextKey: "year",
    to: "/students",
  },
  {
    key: "teachers",
    label: "Teachers",
    icon: GraduationCap,
    accent: "lx-home-kpi--teachers",
    contextKey: "year",
    to: "/teachers",
  },
  {
    key: "parents",
    label: "Parents",
    icon: Heart,
    accent: "lx-home-kpi--parents",
    contextKey: "connected",
    to: "/parents",
  },
  {
    key: "pendingLeave",
    label: "Pending leave",
    icon: CalendarOff,
    accent: "lx-home-kpi--leave",
    contextKey: "none",
    to: "/leave",
  },
];

export function HomeOverview({
  summary,
  loading,
  activeYearLabel,
}: {
  summary: {
    students: number;
    teachers: number;
    parents: number;
    pendingLeave: number;
  } | null;
  loading?: boolean;
  /** Real active academic year label — only used when present. */
  activeYearLabel?: string | null;
}) {
  if (loading && !summary) {
    return (
      <section className="lx-home-section lx-home-panel lx-home-overview" style={{ "--lx-home-i": 2 } as CSSProperties}>
        <div className="lx-home-panel__head">
          <h2 className="lx-home-panel__title">Institute Overview</h2>
        </div>
        <div className="lx-home-kpi-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[4.75rem] rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="lx-home-section lx-home-panel lx-home-overview" style={{ "--lx-home-i": 2 } as CSSProperties}>
        <div className="lx-home-panel__head">
          <h2 className="lx-home-panel__title">Institute Overview</h2>
        </div>
        <div className="lx-home-kpi-grid">
          {CELLS.map((cell) => {
            const Icon = cell.icon;
            return (
              <Link
                key={cell.key}
                to={cell.to}
                className={`lx-home-kpi ${cell.accent}`}
                aria-label={`Open ${cell.label}`}
              >
                <div className="lx-home-kpi__top">
                  <span className="lx-home-kpi__icon" aria-hidden>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="lx-home-kpi__label">{cell.label}</span>
                  <ChevronRight className="lx-home-kpi__chevron size-3.5 shrink-0" aria-hidden />
                </div>
                <p className="lx-home-kpi__value">0</p>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="lx-home-section lx-home-panel lx-home-overview" style={{ "--lx-home-i": 2 } as CSSProperties}>
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title">Institute Overview</h2>
        <Link to="/students" className="lx-home-panel__link">
          View all →
        </Link>
      </div>
      <div className="lx-home-kpi-grid">
        {CELLS.map((cell) => {
          const Icon = cell.icon;
          const value = summary[cell.key];
          let context: string | null = null;
          if (cell.contextKey === "year" && activeYearLabel) {
            context = "Active this year";
          } else if (cell.contextKey === "connected" && value > 0) {
            context = "Connected";
          }
          return (
            <Link
              key={cell.key}
              to={cell.to}
              className={`lx-home-kpi ${cell.accent}`}
              aria-label={`Open ${cell.label}`}
            >
              <div className="lx-home-kpi__top">
                <span className="lx-home-kpi__icon" aria-hidden>
                  <Icon className="size-3.5" />
                </span>
                <span className="lx-home-kpi__label">{cell.label}</span>
                <ChevronRight className="lx-home-kpi__chevron size-3.5 shrink-0" aria-hidden />
              </div>
              <p className="lx-home-kpi__value">
                <AnimatedNumber value={value} />
              </p>
              {context ? (
                <p className="lx-home-kpi__context">
                  <span className="lx-home-kpi__dot" aria-hidden />
                  {context}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
