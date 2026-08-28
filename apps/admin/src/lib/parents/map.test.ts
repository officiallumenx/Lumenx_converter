import { describe, expect, it } from "vitest";
import {
  activeLinks,
  linkedChildrenLabel,
  parentDtoToListItem,
  parentDtosToListItems,
  parentIdentityLabel,
  primaryRelationshipLabel,
  relationshipToLabel,
} from "./map";
import type { ParentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ParentDto> = {}): ParentDto {
  return {
    id: "ba111111-1111-4111-8111-111111111111",
    instituteId: INST,
    userProfileId: null,
    legacyCode: "PAR-2201",
    name: "Rohan Sharma",
    phone: "9876512345",
    email: "rohan@kin.io",
    address: "14 Lake View Road",
    inviteStatus: "active",
    accessStatus: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    links: [
      {
        id: "link-1",
        studentId: "ac111111-1111-4111-8111-111111111111",
        parentId: "ba111111-1111-4111-8111-111111111111",
        relationship: "father",
        isPrimary: true,
        isEmergencyContact: true,
        status: "active",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("parents DTO mapping", () => {
  it("maps core parent fields and active links", () => {
    const item = parentDtoToListItem(dto());
    expect(item.name).toBe("Rohan Sharma");
    expect(item.relationship).toBe("Father");
    expect(item.inviteStatus).toBe("active");
    expect(item.accessStatus).toBe("active");
    expect(item.linkedChildrenCount).toBe(1);
    expect(item.linkedChildrenLabel).toBe("1 linked child");
    expect(item.linkedStudentIds).toEqual([
      "ac111111-1111-4111-8111-111111111111",
    ]);
    expect(item.identityLabel).toBe("PAR-2201");
  });

  it("falls back name when blank", () => {
    const item = parentDtoToListItem(dto({ name: "   " }));
    expect(item.name).toBe("Guardian");
  });

  it("maps relationship helpers and identity label", () => {
    expect(relationshipToLabel("mother")).toBe("Mother");
    expect(primaryRelationshipLabel(undefined)).toBe("Guardian");
    expect(
      parentIdentityLabel(
        dto({ legacyCode: null, id: "ba111111-1111-4111-8111-111111111111" }),
      ),
    ).toBe("ba111111");
  });

  it("ignores inactive links and handles sparse fields", () => {
    const item = parentDtoToListItem(
      dto({
        email: null,
        address: null,
        links: [
          {
            id: "link-inactive",
            studentId: "ac222222-2222-4222-8222-222222222222",
            parentId: "ba111111-1111-4111-8111-111111111111",
            relationship: "guardian",
            isPrimary: false,
            isEmergencyContact: false,
            status: "inactive",
            createdAt: "2026-06-01T10:00:00Z",
            updatedAt: "2026-06-01T10:00:00Z",
          },
        ],
      }),
    );
    expect(item.linkedChildrenCount).toBe(0);
    expect(item.linkedChildrenLabel).toBe("No linked children");
    expect(item.email).toBe("");
    expect(item.address).toBe("");
    expect(item.password).toBe("");
  });

  it("linkedChildrenLabel handles pluralization", () => {
    expect(linkedChildrenLabel(0)).toBe("No linked children");
    expect(linkedChildrenLabel(2)).toBe("2 linked children");
  });

  it("activeLinks filters inactive guardian links", () => {
    const links = dto().links ?? [];
    expect(activeLinks(links)).toHaveLength(1);
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = parentDtosToListItems([dto(), dto({ id: "p-2" })]);
    expect(items).toHaveLength(2);
    expect(() => parentDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
