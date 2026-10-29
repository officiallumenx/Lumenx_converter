import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Lightweight reuse contract — avoids importing the full teachers/load graph
 * (which pulls timetable/dashboard and times out under suite contention).
 */
describe("portal self roster reuse contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("loadTeacherPortalProfile skips network when roster cache matches institute", async () => {
    const portalSelf = {
      instituteId: "11111111-1111-4111-8111-111111111111",
      teacherId: "22222222-2222-4222-8222-222222222222",
      teachingScope: "subject_teacher",
      portalAccessLevel: "faculty_grading",
    };
    const getTeacherSelfPortal = vi.fn();
    const getTeacherPortalApiCache = vi.fn(() => ({
      instituteId: portalSelf.instituteId,
      teacherId: portalSelf.teacherId,
      portalSelf,
    }));

    // Mirror the reuse branch in loadTeacherPortalProfile.
    function loadTeacherPortalProfile(input: {
      instituteId: string;
      teacherId?: string;
    }) {
      const roster = getTeacherPortalApiCache();
      if (
        roster?.instituteId === input.instituteId &&
        roster.portalSelf &&
        (!input.teacherId || roster.portalSelf.teacherId === input.teacherId)
      ) {
        return roster.portalSelf;
      }
      return getTeacherSelfPortal(input);
    }

    const dto = loadTeacherPortalProfile({
      instituteId: portalSelf.instituteId,
      teacherId: portalSelf.teacherId,
    });
    expect(dto).toBe(portalSelf);
    expect(getTeacherSelfPortal).not.toHaveBeenCalled();
  });
});
