import { useEffect, useState } from "react";
import { DEMO_STUDENT } from "@/content/demos";
import type { DemoPriority } from "@/content/demos";
import { DemoNotice, DemoPhone, DemoScene, DemoStepper } from "./DemoUI";

type Step = {
  id: string;
  label: string;
  eta: string;
  driver: string;
  parentTitle: string;
  parentBody: string;
  priority: DemoPriority;
  boarded: number;
  status: string;
};

const STEPS: Step[] = [
  {
    id: "trip",
    label: "Trip",
    eta: "~42 min",
    driver: "Morning trip started · 18 students · 7 stops",
    parentTitle: "Trip started",
    parentBody: `${DEMO_STUDENT.bus} is on ${DEMO_STUDENT.route} · ${DEMO_STUDENT.routeName}.`,
    priority: "important",
    boarded: 0,
    status: "en route",
  },
  {
    id: "m30",
    label: "30 min",
    eta: "~30 min",
    driver: "Approaching pickup window",
    parentTitle: "Bus approaching in 30 minutes",
    parentBody: `${DEMO_STUDENT.name}: stop ${DEMO_STUDENT.stop} · ETA ~30 min · ${DEMO_STUDENT.bus} (en route) · ${DEMO_STUDENT.route}.`,
    priority: "normal",
    boarded: 0,
    status: "en route",
  },
  {
    id: "m15",
    label: "15 min",
    eta: "~15 min",
    driver: "Next stop in 15 minutes",
    parentTitle: "Bus approaching in 15 minutes",
    parentBody: `${DEMO_STUDENT.name}: stop ${DEMO_STUDENT.stop} · ETA ~15 min · ${DEMO_STUDENT.bus} (en route) · ${DEMO_STUDENT.route}.`,
    priority: "normal",
    boarded: 0,
    status: "en route",
  },
  {
    id: "m5",
    label: "5 min",
    eta: "~5 min",
    driver: "Arriving soon at Agara gate",
    parentTitle: "Bus approaching in 5 minutes",
    parentBody: `${DEMO_STUDENT.name}: stop ${DEMO_STUDENT.stop} · ETA ~5 min · ${DEMO_STUDENT.bus} (en route) · ${DEMO_STUDENT.route}.`,
    priority: "important",
    boarded: 0,
    status: "en route",
  },
  {
    id: "arrive",
    label: "Arrival",
    eta: "At stop",
    driver: "At Agara gate · start boarding",
    parentTitle: "Boarding started",
    parentBody: `${DEMO_STUDENT.bus} started boarding attendance on ${DEMO_STUDENT.route}.`,
    priority: "normal",
    boarded: 0,
    status: "at stop",
  },
  {
    id: "board",
    label: "Boarding",
    eta: "At stop",
    driver: "Aanya boarded · 12 / 18",
    parentTitle: "Student boarded",
    parentBody: `${DEMO_STUDENT.name} boarded at ${DEMO_STUDENT.stop} on ${DEMO_STUDENT.bus}.`,
    priority: "important",
    boarded: 12,
    status: "boarding",
  },
  {
    id: "school",
    label: "School",
    eta: "At school",
    driver: "Reached school · morning drop complete",
    parentTitle: "Reached school",
    parentBody: `${DEMO_STUDENT.bus} reached school on ${DEMO_STUDENT.route}.`,
    priority: "important",
    boarded: 18,
    status: "at school",
  },
];

export function TransportDemo() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = STEPS[index];

  useEffect(() => {
    if (!playing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPlaying(false);
      return;
    }
    if (index >= STEPS.length - 1) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setIndex((i) => Math.min(STEPS.length - 1, i + 1)), 1400);
    return () => window.clearTimeout(t);
  }, [playing, index]);

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Parent alerts follow trip status — 30, 15, then 5 minutes, arrival, boarding, school. This is not a live GPS
        map. Afternoon drop uses the same boarding marks at the home stop.
      </p>
      <DemoStepper
        steps={STEPS}
        index={index}
        onIndex={(i) => {
          setPlaying(false);
          setIndex(i);
        }}
        onReset={() => {
          setPlaying(false);
          setIndex(0);
        }}
        playable
        playing={playing}
        onTogglePlay={() => setPlaying((v) => !v)}
      />
      <div className="mt-6">
        <DemoScene bridged>
          <DemoPhone product="transport" title="Driver · Transport">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Morning · {DEMO_STUDENT.route}
            </p>
            <p className="mt-1 text-base font-semibold">{DEMO_STUDENT.routeName}</p>
            <p className="mt-2 text-sm text-muted-foreground">{step.driver}</p>
            <p className="mt-3 font-mono text-sm tabular-nums">
              Boarded {step.boarded} / 18 · {step.status}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">ETA {step.eta}</p>
          </DemoPhone>
          <DemoPhone product="connect" title="Parent · Connect">
            <p className="text-sm font-medium">{DEMO_STUDENT.name} · {DEMO_STUDENT.stop}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {DEMO_STUDENT.bus} · {step.status}
            </p>
            <div className="mt-3">
              <DemoNotice
                key={step.id}
                title={step.parentTitle}
                body={step.parentBody}
                priority={step.priority}
                category="transport"
                href="/transport"
              />
            </div>
          </DemoPhone>
        </DemoScene>
      </div>
    </div>
  );
}
