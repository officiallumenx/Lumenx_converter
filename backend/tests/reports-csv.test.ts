import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "../src/domains/reports/csv.js";

describe("report CSV safety", () => {
  it("quotes cells and doubles internal quotes", () => {
    expect(escapeCsvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe('"a","b"\n"1","2"\n');
  });

  it("neutralizes spreadsheet formula injection prefixes", () => {
    expect(escapeCsvCell("=CMD()")).toBe("\"'=CMD()\"");
    expect(escapeCsvCell("+123")).toBe("\"'+123\"");
    expect(escapeCsvCell("-SUM(A1)")).toBe("\"'-SUM(A1)\"");
    expect(escapeCsvCell("@import")).toBe("\"'@import\"");
  });

  it("leaves normal names unchanged aside from quoting", () => {
    expect(escapeCsvCell("Ada Lovelace")).toBe('"Ada Lovelace"');
    expect(escapeCsvCell("")).toBe('""');
    expect(escapeCsvCell(null)).toBe('""');
  });
});
