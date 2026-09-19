import { describe, expect, it } from "vitest";
import { findProfileByEmailOrPhone } from "../src/domains/access-roles/repository.js";
import { canonicalPhoneDigits } from "../src/domains/identity/phone.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

describe("canonical phone identity", () => {
  it("matches database last-ten-digit normalization", () => {
    expect(canonicalPhoneDigits("+91 98765-43210")).toBe("9876543210");
    expect(canonicalPhoneDigits("9876543210")).toBe("9876543210");
    expect(canonicalPhoneDigits("12345")).toBeNull();
  });

  it("uses phone_digits for formatted backend lookups", async () => {
    const db = emptyMockDb();
    db.user_profile.push({
      id: "11111111-1111-4111-8111-111111111111",
      email: null,
      phone: "+91 98765 43210",
      phone_digits: "9876543210",
      display_name: "Canonical User",
      status: "active",
      deleted_at: null,
    });
    const admin = createMockSupabaseClients({ tokens: {}, db }).admin;

    const profile = await findProfileByEmailOrPhone(admin, {
      phone: "(98765) 43210",
    });

    expect(profile?.display_name).toBe("Canonical User");
  });
});
