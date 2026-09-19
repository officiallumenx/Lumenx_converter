import { isApiAuthMode } from "@/auth/auth-mode";
import { getActivityApiInstituteId } from "../context";
import {
  getSportsV2ApiSnapshot,
  resetSportsV2ApiStore,
  sportsV2ApiStore,
} from "../sports-v2-api-store";
import { mapVenueDto } from "../sports-v2-map";
import {
  archiveVenueInStore,
  cancelBookingInStore,
  clearVenueMaintenanceInStore,
  createVenueInStore,
  getVenueAvailabilityFromStore,
  getVenueByIdFromStore,
  getVenueCalendarMarksFromStore,
  listBookingsFromStore,
  listVenuesFromStore,
  reserveVenueInStore,
  resetSportsVenuesStore,
  setVenueMaintenanceInStore,
  updateVenueInStore,
} from "./store";
import type {
  CalendarActivityMark,
  SportsVenue,
  SportsVenueInput,
  VenueAvailabilitySlot,
  VenueBooking,
  VenueBookingInput,
  VenueListFilters,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const sportsVenuesRepository = {
  async listVenues(filters?: VenueListFilters): Promise<SportsVenue[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listVenues();
      return rows.filter((venue) => {
        if (
          filters?.venueType &&
          filters.venueType !== "all" &&
          venue.venueType !== filters.venueType
        )
          return false;
        if (filters?.status && filters.status !== "all" && venue.status !== filters.status)
          return false;
        const query = filters?.query?.trim().toLowerCase();
        return (
          !query ||
          `${venue.name} ${venue.location} ${venue.description}`.toLowerCase().includes(query)
        );
      });
    }
    await delay();
    return listVenuesFromStore(filters);
  },
  getVenuesSnapshot(): SportsVenue[] {
    if (isApiAuthMode()) return getSportsV2ApiSnapshot().venues.map(mapVenueDto);
    return listVenuesFromStore();
  },
  async getVenueById(id: string): Promise<SportsVenue | null> {
    if (isApiAuthMode()) {
      return (await sportsV2ApiStore.listVenues()).find((venue) => venue.id === id) ?? null;
    }
    await delay(120);
    return getVenueByIdFromStore(id);
  },
  async createVenue(input: SportsVenueInput): Promise<SportsVenue> {
    if (isApiAuthMode()) {
      const instituteId = getActivityApiInstituteId();
      if (!instituteId) throw new Error("Activity API context is not configured");
      return mapVenueDto(
        await sportsV2ApiStore.createVenue({
          instituteId,
          name: input.name,
          venueType: input.venueType,
          locationNotes: input.location,
          capacity: input.capacity,
          status: "active",
        }),
      );
    }
    await delay(280);
    return createVenueInStore(input);
  },
  async updateVenue(id: string, patch: Partial<SportsVenueInput>): Promise<SportsVenue> {
    if (isApiAuthMode()) {
      return mapVenueDto(
        await sportsV2ApiStore.updateVenue(id, {
          name: patch.name,
          venueType: patch.venueType,
          locationNotes: patch.location,
          capacity: patch.capacity,
        }),
      );
    }
    await delay(280);
    return updateVenueInStore(id, patch);
  },
  async archiveVenue(id: string): Promise<SportsVenue> {
    if (isApiAuthMode()) {
      return mapVenueDto(await sportsV2ApiStore.updateVenue(id, { status: "archived" }));
    }
    await delay(220);
    return archiveVenueInStore(id);
  },
  async setMaintenance(id: string, notes?: string): Promise<SportsVenue> {
    if (isApiAuthMode()) throw new Error("Venue maintenance is not supported by the activity API");
    await delay(220);
    return setVenueMaintenanceInStore(id, notes);
  },
  async clearMaintenance(id: string): Promise<SportsVenue> {
    if (isApiAuthMode()) throw new Error("Venue maintenance is not supported by the activity API");
    await delay(220);
    return clearVenueMaintenanceInStore(id);
  },
  async reserveVenue(input: VenueBookingInput): Promise<VenueBooking> {
    if (isApiAuthMode()) throw new Error("Venue bookings are not supported by the activity API");
    await delay(300);
    return reserveVenueInStore(input);
  },
  async cancelBooking(id: string): Promise<VenueBooking> {
    if (isApiAuthMode()) throw new Error("Venue bookings are not supported by the activity API");
    await delay(220);
    return cancelBookingInStore(id);
  },
  listBookings(venueId?: string): VenueBooking[] {
    if (isApiAuthMode()) throw new Error("Venue bookings are not supported by the activity API");
    return listBookingsFromStore(venueId, "reserved");
  },
  listAllBookings(): VenueBooking[] {
    if (isApiAuthMode()) throw new Error("Venue bookings are not supported by the activity API");
    return listBookingsFromStore();
  },
  getAvailability(venueId: string, date: string): VenueAvailabilitySlot[] {
    if (isApiAuthMode()) throw new Error("Venue bookings are not supported by the activity API");
    return getVenueAvailabilityFromStore(venueId, date);
  },
  async getCalendarMarks(): Promise<CalendarActivityMark[]> {
    if (isApiAuthMode())
      throw new Error("Venue booking calendar is not supported by the activity API");
    await delay(80);
    return getVenueCalendarMarksFromStore();
  },
  reset() {
    if (isApiAuthMode()) {
      resetSportsV2ApiStore();
      return;
    }
    resetSportsVenuesStore();
  },
};
