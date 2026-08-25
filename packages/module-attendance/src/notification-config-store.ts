import type {
  AttendanceNotificationConfig,
  AttendanceNotificationRecipient,
  AttendanceNotificationTiming,
  AttendanceNotificationTrigger,
} from "./notification-types";

export const ATTENDANCE_NOTIFICATION_CONFIG_KEY =
  "lumenx.attendance-notification-config.v1";

const SUPPORTED_TRIGGERS: readonly AttendanceNotificationTrigger[] = [
  "daily_absence",
  "period_absence",
];

const DEFAULT_CONFIG: AttendanceNotificationConfig = {
  timing: "immediate",
  triggers: ["daily_absence", "period_absence"],
  recipients: ["parent"],
  updatedAt: "2026-04-01T00:00:00.000Z",
  updatedBy: "System",
};

let memoryConfig: AttendanceNotificationConfig | null = null;

function isSupportedTrigger(value: string): value is AttendanceNotificationTrigger {
  return (SUPPORTED_TRIGGERS as readonly string[]).includes(value);
}

function normalize(
  row: Partial<AttendanceNotificationConfig> | null | undefined,
): AttendanceNotificationConfig {
  const timing = (row?.timing ?? DEFAULT_CONFIG.timing) as AttendanceNotificationTiming;
  const rawTriggers = Array.isArray(row?.triggers) ? row.triggers : DEFAULT_CONFIG.triggers;
  // Drop unsupported legacy triggers (late_entry / early_exit).
  const triggers = [
    ...new Set(rawTriggers.filter((t): t is AttendanceNotificationTrigger => isSupportedTrigger(t))),
  ];
  const recipients = Array.isArray(row?.recipients)
    ? ([...new Set(row.recipients)] as AttendanceNotificationRecipient[])
    : [...DEFAULT_CONFIG.recipients];
  return {
    timing:
      timing === "immediate" || timing === "daily_summary" || timing === "no_notification"
        ? timing
        : "immediate",
    triggers: triggers.length ? triggers : [...DEFAULT_CONFIG.triggers],
    recipients,
    updatedAt: row?.updatedAt ?? new Date().toISOString(),
    updatedBy: row?.updatedBy ?? "Admin",
  };
}

export function loadAttendanceNotificationConfig(): AttendanceNotificationConfig {
  if (typeof localStorage === "undefined") {
    return normalize(memoryConfig ?? DEFAULT_CONFIG);
  }
  try {
    const raw = localStorage.getItem(ATTENDANCE_NOTIFICATION_CONFIG_KEY);
    if (!raw) {
      const seeded = normalize(DEFAULT_CONFIG);
      saveAttendanceNotificationConfig(seeded);
      return seeded;
    }
    return normalize(JSON.parse(raw) as AttendanceNotificationConfig);
  } catch {
    return normalize(DEFAULT_CONFIG);
  }
}

export function saveAttendanceNotificationConfig(
  input: Omit<AttendanceNotificationConfig, "updatedAt"> & {
    updatedAt?: string;
  },
): AttendanceNotificationConfig {
  const next = normalize({
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });
  memoryConfig = next;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(ATTENDANCE_NOTIFICATION_CONFIG_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function attendanceNotificationTimingLabel(
  timing: AttendanceNotificationTiming,
): string {
  if (timing === "immediate") return "Immediate";
  if (timing === "daily_summary") return "Daily Summary";
  return "Disabled";
}

export function attendanceNotificationTriggerLabel(
  trigger: AttendanceNotificationTrigger | string,
): string {
  switch (trigger) {
    case "daily_absence":
      return "Daily Absent";
    case "period_absence":
      return "Period Absent";
    default:
      return String(trigger);
  }
}
