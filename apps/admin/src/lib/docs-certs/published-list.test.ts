import { describe, expect, it } from "vitest";
import {
  filterPublishedItems,
  sortPublishedItems,
  templateFilterOptions,
} from "./published-list";

const items = [
  {
    id: "a",
    studentName: "Zara",
    templateId: "t1",
    templateName: "Bonafide",
    documentNumber: "DOC/2026/0001",
    publishedAt: "2026-01-02T00:00:00.000Z",
    status: "published",
  },
  {
    id: "b",
    studentName: "Aanya",
    templateId: "t2",
    templateName: "TC",
    documentNumber: "DOC/2026/0002",
    publishedAt: "2026-02-01T00:00:00.000Z",
    status: "published",
  },
];

describe("docs-certs published list", () => {
  it("filters by template and query", () => {
    expect(filterPublishedItems(items, { templateId: "t1" }).map((i) => i.id)).toEqual([
      "a",
    ]);
    expect(filterPublishedItems(items, { query: "aanya" }).map((i) => i.id)).toEqual([
      "b",
    ]);
  });

  it("sorts newest first by default and by student", () => {
    expect(sortPublishedItems(items).map((i) => i.id)).toEqual(["b", "a"]);
    expect(sortPublishedItems(items, "student_asc").map((i) => i.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("builds template filter options from real templates", () => {
    expect(
      templateFilterOptions([
        { id: "2", name: "Zebra" },
        { id: "1", name: "Alpha" },
      ]),
    ).toEqual([
      { id: "1", name: "Alpha" },
      { id: "2", name: "Zebra" },
    ]);
  });
});
