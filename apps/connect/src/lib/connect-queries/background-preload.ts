import { scheduleIdle, type IdleCancel } from "./schedule-idle";

export type ConnectRole = "student" | "parent" | "teacher";

type PreloadSpec = {
  id: string;
  load: () => Promise<unknown>;
};

/**
 * Role-prioritized secondary module chunks. Auth/shell stay eager; these warm
 * after first usable content when the browser is idle.
 */
function preloadSpecsForRole(role: ConnectRole): PreloadSpec[] {
  const common: PreloadSpec[] = [
    {
      id: "diary",
      load: () => import("@/student-portal/features/diary"),
    },
    {
      id: "leave-parent",
      load: () => import("@/components/app/leave/ParentLeavePage"),
    },
  ];

  if (role === "teacher") {
    return [
      {
        id: "teacher-assignments",
        load: () => import("@/teacher-portal/features/assignments"),
      },
      {
        id: "teacher-diary",
        load: () => import("@/teacher-portal/features/diary"),
      },
      {
        id: "teacher-marks",
        load: () => import("@/teacher-portal/features/marks"),
      },
      {
        id: "teacher-leave",
        load: () => import("@/teacher-portal/features/leave"),
      },
      {
        id: "fees-page",
        load: () => import("@/lazy-pages/FeesPage"),
      },
      {
        id: "exams-page",
        load: () => import("@/lazy-pages/ExamsPage"),
      },
      ...common,
    ];
  }

  if (role === "parent") {
    return [
      {
        id: "fees-page",
        load: () => import("@/lazy-pages/FeesPage"),
      },
      {
        id: "parent-homework",
        load: () => import("@/components/app/homework/ParentHomeworkPage"),
      },
      {
        id: "growth-page",
        load: () => import("@/lazy-pages/GrowthPage"),
      },
      {
        id: "student-marks",
        load: () => import("@/student-portal/features/marks"),
      },
      ...common,
    ];
  }

  return [
    {
      id: "student-marks",
      load: () => import("@/student-portal/features/marks"),
    },
    {
      id: "fees-page",
      load: () => import("@/lazy-pages/FeesPage"),
    },
    {
      id: "academic-history",
      load: () => import("@/student-portal/features/academic-history"),
    },
    {
      id: "growth-page",
      load: () => import("@/lazy-pages/GrowthPage"),
    },
    ...common,
  ];
}

const started = new Set<string>();

/**
 * Progressively preload secondary route chunks for the active role.
 * Skips duplicate ids; cancel stops further idle work (in-flight imports finish).
 */
export function startConnectBackgroundPreload(role: ConnectRole): IdleCancel {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const connection = (
    nav as (Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }) | null
  )?.connection;
  if (connection?.saveData) {
    return () => undefined;
  }
  const effective = connection?.effectiveType;
  if (effective === "slow-2g" || effective === "2g") {
    return () => undefined;
  }

  const queue = preloadSpecsForRole(role).filter((s) => !started.has(s.id));
  let cancelled = false;
  let cancelIdle: IdleCancel | null = null;

  const pump = () => {
    if (cancelled) return;
    const next = queue.shift();
    if (!next) return;
    started.add(next.id);
    void next.load().catch(() => {
      started.delete(next.id);
    });
    if (queue.length > 0 && !cancelled) {
      cancelIdle = scheduleIdle(pump, 2000);
    }
  };

  if (queue.length > 0) {
    cancelIdle = scheduleIdle(pump, 1500);
  }

  return () => {
    cancelled = true;
    cancelIdle?.();
    queue.length = 0;
  };
}

/** Test helper — clears in-memory preload dedupe. */
export function resetConnectBackgroundPreloadDedupeForTests(): void {
  started.clear();
}
