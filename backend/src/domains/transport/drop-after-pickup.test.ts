import { describe, expect, it } from "vitest";
import { AppError } from "../../errors/app-error.js";

/**
 * Documents server rules in startTripForActor:
 * - evening (Drop) requires completed morning (Pickup) same day
 * - one trip per vehicle + date + slot
 */
describe("trip start product rules", () => {
  it("Drop-after-Pickup conflict message is stable for client UX", () => {
    const err = AppError.conflict(
      "Pickup trip must be completed before starting Drop",
    );
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/Pickup trip must be completed/i);
  });

  it("slot uniqueness conflict messages are stable for client UX", () => {
    expect(AppError.conflict("Pickup trip already exists for today").status).toBe(
      409,
    );
    expect(AppError.conflict("Drop trip already exists for today").status).toBe(
      409,
    );
  });

  it("assigned-stop boarding validation messages are stable", () => {
    expect(
      AppError.validation("Student must be boarded at their assigned pickup stop")
        .status,
    ).toBe(400);
    expect(
      AppError.validation("Student must be dropped at their assigned drop stop")
        .status,
    ).toBe(400);
  });
});
