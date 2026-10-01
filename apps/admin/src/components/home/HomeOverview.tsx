import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Users, GraduationCap, Heart, CalendarOff } from "lucide-react";

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
}> = [
  { key: "students", label: "Students", icon: Users, accent: "lx-home-kpi--students" },
  { key: "teachers", label: "Teachers", icon: GraduationCap, accent: "lx-home-kpi--teachers" },
  { key: "parents", label: "Parents", icon: Heart, accent: "lx-home-kpi--parents" },
  { key: "pendingLeave", label: "Pending leave", icon: CalendarOff, accent: "lx-home-kpi--leave" },
];

export function HomeOverview({
  summary,
  loading,
}: {
  summary: {
    students: number;
    teachers: number;
    parents: number;
    pendingLeave: number;
  } | null;
  loading?: boolean;
}) {
  if (loading && !summary) {
    return (
      <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 3 } as CSSProperties}>
        <div className="lx-home-panel__head">
          <h2 className="lx-home-panel__title">Institute overview</h2>
        </div>
        <div className="lx-home-kpi-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[4.5rem] rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!summary) return null;

  return (
    <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 3 } as CSSProperties}>
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title">Institute overview</h2>
        <p className="lx-home-panel__hint">Live operational counts</p>
      </div>
      <div className="lx-home-kpi-grid">
        {CELLS.map((cell) => {
          const Icon = cell.icon;
          const value = summary[cell.key];
          return (
            <div key={cell.key} className={`lx-home-kpi ${cell.accent}`}>
              <div className="lx-home-kpi__top">
                <span className="lx-home-kpi__label">{cell.label}</span>
                <span className="lx-home-kpi__icon" aria-hidden>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className="lx-home-kpi__value">
                <AnimatedNumber value={value} />
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
