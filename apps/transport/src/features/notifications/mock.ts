import { alertsRepository } from "@/lib/transport";

/** @deprecated Prefer `alertsRepository.getSnapshot()`. */
export const notificationsMock = alertsRepository.getSnapshot();

export type {
  TransportNotification,
  TransportNotificationKind,
} from "@/lib/transport/types";
