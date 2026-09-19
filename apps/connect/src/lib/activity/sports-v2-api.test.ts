import { beforeEach, describe, expect, it, vi } from "vitest";

const instituteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const venueId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
});

describe("sports v2 API clients", () => {
  it("lists and creates venues at the backend sports-v2 paths", async () => {
    const venue = {
      id: venueId,
      instituteId,
      name: "Main Ground",
      venueType: "outdoor_ground",
      locationNotes: "North campus",
      capacity: 200,
      status: "active" as const,
      createdByUserId: "user-1",
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    };
    const get = vi.fn().mockResolvedValue([venue]);
    const post = vi.fn().mockResolvedValue(venue);
    vi.doMock("@/lib/connect-api", () => ({
      getConnectApiClient: () => ({ get, post, patch: vi.fn(), delete: vi.fn() }),
    }));

    const api = await import("./api");
    await expect(api.listVenues(instituteId)).resolves.toEqual([venue]);
    expect(get).toHaveBeenCalledWith(`/api/v1/activity/venues?institute_id=${instituteId}`);

    await api.createVenue({
      instituteId,
      name: venue.name,
      venueType: venue.venueType,
      locationNotes: venue.locationNotes,
      capacity: venue.capacity,
      status: "active",
    });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/activity/venues",
      expect.objectContaining({
        institute_id: instituteId,
        venue_type: "outdoor_ground",
      }),
    );
  });
});

describe("sports v2 API mode repositories", () => {
  it("does not expose venue or equipment seeds", async () => {
    const get = vi.fn().mockResolvedValue([]);
    vi.doMock("@/lib/connect-api", () => ({
      getConnectApiClient: () => ({ get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() }),
    }));
    const { setActivityApiContext } = await import("./context");
    setActivityApiContext({ instituteId });

    const venues = await import("./sports-venues/store");
    const equipment = await import("./sports-equipment/store");
    expect(venues.listVenuesFromStore()).toEqual([]);
    expect(equipment.listEquipmentFromStore()).toEqual([]);
  });

  it("throws for writes with no backend equivalent", async () => {
    const get = vi.fn().mockResolvedValue([]);
    vi.doMock("@/lib/connect-api", () => ({
      getConnectApiClient: () => ({ get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() }),
    }));
    const { sportsVenuesRepository } = await import("./sports-venues/repositories");
    const { sportsEquipmentRepository } = await import("./sports-equipment/repositories");

    await expect(
      sportsVenuesRepository.reserveVenue({
        venueId,
        date: "2026-09-17",
        startTime: "10:00",
        endTime: "11:00",
        bookedBy: "Team A",
        purpose: "Practice",
        expectedAttendees: 20,
      }),
    ).rejects.toThrow("not supported");

    await expect(
      sportsEquipmentRepository.issueEquipment("equipment-1", {
        quantity: 1,
        issuedTo: "Team A",
        issuedToType: "team",
      }),
    ).rejects.toThrow("not supported");
  });
});
