import { beforeEach, describe, expect, it, vi } from "vitest";

describe("downloadAcademicYearRecordsExcel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads xlsx on demand and writes a workbook", async () => {
    const writeFile = vi.fn();
    const book_new = vi.fn(() => ({ sheets: [] as unknown[] }));
    const json_to_sheet = vi.fn(() => ({}));
    const book_append_sheet = vi.fn();
    vi.doMock("xlsx", () => ({
      utils: { book_new, json_to_sheet, book_append_sheet },
      writeFile,
    }));
    vi.doMock("@lumenx/utils", () => ({
      downloadTextToDevice: vi.fn(),
    }));

    const { downloadAcademicYearRecordsExcel } = await import(
      "./academic-year-exports"
    );
    const result = await downloadAcademicYearRecordsExcel("2025-26", [
      {
        name: "Ada",
        rollNo: "1",
        classLabel: "10",
        section: "A",
        status: "active",
      },
    ]);

    expect(result.filename).toBe("academic-year-2025-26.xlsx");
    expect(result.rowCount).toBe(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(book_new).toHaveBeenCalledTimes(1);
    expect(json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({
        Student: "Ada",
        "Class / section (year)": "10 · A",
        "Academic year": "2025-26",
      }),
    ]);
  });
});
