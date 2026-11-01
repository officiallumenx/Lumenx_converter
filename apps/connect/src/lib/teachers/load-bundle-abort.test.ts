import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  getTeacherSelfPortal: vi.fn(() => new Promise(() => {})),
  getLearnerFacultyPortal: vi.fn(),
}));

vi.mock("@/lib/timetable/load", () => ({
  loadTeacherTimetable: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/lib/dashboard", () => ({
  enrichTeacherDashboardSnapshot: vi.fn(),
}));

describe("loadTeacherPortalBundle abort", () => {
  it(
    "rejects immediately when the signal is already aborted",
    async () => {
      const { loadTeacherPortalBundle, loadTeacherPortalBase } = await import("./load");
      const ac = new AbortController();
      ac.abort();
      await expect(
        loadTeacherPortalBase({
          instituteId: "11111111-1111-4111-8111-111111111111",
          classes: [],
          signal: ac.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
      await expect(
        loadTeacherPortalBundle({
          instituteId: "11111111-1111-4111-8111-111111111111",
          classes: [],
          signal: ac.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
    },
    15_000,
  );
});
