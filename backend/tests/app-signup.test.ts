import { describe, expect, it } from "vitest";
import { completeAppSignup } from "../src/domains/auth-credentials/app-signup.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

describe("app signup (Supabase-only)", () => {
  it("rejects invalid account type for app", async () => {
    const clients = createMockSupabaseClients({ db: emptyMockDb(), tokens: {} });
    await expect(
      completeAppSignup(clients.admin, {
        app: "admissions",
        accountType: "job_seeker",
        email: "person@example.com",
        password: "NewPassword123!",
        displayName: "Person",
        phone: "9876543210",
        verificationGrants: ["a".repeat(32)],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects short passwords before provisioning", async () => {
    const clients = createMockSupabaseClients({ db: emptyMockDb(), tokens: {} });
    await expect(
      completeAppSignup(clients.admin, {
        app: "careers",
        accountType: "job_seeker",
        email: "person@example.com",
        password: "short",
        displayName: "Person",
        phone: "9876543210",
        verificationGrants: ["a".repeat(32)],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
