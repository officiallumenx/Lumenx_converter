import { test } from "@playwright/test";
import {
  evaluateDocsCertsLiveGate,
  liveGateSkipMessage,
} from "./docs-certs/live-gate";

/**
 * Future real-integration suite (PPTX upload/publish/archive, Admin dual-read, etc.).
 * Always skips unless explicit opt-in env proves a non-production local target.
 * Never creates, mutates, or deletes production data from this file as written.
 */
test.describe("Platform templates live integration (gated)", () => {
  test("prerequisites — skip until local non-prod target is explicitly configured", async () => {
    const gate = evaluateDocsCertsLiveGate();
    test.skip(!gate.ok, liveGateSkipMessage(gate));

    // Gate passed in this process, but Phase 2 intentionally ships no live write steps.
    test.skip(
      true,
      "Live write steps are intentionally not implemented in Phase 2 (await schema/bucket/accounts on a verified local DB)",
    );
  });
});
