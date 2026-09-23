import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  deliverWebsiteLead,
  leadEmailText,
  leadSubject,
  parseWebsiteLeadPayload,
  LEAD_INBOX_EMAIL,
} from "./lead-mail";

describe("parseWebsiteLeadPayload", () => {
  it("accepts a valid demo lead", () => {
    const lead = parseWebsiteLeadPayload({
      name: "Ada",
      email: "ada@school.edu",
      phone: "9876543210",
      institute: "Demo High",
      role: "Principal",
      studentCount: "400",
      message: "Please book a walkthrough",
      intent: "demo",
    });
    expect(lead?.intent).toBe("demo");
    expect(lead?.name).toBe("Ada");
  });

  it("rejects missing email or intent", () => {
    expect(
      parseWebsiteLeadPayload({ name: "Ada", email: "not-an-email", intent: "demo" }),
    ).toBeNull();
    expect(
      parseWebsiteLeadPayload({ name: "Ada", email: "ada@school.edu", intent: "nope" }),
    ).toBeNull();
  });
});

describe("lead email formatting", () => {
  it("builds subject and body", () => {
    const lead = {
      name: "Ada",
      email: "ada@school.edu",
      phone: "9876543210",
      institute: "Demo High",
      role: "Principal",
      studentCount: "400",
      message: "Hello",
      intent: "demo" as const,
      submittedAt: "2026-09-23T00:00:00.000Z",
    };
    expect(leadSubject(lead)).toContain("Book a demo");
    expect(leadSubject(lead)).toContain("Demo High");
    expect(leadEmailText(lead)).toContain("ada@school.edu");
    expect(leadEmailText(lead)).toContain("Hello");
  });
});

describe("deliverWebsiteLead", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Resend when configured", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await deliverWebsiteLead(
      {
        RESEND_API_KEY: "re_test",
        LEAD_EMAIL_FROM: "leads@lumenx.app",
        LEAD_EMAIL_TO: LEAD_INBOX_EMAIL,
      },
      {
        name: "Ada",
        email: "ada@school.edu",
        phone: "",
        institute: "",
        role: "",
        studentCount: "",
        message: "Hi",
        intent: "demo",
      },
    );

    expect(result).toEqual({ ok: true, provider: "resend" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falls back to FormSubmit when Resend is absent", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: "true" }), { status: 200 }),
    );

    const result = await deliverWebsiteLead(
      {},
      {
        name: "Ada",
        email: "ada@school.edu",
        phone: "1",
        institute: "X",
        role: "",
        studentCount: "",
        message: "Hi",
        intent: "demo",
      },
      { origin: "https://www.lumenx.app", pageUrl: "https://www.lumenx.app/contact" },
    );

    expect(result).toEqual({ ok: true, provider: "formsubmit" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `formsubmit.co/ajax/${encodeURIComponent(LEAD_INBOX_EMAIL)}`,
    );
  });

  it("surfaces FormSubmit activation instead of fake success", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: "false",
          message: "This form needs Activation. We've sent you an email.",
        }),
        { status: 200 },
      ),
    );

    const result = await deliverWebsiteLead(
      {},
      {
        name: "Ada",
        email: "ada@school.edu",
        phone: "1",
        institute: "X",
        role: "",
        studentCount: "",
        message: "Hi",
        intent: "demo",
      },
      { origin: "https://www.lumenx.app" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.needsActivation).toBe(true);
      expect(result.error).toMatch(/Activate Form/i);
    }
  });
});
