import { describe, expect, it } from "vitest";
import { idCardViewFromStudentProfile } from "./admin-id-card-bridge";

describe("idCardViewFromStudentProfile", () => {
  it("maps API student fields and prefers signed photo URL", () => {
    const card = idCardViewFromStudentProfile({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Aanya Sharma",
      className: "10",
      section: "A",
      rollNo: "12",
      address: "12 Green Park",
      parentName: "Ravi Sharma",
      bloodGroup: "B+",
      emergencyContact: "9876543210",
      house: "Blue",
      issuedOn: "2024-06-01",
      validTill: "2025-05-31",
      institute: "LumenX Demo School",
      photoUrl: "https://example.com/signed.jpg",
    });
    expect(card.name).toBe("Aanya Sharma");
    expect(card.institute).toBe("LumenX Demo School");
    expect(card.photoDataUrl).toBe("https://example.com/signed.jpg");
    expect(card.fromAdmin).toBe(false);
    expect(card.initials).toBe("AS");
    expect(card.displayId).toBe("");
  });

  it("uses admission number as display id and hides uuid", () => {
    const card = idCardViewFromStudentProfile({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Aanya Sharma",
      className: "10",
      section: "A",
      rollNo: "12",
      admissionNumber: "ADM-2024-12",
    });
    expect(card.displayId).toBe("ADM-2024-12");
    expect(card.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
