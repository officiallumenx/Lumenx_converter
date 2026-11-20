import assert from "node:assert/strict";
import { validateEnquiry, ENQUIRY_TYPES } from "../src/utils/enquiry.js";

function test(name, fn) {
  try {
    fn();
    console.log("  ok ", name);
  } catch (error) {
    console.error("  FAIL", name, error.message);
    process.exitCode = 1;
  }
}

console.log("Enquiry validation");
test("accepts question", () => {
  const r = validateEnquiry({
    type: "question",
    name: "Asha",
    mobile: "9876543210",
    email: "asha@school.edu",
    description: "How does Connect attendance work?",
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.type, "question");
  assert.ok(r.data.submittedAt);
});

test("accepts demo with separate mobile and phone", () => {
  const r = validateEnquiry({
    type: "demo",
    name: "Ravi",
    instituteName: "Green Valley School",
    mobile: "+91 98765 43210",
    phone: "08012345678",
    email: "ravi@school.edu",
    description: "Need a walkthrough for Admin fees.",
  });
  assert.equal(r.ok, true);
});

test("accepts custom application with Other type", () => {
  const r = validateEnquiry({
    type: "custom_application",
    name: "Meera",
    instituteName: "Skill Hub",
    instituteType: "Other",
    instituteTypeOther: "Vocational academy",
    phone: "9988776655",
    email: "meera@hub.in",
    description: "Looking for a custom admissions workflow.",
  });
  assert.equal(r.ok, true);
});

test("rejects invalid email and short description", () => {
  const r = validateEnquiry({
    type: "question",
    name: "A",
    mobile: "9876543210",
    email: "not-an-email",
    description: "Hi",
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.email);
  assert.ok(r.errors.description);
});

test("rejects demo without institute or phone", () => {
  const r = validateEnquiry({
    type: "demo",
    name: "Ravi",
    mobile: "9876543210",
    email: "ravi@school.edu",
    description: "Please schedule a demo soon.",
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.instituteName);
  assert.ok(r.errors.phone);
});

test("honeypot short-circuits as ok", () => {
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

test("known enquiry types", () => {
  assert.deepEqual(ENQUIRY_TYPES, ["question", "demo", "custom_application"]);
});

if (!process.exitCode) {
  console.log("\nResults: enquiry tests passed");
}
