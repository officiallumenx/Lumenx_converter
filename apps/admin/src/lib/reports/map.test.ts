import { describe, expect, it } from "vitest";
import {
  catalogById,
  filterCatalogByModule,
  formatReportJobWhen,
  latestJobByReportId,
  listReportModules,
  resolveReportName,
  sortJobsNewestFirst,
} from "./map";
import type { ReportDefinitionDto, ReportJobDto } from "./types";

const catalog: ReportDefinitionDto[] = [
  { id: "students", name: "Students", module: "Students", generationSupported: true },
  { id: "attendance", name: "Attendance", module: "Attendance", generationSupported: true },
  { id: "transport", name: "Transport", module: "Transport", generationSupported: false },
];

describe("reports map", () => {
  it("filters catalog by module", () => {
    expect(filterCatalogByModule(catalog, "all")).toHaveLength(3);
    expect(filterCatalogByModule(catalog, "Attendance")).toHaveLength(1);
  });

  it("lists unique modules", () => {
    expect(listReportModules(catalog)).toEqual([
      "Attendance",
      "Students",
      "Transport",
    ]);
  });

  it("resolves report names from catalog", () => {
    expect(resolveReportName("students", catalog)).toBe("Students");
    expect(resolveReportName("missing", catalog)).toBe("missing");
  });

  it("sorts jobs newest first", () => {
    const jobs: ReportJobDto[] = [
      {
        id: "1",
        instituteId: "x",
        reportId: "students",
        status: "ready",
        downloadUrl: null,
        fileName: null,
        errorMessage: null,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        completedAt: null,
      },
      {
        id: "2",
        instituteId: "x",
        reportId: "attendance",
        status: "ready",
        downloadUrl: null,
        fileName: null,
        errorMessage: null,
        createdAt: "2026-08-02T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
        completedAt: null,
      },
    ];
    expect(sortJobsNewestFirst(jobs).map((job) => job.id)).toEqual(["2", "1"]);
  });

  it("formats job timestamps", () => {
    expect(formatReportJobWhen("2026-08-15T10:30:00.000Z")).toMatch(/Aug/);
  });

  it("builds catalog lookup map", () => {
    expect(catalogById(catalog).get("transport")?.module).toBe("Transport");
  });

  it("picks newest job per report id", () => {
    const jobs: ReportJobDto[] = [
      {
        id: "old",
        instituteId: "x",
        reportId: "students",
        status: "ready",
        downloadUrl: null,
        fileName: "old.csv",
        errorMessage: null,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        completedAt: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "new",
        instituteId: "x",
        reportId: "students",
        status: "ready",
        downloadUrl: null,
        fileName: "new.csv",
        errorMessage: null,
        createdAt: "2026-08-03T00:00:00.000Z",
        updatedAt: "2026-08-03T00:00:00.000Z",
        completedAt: "2026-08-03T00:00:00.000Z",
      },
      {
        id: "att",
        instituteId: "x",
        reportId: "attendance",
        status: "running",
        downloadUrl: null,
        fileName: null,
        errorMessage: null,
        createdAt: "2026-08-02T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
        completedAt: null,
      },
    ];
    const latest = latestJobByReportId(jobs);
    expect(latest.get("students")?.id).toBe("new");
    expect(latest.get("attendance")?.status).toBe("running");
  });
});
