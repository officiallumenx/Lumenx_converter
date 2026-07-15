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
    await delay();
    return listVenuesFromStore(filters);
  },
  getVenuesSnapshot(): SportsVenue[] {
    return listVenuesFromStore();
  },
  async getVenueById(id: string): Promise<SportsVenue | null> {
    await delay(120);
    return getVenueByIdFromStore(id);
  },
  async createVenue(input: SportsVenueInput): Promise<SportsVenue> {
    await delay(280);
    return createVenueInStore(input);
  },
  async updateVenue(id: string, patch: Partial<SportsVenueInput>): Promise<SportsVenue> {
    await delay(280);
    return updateVenueInStore(id, patch);
  },
  async archiveVenue(id: string): Promise<SportsVenue> {
    await delay(220);
    return archiveVenueInStore(id);
  },
  async setMaintenance(id: string, notes?: string): Promise<SportsVenue> {
    await delay(220);
    return setVenueMaintenanceInStore(id, notes);
  },
  async clearMaintenance(id: string): Promise<SportsVenue> {
    await delay(220);
    return clearVenueMaintenanceInStore(id);
  },
  async reserveVenue(input: VenueBookingInput): Promise<VenueBooking> {
    await delay(300);
    return reserveVenueInStore(input);
  },
  async cancelBooking(id: string): Promise<VenueBooking> {
    await delay(220);
    return cancelBookingInStore(id);
  },
  listBookings(venueId?: string): VenueBooking[] {
    return listBookingsFromStore(venueId, "reserved");
  },
  listAllBookings(): VenueBooking[] {
    return listBookingsFromStore();
  },
  getAvailability(venueId: string, date: string): VenueAvailabilitySlot[] {
    return getVenueAvailabilityFromStore(venueId, date);
  },
  async getCalendarMarks(): Promise<CalendarActivityMark[]> {
    await delay(80);
    return getVenueCalendarMarksFromStore();
  },
  reset() {
    resetSportsVenuesStore();
  },
};
