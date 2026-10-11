import { beforeEach, describe, expect, it, vi } from "vitest";

describe("downloadStudentBulkImportTemplate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("dynamically imports exceljs only when building a template", async () => {
    const writeBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const addWorksheet = vi.fn(() => {
      const cells = new Map<string, Record<string, unknown>>();
      return {
        addRow: vi.fn(),
        getRow: vi.fn(() => ({ font: {}, commit: vi.fn() })),
        getCell: vi.fn((addr: string) => {
          const cell = cells.get(addr) ?? {};
          cells.set(addr, cell);
          return cell;
        }),
        getColumn: vi.fn(() => ({ width: 0 })),
        views: [],
      };
    });
    const Workbook = vi.fn(function Workbook(this: {
      creator?: string;
      created?: Date;
      addWorksheet: typeof addWorksheet;
      xlsx: { writeBuffer: typeof writeBuffer };
    }) {
      this.addWorksheet = addWorksheet;
      this.xlsx = { writeBuffer };
    });

    vi.doMock("exceljs", () => ({ default: { Workbook } }));
    vi.doMock("@/lib/student-directory-store", () => ({
      STUDENT_CSV_HEADERS: [
        "first_name",
        "surname",
        "gender",
        "class",
        "section",
      ],
      STUDENT_IMPORT_SAMPLE_ROW: ["Ada", "Lovelace", "Female", "10", "A"],
    }));

    const click = vi.fn();
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        href: "",
        download: "",
        click,
      })),
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:template"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      "Blob",
      class {
        constructor(public parts: unknown[], public options?: unknown) {}
      },
    );

    const { downloadStudentBulkImportTemplate } = await import(
      "./bulk-import-template"
    );
    await downloadStudentBulkImportTemplate({
      instituteName: "Demo",
      classOptions: [{ classLabel: "10", sectionLabels: ["A"] }],
      dataRows: 20,
    });

    expect(Workbook).toHaveBeenCalledTimes(1);
    expect(writeBuffer).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
