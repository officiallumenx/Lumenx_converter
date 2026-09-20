import { describe, expect, it } from "vitest";
import {
  buildConnectLoginModePayload,
  buildConnectReturningLoginPayload,
} from "./api-auth";

const instituteId = "11111111-1111-4111-8111-111111111111";

describe("Connect passwordless auth payloads", () => {
  it("builds the login-mode contract", () => {
    expect(
      buildConnectLoginModePayload({
        institute_id: instituteId,
        phone: "9876543210",
        role: "parent",
      }),
    ).toEqual({
      institute_id: instituteId,
      phone: "9876543210",
      role: "parent",
    });
  });

  it("sends only PIN credentials for returning login", () => {
    expect(
      buildConnectReturningLoginPayload({
        institute_id: instituteId,
        phone: "9876543210",
        role: "teacher",
        pin: "4826",
      }),
    ).toEqual({
      institute_id: instituteId,
      phone: "9876543210",
      role: "teacher",
      pin: "4826",
    });
  });
});
