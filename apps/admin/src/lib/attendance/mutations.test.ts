import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const YEAR = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CLASS = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SECTION = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CONFIG = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const ENROLL = "11111111-1111-4111-8111-111111111111";

describe("attendance mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create config in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createAttendanceConfig } = await import("./mutations");
    await expect(
      createAttendanceConfig({
        instituteId: INST,
        effectiveFrom: "2025-04-01",
        method: "daily",
        owner: "class_teacher",
        scope: "institute",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid register UUID on submit", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { submitAttendanceRegister } = await import("./mutations");
    await expect(submitAttendanceRegister("not-a-uuid", client)).rejects.toThrow(
      /UUID/,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("posts create config payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: CONFIG });
    const client = { post } as never;
    const { createAttendanceConfig } = await import("./mutations");
    await createAttendanceConfig(
      {
        instituteId: INST,
        effectiveFrom: "2025-04-01",
        method: "daily",
        owner: "class_teacher",
        scope: "institute",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/attendance/config",
      expect.objectContaining({
        institute_id: INST,
        effective_from: "2025-04-01",
        method: "daily",
      }),
    );
  });

  it("patches register in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: REG });
    const client = { patch } as never;
    const { updateAttendanceRegister } = await import("./mutations");
    await updateAttendanceRegister(
      REG,
      {
        slotLabel: "Morning",
        marks: [{ enrollmentId: ENROLL, status: "present" }],
      },
      client,
    );
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/attendance/registers/${REG}`,
      expect.objectContaining({
        slot_label: "Morning",
        marks: [{ enrollment_id: ENROLL, status: "present" }],
      }),
    );
  });

  it("posts create register payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: REG });
    const client = { post } as never;
    const { createAttendanceRegister } = await import("./mutations");
    await createAttendanceRegister(
      {
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        configVersionId: CONFIG,
        attendanceDate: "2025-04-02",
        slotKind: "day",
        slotCode: "day",
        slotLabel: "Full day",
        marks: [{ enrollmentId: ENROLL, status: "present" }],
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/attendance/registers",
      expect.objectContaining({
        institute_id: INST,
        section_id: SECTION,
        slot_kind: "day",
      }),
    );
  });
});
