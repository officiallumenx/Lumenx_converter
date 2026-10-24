import { describe, expect, it } from "vitest";
import type { MessageRecipientDto } from "./types";
import {
  dedupeRecipientsByUserId,
  filterRecipients,
  mergeRecipientSelections,
  resolveClassSectionAudience,
  selectAllFiltered,
  toggleRecipientSelection,
  uniqueClassLabels,
  uniqueSectionLabels,
} from "./recipient-targeting";

const r = (
  partial: Partial<MessageRecipientDto> &
    Pick<MessageRecipientDto, "userId" | "displayName" | "role">,
): MessageRecipientDto => ({
  classLabel: null,
  sectionLabel: null,
  ...partial,
});

describe("message recipient targeting", () => {
  const catalog = [
    r({ userId: "t1", displayName: "Ada", role: "teacher" }),
    r({
      userId: "s1",
      displayName: "Sam",
      role: "student",
      classLabel: "10",
      sectionLabel: "A",
      linkedParentUserIds: ["p1"],
    }),
    r({
      userId: "s2",
      displayName: "Sue",
      role: "student",
      classLabel: "10",
      sectionLabel: "B",
      linkedParentUserIds: ["p2"],
    }),
    r({ userId: "p1", displayName: "Pat", role: "parent" }),
    r({ userId: "p2", displayName: "Pam", role: "parent" }),
  ];

  it("dedupes by user id across individual and class selections", () => {
    expect(
      dedupeRecipientsByUserId([catalog[1]!, catalog[1]!, catalog[2]!]).map(
        (x) => x.userId,
      ),
    ).toEqual(["s1", "s2"]);
    expect(
      mergeRecipientSelections([catalog[1]!], [catalog[1]!, catalog[3]!]).map(
        (x) => x.userId,
      ),
    ).toEqual(["s1", "p1"]);
  });

  it("filters by audience, class, and section", () => {
    expect(
      filterRecipients({
        recipients: catalog,
        query: "",
        audience: "student",
        classLabel: "10",
        sectionLabel: "A",
      }).map((x) => x.userId),
    ).toEqual(["s1"]);
    expect(
      filterRecipients({
        recipients: catalog,
        query: "ada",
        audience: "all",
      }).map((x) => x.userId),
    ).toEqual(["t1"]);
  });

  it("resolves parents via linked students when filtering by class", () => {
    expect(
      filterRecipients({
        recipients: catalog,
        query: "",
        audience: "parent",
        classLabel: "10",
        sectionLabel: "A",
      }).map((x) => x.userId),
    ).toEqual(["p1"]);
  });

  it("resolves multi class/section with explicit audience type", () => {
    expect(
      resolveClassSectionAudience({
        recipients: catalog,
        selections: [
          { classLabel: "10", sectionLabel: "A" },
          { classLabel: "10", sectionLabel: "B" },
        ],
        audience: "student",
      }).map((x) => x.userId),
    ).toEqual(["s1", "s2"]);
    expect(
      resolveClassSectionAudience({
        recipients: catalog,
        selections: [{ classLabel: "10" }],
        audience: "parent",
      }).map((x) => x.userId),
    ).toEqual(["p1", "p2"]);
  });

  it("lists class/section options and supports select-all / toggle", () => {
    expect(uniqueClassLabels(catalog)).toEqual(["10"]);
    expect(uniqueSectionLabels(catalog, "10")).toEqual(["A", "B"]);
    const selected = toggleRecipientSelection([], catalog[0]!);
    expect(toggleRecipientSelection(selected, catalog[0]!)).toEqual([]);
    expect(
      selectAllFiltered([], [catalog[1]!, catalog[2]!]).map((x) => x.userId),
    ).toEqual(["s1", "s2"]);
  });
});
