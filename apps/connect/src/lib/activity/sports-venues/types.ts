import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";

export type VenueType =
  | "indoor"
  | "outdoor_ground"
  | "swimming_pool"
  | "court"
  | "track"
  | "auditorium";

export type VenueStatus = "available" | "maintenance" | "archived";

export type VenueBookingStatus = "reserved" | "cancelled" | "completed";

export interface SportsVenue {
  id: string;
  name: string;
  venueType: VenueType;
  location: string;
  capacity: number;
  status: VenueStatus;
  equipmentAvailable: string[];
  maintenanceNotes?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueBooking {
  id: string;
  venueId: string;
  venueName: string;
  venueType: VenueType;
  date: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
  purpose: string;
  expectedAttendees: number;
  status: VenueBookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SportsVenueInput {
  name: string;
  venueType: VenueType;
  location: string;
  capacity: number;
  equipmentAvailable: string[];
  description: string;
  maintenanceNotes?: string;
}

export interface VenueBookingInput {
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
  purpose: string;
  expectedAttendees: number;
}

export type VenueSortField = "name" | "capacity" | "updatedAt";

export interface VenueListFilters {
  query?: string;
  venueType?: VenueType | "all";
  status?: VenueStatus | "all";
  sortBy?: VenueSortField;
  sortDir?: "asc" | "desc";
}

export interface VenueAvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  bookingId: string;
  purpose: string;
  status: VenueBookingStatus;
}

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  indoor: "Indoor Venue",
  outdoor_ground: "Outdoor Ground",
  swimming_pool: "Swimming Pool",
  court: "Court",
  track: "Track",
  auditorium: "Auditorium",
};

export const VENUE_STATUS_LABELS: Record<VenueStatus, string> = {
  available: "Available",
  maintenance: "Under Maintenance",
  archived: "Archived",
};

export const BOOKING_STATUS_LABELS: Record<VenueBookingStatus, string> = {
  reserved: "Reserved",
  cancelled: "Cancelled",
  completed: "Completed",
};

export type { CalendarActivityMark };
