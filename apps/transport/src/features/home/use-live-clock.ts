import { useEffect, useState } from "react";

export type LiveClock = {
  dateLabel: string;
  dayLabel: string;
  timeLabel: string;
};

function formatClock(now: Date): LiveClock {
  return {
    dateLabel: now.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    dayLabel: now.toLocaleDateString(undefined, { weekday: "long" }),
    timeLabel: now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

/** Ticks every minute for Home date/time display. */
export function useLiveClock(): LiveClock {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return clock;
}
