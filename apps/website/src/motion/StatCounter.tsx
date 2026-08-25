import { useEffect, useRef, useState } from "react";

export function StatCounter({
  to,
  duration = 650,
  format,
}: {
  to: number;
  duration?: number;
  format?: (value: number) => string;
}) {
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!document.documentElement.classList.contains("site-motion")) return;

    const belowFold = el.getBoundingClientRect().top > window.innerHeight * 0.55;
    if (!belowFold) return;

    setValue(0);
    let raf = 0;
    let start = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          setValue(Math.round(to * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  const label = format ? format(value) : String(value);
  return (
    <span ref={ref} className="tabular-nums">
      {label}
    </span>
  );
}
