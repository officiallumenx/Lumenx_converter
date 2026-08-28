import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { StudentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<StudentDto> = {}): StudentDto {
  return {
    id: "stu-1",
    instituteId: INST,
    userProfileId: null,
    legacyCode: null,
    admissionNumber: "ADM-1001",
    sourceAdmissionApplicationId: null,
    firstName: "Aanya",
    surname: "Sharma",
    displayName: "Aanya Sharma",
    gender: "female",
    dateOfBirth: "2010-05-01",
    address: "12 Park Lane",
    classLabel: "Grade 10",
    sectionLabel: "A",
    rollNo: "14",
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

describe("students api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listStudents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listStudents({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listStudents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listStudents({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists students with institute_id only in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listStudents } = await import("./api");
    const payload = [dto()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listStudents({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).not.toContain("status=");
    expect(url).not.toContain("access_status=");
    expect(url).not.toContain("class_label=");
    expect(url).not.toContain("section_label=");
    expect(url).not.toContain("q=");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/students?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("unwraps response envelope via shared client", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listStudents } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto({ id: "stu-2" })] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listStudents({ instituteId: INST }, client);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("stu-2");
  });

  it("gets student by id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getStudent } = await import("./api");
    const payload = dto({ id: "stu-detail" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await getStudent("stu-detail", client);
    expect(result.id).toBe("stu-detail");
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/students/stu-detail");
  });
});
