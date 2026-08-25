/**
 * Connect transport chrome only (ETA simulation defaults when no Driver trip).
 * Bus / route / stop / roster / assignment / trip / SOS → @lumenx/utils bridges.
 */

import type { TransportAlert, TransportTracking } from "./types";

export const SCHOOL_STOP = {
  id: "RST-SCHOOL",
  name: "LumenX Academy",
  address: "School Main Gate",
  scheduledTime: "07:45",
  order: 99,
} as const;

export const initialTracking: TransportTracking = {
  phase: "morning_pickup",
  runStatus: "scheduled",
  learnerStatus: "awaiting_pickup",
  currentStopIndex: 0,
  progressPercent: 0,
  etaMinutes: 32,
  nextStopName: "Pickup stop",
  lastUpdated: "Just now",
  delayMinutes: 0,
  lat: 28.6139,
  lng: 77.209,
  sharedTripActive: false,
  emergencyActive: false,
  emergencyLabel: null,
};

/** Template alerts — runtime alerts come from shared workflow + simulation fallback. */
export const seedTransportAlerts: TransportAlert[] = [
  {
    id: "seed-alert-1",
    type: "eta_10min",
    title: "Bus on the way",
    message: "Your bus is approaching. Live status updates from Transport Operations.",
    time: "Just now",
    read: false,
  },
];
