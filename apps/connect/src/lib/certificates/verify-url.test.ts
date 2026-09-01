import { describe, it, expect } from "vitest";
import { buildCertificateVerifyUrl, parseCertificateVerifyUrl } from "./verify-url";

describe("certificate verify url", () => {
  it("builds and parses verify links", () => {
    const url = buildCertificateVerifyUrl(
      "https://connect.example.com",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "CERT/2026/0001",
    );
    expect(url).toContain("/verify-certificate?");
    const parsed = parseCertificateVerifyUrl(url);
    expect(parsed).toEqual({
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      certificateNumber: "CERT/2026/0001",
    });
  });
});
