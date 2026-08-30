import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const JOB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("reports api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createReportJob } = await import("./api");
    await expect(
      createReportJob({ instituteId: INST, reportId: "students" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { createReportJob } = await import("./api");
    await expect(
      createReportJob({ instituteId: "bad", reportId: "students" }, client),
    ).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts create and downloads with UUID validation", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({
      id: JOB,
      status: "ready",
      downloadUrl: `/api/v1/reports/jobs/${JOB}/download`,
    });
    const download = vi.fn().mockResolvedValue({
      blob: new Blob(["a,b\n"], { type: "text/csv" }),
      fileName: "students.csv",
      contentType: "text/csv",
    });
    const client = { post, download } as never;
    const { createReportJob, downloadReportJob } = await import("./api");
    await createReportJob({ instituteId: INST, reportId: "students" }, client);
    expect(post).toHaveBeenCalledWith(
      "/api/v1/reports/jobs",
      expect.objectContaining({
        institute_id: INST,
        report_id: "students",
      }),
    );
    await expect(downloadReportJob("bad", client)).rejects.toThrow(/UUID/);
    expect(download).not.toHaveBeenCalled();
    const file = await downloadReportJob(JOB, client);
    expect(download).toHaveBeenCalledWith(
      `/api/v1/reports/jobs/${JOB}/download`,
    );
    expect(file.fileName).toBe("students.csv");
  });
});
