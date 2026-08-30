import { beforeEach, describe, expect, it, vi } from "vitest";

const ENTRY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const YEAR = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CLASS = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SECTION = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const EXAM = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const SUBJECT = "11111111-1111-4111-8111-111111111111";
const TEACHER = "22222222-2222-4222-8222-222222222222";
const ENROLL = "33333333-3333-4333-8333-333333333333";

describe("marks mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createMarkEntry } = await import("./mutations");
    await expect(
      createMarkEntry({
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        examId: EXAM,
        subjectId: SUBJECT,
        maxMarks: 100,
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid entry UUID on publish", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { publishMarkEntry } = await import("./mutations");
    await expect(publishMarkEntry("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ENTRY });
    const client = { post } as never;
    const { createMarkEntry } = await import("./mutations");
    await createMarkEntry(
      {
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        examId: EXAM,
        subjectId: SUBJECT,
        teacherId: TEACHER,
        maxMarks: 100,
        scores: [{ enrollmentId: ENROLL, marks: 88 }],
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/marks/entries",
      expect.objectContaining({
        institute_id: INST,
        teacher_id: TEACHER,
        exam_id: EXAM,
        max_marks: 100,
        scores: [{ enrollment_id: ENROLL, marks: 88 }],
      }),
    );
  });

  it("patches update payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: ENTRY });
    const client = { patch } as never;
    const { updateMarkEntry } = await import("./mutations");
    await updateMarkEntry(
      ENTRY,
      {
        maxMarks: 50,
        scores: [{ enrollmentId: ENROLL, marks: 40 }],
      },
      client,
    );
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/marks/entries/${ENTRY}`,
      expect.objectContaining({
        max_marks: 50,
        scores: [{ enrollment_id: ENROLL, marks: 40 }],
      }),
    );
  });

  it("posts submit in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ENTRY, status: "submitted" });
    const client = { post } as never;
    const { submitMarkEntry } = await import("./mutations");
    await submitMarkEntry(ENTRY, client);
    expect(post).toHaveBeenCalledWith(`/api/v1/marks/entries/${ENTRY}/submit`);
  });

  it("posts publish in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ENTRY, status: "published" });
    const client = { post } as never;
    const { publishMarkEntry } = await import("./mutations");
    await publishMarkEntry(ENTRY, client);
    expect(post).toHaveBeenCalledWith(`/api/v1/marks/entries/${ENTRY}/publish`);
  });

  it("posts return with admin_note in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ENTRY, status: "returned" });
    const client = { post } as never;
    const { returnMarkEntry } = await import("./mutations");
    await returnMarkEntry(ENTRY, { adminNote: "Fix totals" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/marks/entries/${ENTRY}/return`,
      expect.objectContaining({ admin_note: "Fix totals" }),
    );
  });

  it("posts reject in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ENTRY, status: "rejected" });
    const client = { post } as never;
    const { rejectMarkEntry } = await import("./mutations");
    await rejectMarkEntry(ENTRY, { adminNote: "Invalid" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/marks/entries/${ENTRY}/reject`,
      expect.objectContaining({ admin_note: "Invalid" }),
    );
  });
});
