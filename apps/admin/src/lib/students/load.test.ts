import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { StudentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STU = "ac111111-1111-4111-8111-111111111111";

function dto(overrides: Partial<StudentDto> = {}): StudentDto {
  return {
    id: "stu-1",
    instituteId: INST,
    userProfileId: null,
    legacyCode: null,
    admissionNumber: null,
    sourceAdmissionApplicationId: null,
    firstName: "Aanya",
    surname: "Sharma",
    displayName: "Aanya Sharma",
    gender: "female",
    dateOfBirth: null,
    address: "12 Park Lane",
    classLabel: "Grade 10",
    sectionLabel: "A",
    rollNo: null,
    status: "active",
    accessStatus: "active",
    bloodGroup: null,
    emergencyContact: null,
    house: null,
    photoAssetPath: null,
    idCardIssuedOn: null,
    idCardValidTill: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadStudentsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listStudents = vi.fn();
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    const result = await loadStudentsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listStudents).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn();
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    await expect(loadStudentsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadStudentsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listStudents).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    const result = await loadStudentsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("stu-1");
    expect(listStudents).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    await expect(loadStudentsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    const result = await loadStudentsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    const result = await loadStudentsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    const result = await loadStudentsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStudents = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listStudents }));
    const { loadStudentsList } = await import("./load");
    const result = await loadStudentsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});

describe("loadStudentDetail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getStudent = vi.fn();
    vi.doMock("./api", () => ({ getStudent }));
    const { loadStudentDetail } = await import("./load");
    const result = await loadStudentDetail("stu-1");
    expect(result.status).toBe("demo");
    expect(getStudent).not.toHaveBeenCalled();
  });

  it("maps student detail on success", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getStudent = vi.fn().mockResolvedValue(dto({ id: STU }));
    vi.doMock("./api", () => ({ getStudent }));
    const { loadStudentDetail } = await import("./load");
    const result = await loadStudentDetail(STU);
    expect(result.status).toBe("ready");
    expect(result.student?.id).toBe(STU);
  });

  it("rejects invalid resource id without calling API", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getStudent = vi.fn();
    vi.doMock("./api", () => ({ getStudent }));
    const { loadStudentDetail } = await import("./load");
    const result = await loadStudentDetail("stu-1");
    expect(result.status).toBe("error");
    expect(result.student).toBeNull();
    expect(getStudent).not.toHaveBeenCalled();
  });
});
