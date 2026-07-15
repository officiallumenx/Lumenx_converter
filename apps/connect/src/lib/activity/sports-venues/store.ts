import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { cloneVenue, createVenueFromInput, venuesSeed } from "./mock";
import type {
  SportsVenue,
  SportsVenueInput,
  VenueAvailabilitySlot,
  VenueBooking,
  VenueBookingInput,
  VenueBookingStatus,
  VenueListFilters,
} from "./types";

let venuesStore: SportsVenue[] = venuesSeed.map(cloneVenue);

const bookingsSeed: VenueBooking[] = [
  {
    id: "vbk-1",
    venueId: "venue-1",
    venueName: "Main Football Ground",
    venueType: "outdoor_ground",
    date: new Date().toISOString().slice(0, 10),
    startTime: "15:00",
    endTime: "17:00",
    bookedBy: "Senior Football Team",
    purpose: "League practice",
    expectedAttendees: 22,
    status: "reserved",
    createdAt: "2026-03-07",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  {
    id: "vbk-2",
    venueId: "venue-3",
    venueName: "Olympic Swimming Pool",
    venueType: "swimming_pool",
    date: new Date().toISOString().slice(0, 10),
    startTime: "07:00",
    endTime: "08:30",
    bookedBy: "Rahul Menon",
    purpose: "Swimming team morning session",
    expectedAttendees: 18,
    status: "reserved",
    createdAt: "2026-03-06",
    updatedAt: "2026-03-06",
  },
  {
    id: "vbk-3",
    venueId: "venue-2",
    venueName: "Indoor Sports Hall",
    venueType: "indoor",
    date: "2026-03-10",
    startTime: "16:00",
    endTime: "18:00",
    bookedBy: "Kabaddi Team",
    purpose: "Inter-house preparation",
    expectedAttendees: 15,
    status: "reserved",
    createdAt: "2026-03-05",
    updatedAt: "2026-03-05",
  },
  {
    id: "vbk-4",
    venueId: "venue-6",
    venueName: "Basketball Court A",
    venueType: "court",
    date: "2026-03-12",
    startTime: "17:00",
    endTime: "19:00",
    bookedBy: "Basketball Team",
    purpose: "Friendly match",
    expectedAttendees: 30,
    status: "reserved",
    createdAt: "2026-03-04",
    updatedAt: "2026-03-04",
  },
  {
    id: "vbk-5",
    venueId: "venue-7",
    venueName: "Central Auditorium",
    venueType: "auditorium",
    date: "2026-03-15",
    startTime: "10:00",
    endTime: "12:00",
    bookedBy: "Sports Coordinator",
    purpose: "Annual sports awards ceremony",
    expectedAttendees: 400,
    status: "reserved",
    createdAt: "2026-02-28",
    updatedAt: "2026-02-28",
  },
];

let bookingsStore: VenueBooking[] = [...bookingsSeed];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function findVenue(id: string): SportsVenue {
  const v = venuesStore.find((x) => x.id === id);
  if (!v) throw new Error("Venue not found");
  if (v.status === "archived") throw new Error("Archived venues cannot be modified.");
  return v;
}

function applyVenueFilters(items: SportsVenue[], filters?: VenueListFilters): SportsVenue[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.venueType && f.venueType !== "all") {
    result = result.filter((v) => v.venueType === f.venueType);
  }
  if (f.status && f.status !== "all") {
    result = result.filter((v) => v.status === f.status);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "name";
  const dir = (f.sortDir ?? "asc") === "asc" ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === "capacity") return dir * (a.capacity - b.capacity);
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.name.localeCompare(b.name);
  });

  return result;
}

export function resetSportsVenuesStore() {
  venuesStore = venuesSeed.map(cloneVenue);
  bookingsStore = [...bookingsSeed];
}

export function listVenuesFromStore(filters?: VenueListFilters): SportsVenue[] {
  return applyVenueFilters(venuesStore, filters).map(cloneVenue);
}

export function getVenueByIdFromStore(id: string): SportsVenue | null {
  const found = venuesStore.find((v) => v.id === id);
  return found ? cloneVenue(found) : null;
}

export function listBookingsFromStore(venueId?: string, status?: VenueBookingStatus): VenueBooking[] {
  let result = [...bookingsStore];
  if (venueId) result = result.filter((b) => b.venueId === venueId);
  if (status) result = result.filter((b) => b.status === status);
  return result.sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
}

export function createVenueInStore(input: SportsVenueInput): SportsVenue {
  const record = createVenueFromInput(input);
  venuesStore = [record, ...venuesStore];
  return cloneVenue(record);
}

export function updateVenueInStore(id: string, patch: Partial<SportsVenueInput>): SportsVenue {
  const idx = venuesStore.findIndex((v) => v.id === id);
  if (idx < 0) throw new Error("Venue not found");
  const prev = venuesStore[idx];
  if (prev.status === "archived") throw new Error("Archived venues cannot be edited.");

  const updated = cloneVenue({
    ...prev,
    name: patch.name?.trim() ?? prev.name,
    venueType: patch.venueType ?? prev.venueType,
    location: patch.location?.trim() ?? prev.location,
    capacity: patch.capacity ?? prev.capacity,
    equipmentAvailable: patch.equipmentAvailable ?? prev.equipmentAvailable,
    description: patch.description?.trim() ?? prev.description,
    maintenanceNotes: patch.maintenanceNotes?.trim() ?? prev.maintenanceNotes,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  venuesStore = venuesStore.map((v) => (v.id === id ? updated : v));
  return cloneVenue(updated);
}

export function archiveVenueInStore(id: string): SportsVenue {
  const idx = venuesStore.findIndex((v) => v.id === id);
  if (idx < 0) throw new Error("Venue not found");
  const archived = cloneVenue({
    ...venuesStore[idx],
    status: "archived",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  venuesStore = venuesStore.map((v) => (v.id === id ? archived : v));
  return cloneVenue(archived);
}

export function setVenueMaintenanceInStore(id: string, notes?: string): SportsVenue {
  const idx = venuesStore.findIndex((v) => v.id === id);
  if (idx < 0) throw new Error("Venue not found");
  const updated = cloneVenue({
    ...venuesStore[idx],
    status: "maintenance",
    maintenanceNotes: notes?.trim() || "Scheduled maintenance",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  venuesStore = venuesStore.map((v) => (v.id === id ? updated : v));
  return cloneVenue(updated);
}

export function clearVenueMaintenanceInStore(id: string): SportsVenue {
  const idx = venuesStore.findIndex((v) => v.id === id);
  if (idx < 0) throw new Error("Venue not found");
  const updated = cloneVenue({
    ...venuesStore[idx],
    status: "available",
    maintenanceNotes: undefined,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  venuesStore = venuesStore.map((v) => (v.id === id ? updated : v));
  return cloneVenue(updated);
}

export function reserveVenueInStore(input: VenueBookingInput): VenueBooking {
  const venue = findVenue(input.venueId);
  if (venue.status === "maintenance") {
    throw new Error("Venue is under maintenance and cannot be booked.");
  }
  if (input.expectedAttendees > venue.capacity) {
    throw new Error(`Booking exceeds venue capacity (${venue.capacity}).`);
  }

  const clash = bookingsStore.find(
    (b) =>
      b.venueId === input.venueId &&
      b.date === input.date &&
      b.status === "reserved" &&
      timesOverlap(b.startTime, b.endTime, input.startTime, input.endTime),
  );
  if (clash) throw new Error("Time slot conflicts with an existing reservation.");

  const now = new Date().toISOString().slice(0, 10);
  const booking: VenueBooking = {
    id: `vbk-${Date.now()}`,
    venueId: venue.id,
    venueName: venue.name,
    venueType: venue.venueType,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    bookedBy: input.bookedBy.trim(),
    purpose: input.purpose.trim(),
    expectedAttendees: input.expectedAttendees,
    status: "reserved",
    createdAt: now,
    updatedAt: now,
  };
  bookingsStore = [booking, ...bookingsStore];
  return { ...booking };
}

export function cancelBookingInStore(id: string): VenueBooking {
  const idx = bookingsStore.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Booking not found");
  if (bookingsStore[idx].status === "cancelled") {
    throw new Error("Booking is already cancelled.");
  }
  const cancelled: VenueBooking = {
    ...bookingsStore[idx],
    status: "cancelled",
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  bookingsStore = bookingsStore.map((b) => (b.id === id ? cancelled : b));
  return { ...cancelled };
}

export function getVenueAvailabilityFromStore(venueId: string, date: string): VenueAvailabilitySlot[] {
  return bookingsStore
    .filter((b) => b.venueId === venueId && b.date === date && b.status === "reserved")
    .map((b) => ({
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      bookingId: b.id,
      purpose: b.purpose,
      status: b.status,
    }));
}

export function getVenueCalendarMarksFromStore(): CalendarActivityMark[] {
  const counts = new Map<string, number>();
  for (const b of bookingsStore) {
    if (b.status !== "reserved") continue;
    counts.set(b.date, (counts.get(b.date) ?? 0) + 1);
  }
  const today = new Date().toISOString().slice(0, 10);
  return [...counts.entries()]
    .map(([date, count]) => ({
      date,
      count,
      highlight: date === today,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
