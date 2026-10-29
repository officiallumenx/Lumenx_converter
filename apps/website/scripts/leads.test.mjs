import assert from "node:assert/strict";
import { parseLegacyLead, leadToDeliveryPayload, LEAD_INTENTS } from "../src/utils/leads.js";
import {
  deliverLeadMessage,
  hasDeliveryProvider,
  DELIVERY_INBOX,
} from "../src/utils/lead-delivery.js";
import { validateEnquiry } from "../src/utils/enquiry.js";

function test(name, fn) {
  try {
    fn();
    console.log("  ok ", name);
  } catch (error) {
    console.error("  FAIL", name, error.message);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log("  ok ", name);
  } catch (error) {
    console.error("  FAIL", name, error.message);
    process.exitCode = 1;
  }
}

console.log("Legacy leads + delivery");

test("parses valid legacy lead", () => {
  const r = parseLegacyLead({
    name: "Asha",
    email: "asha@school.edu",
    intent: "question",
    message: "Please erase my marketing enquiry.",
    institute: "Green Valley",
    role: "Parent",
    phone: "9876543210",
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.intent, "question");
  assert.ok(LEAD_INTENTS.includes(r.data.intent));
});

test("rejects missing intent/email", () => {
  const r = parseLegacyLead({ name: "Asha", email: "bad", intent: "nope", message: "x" });
  assert.equal(r.ok, false);
});

test("honeypot short-circuits", () => {
  const r = parseLegacyLead({
    name: "Bot",
    email: "bot@example.com",
    intent: "demo",
    message: "spam",
    company_website: "https://spam.example",
  });
  assert.equal(r.ok, true);
  assert.equal(r.honeypot, true);
});

test("maps lead to delivery payload", () => {
  const r = parseLegacyLead({
    name: "Asha",
    email: "asha@school.edu",
    intent: "demo",
    message: "Need a walkthrough",
    institute: "GV",
  });
  const d = leadToDeliveryPayload(r.data);
  assert.equal(d.type, "demo");
  assert.match(d.subjectOverride, /Book a demo/);
});

test("hasDeliveryProvider false when empty", () => {
  assert.equal(hasDeliveryProvider({}), false);
  assert.equal(hasDeliveryProvider({ WEB3FORMS_ACCESS_KEY: "  " }), false);
});

await testAsync("not_configured when secrets missing", async () => {
  const result = await deliverLeadMessage(
    {},
    {
      type: "question",
      name: "Asha",
      email: "asha@school.edu",
      description: "Hello there",
      submittedAt: new Date().toISOString(),
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "not_configured");
  assert.match(result.error, new RegExp(DELIVERY_INBOX));
});

await testAsync("web3forms success path", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ success: true }),
  });
  const result = await deliverLeadMessage(
    { WEB3FORMS_ACCESS_KEY: "test-key-not-real" },
    {
      type: "question",
      name: "Asha",
      email: "asha@school.edu",
      description: "Hello there",
      submittedAt: new Date().toISOString(),
    },
    { fetchImpl },
  );
  assert.equal(result.ok, true);
  assert.equal(result.provider, "web3forms");
});

await testAsync("does not fake success on provider failure", async () => {
  const fetchImpl = async () => ({
    ok: false,
    json: async () => ({ success: false }),
  });
  const result = await deliverLeadMessage(
    { WEB3FORMS_ACCESS_KEY: "test-key-not-real" },
    {
      type: "question",
      name: "Asha",
      email: "asha@school.edu",
      description: "Hello there",
      submittedAt: new Date().toISOString(),
    },
    { fetchImpl },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "delivery_failed");
});

test("enquiry honeypot still ok", () => {
  const r = validateEnquiry({
    type: "question",
    name: "Bot",
    mobile: "9876543210",
    email: "bot@example.com",
    description: "Spam message here",
    companyWebsite: "https://spam.example",
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.honeypot, true);
});

if (!process.exitCode) {
  console.log("\nResults: leads/delivery tests passed");
}
