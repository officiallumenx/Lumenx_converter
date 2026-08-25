import type { LumenXNotificationCategory } from "../types";
import type { NotificationAudience, NotificationFeature, RegisteredNotificationTemplate } from "./types";

const LEGACY_FEATURES: readonly NotificationFeature[] = [
  "admissions",
  "attendance",
  "fees",
  "transport",
  "events",
  "messages",
  "careers",
] as const;

export function isLegacyNotificationFeature(value: string): value is NotificationFeature {
  return (LEGACY_FEATURES as readonly string[]).includes(value);
}

/** Map registry category → legacy NotificationFeature for render compatibility. */
export function categoryToLegacyFeature(category: LumenXNotificationCategory): NotificationFeature {
  if (isLegacyNotificationFeature(category)) return category;
  switch (category) {
    case "homework":
    case "announcements":
    case "complaints":
    case "leave":
    case "timetable":
    case "certificates":
    case "documents":
      return "messages";
    case "exams":
      return "events";
    case "system":
    case "nexus":
      return "messages";
    default:
      return "messages";
  }
}

export function toLegacyAudience(
  audience: RegisteredNotificationTemplate["audience"],
): NotificationAudience {
  if (!audience || audience === "driver") return "institute";
  return audience;
}

export const DEFAULT_DEEP_LINK: Record<LumenXNotificationCategory, string> = {
  /** Connect attendance destination (Admin mark UI remains `/student-attendance`). */
  attendance: "/attendance",
  homework: "/homework",
  fees: "/fees",
  exams: "/exams",
  events: "/events",
  transport: "/transport",
  leave: "/leave",
  announcements: "/announcements",
  messages: "/notifications",
  complaints: "/complaints",
  admissions: "/admissions",
  careers: "/careers",
  certificates: "/certificates",
  documents: "/documents",
  timetable: "/timetable",
  system: "/notifications",
  nexus: "/notifications",
};
