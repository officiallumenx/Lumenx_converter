import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeacherPortalApiData } from "./load";
import {
  bindTeacherPortalQueryClient,
  ensureTeacherPortalRoster,
  fetchTeacherPortalRoster,
  invalidateTeacherPortalQueries,
  removeTeacherPortalQueries,
  teacherPortalQueryKey,
} from "./use-teacher-portal-query";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const INST_A = "11111111-1111-4111-8111-111111111111";
const INST_B = "22222222-2222-4222-8222-222222222222";

const rosterA: TeacherPortalApiData = {
  instituteId: INST_A,
  teacherId: "teacher-a",
  portalSelf: null,
  classes: [],
  studentsBySection: new Map(),
  allStudents: [],
  studentsLoaded: true,
};

const rosterB: TeacherPortalApiData = {
  instituteId: INST_B,
  teacherId: "teacher-b",
  portalSelf: null,
  classes: [],
  studentsBySection: new Map(),
  allStudents: [],
  studentsLoaded: true,
};

const fetchRoster = vi.fn(
  async (instituteId: string, _options?: { includeStudents?: boolean }) => {
    if (instituteId === INST_A) return rosterA;
    if (instituteId === INST_B) return rosterB;
    return null;
  },
);

vi.mock("./load", async () => {
  const actual = await vi.importActual<typeof import("./load")>("./load");
  return {
    ...actual,
    loadTeacherPortalApiData: (
      instituteId: string,
      options?: { includeStudents?: boolean },
    ) => fetchRoster(instituteId, options),
  };
});

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 3 * 60_000, gcTime: 30 * 60_000, retry: false },
    },
  });
}

describe("teacher portal query cache", () => {
  beforeEach(() => {
    fetchRoster.mockClear();
    bindTeacherPortalQueryClient(null);
  });

  it("reuses cached roster for the same institute while fresh", async () => {
    const client = makeClient();
    const key = teacherPortalQueryKey(USER_A, INST_A);

    const first = await client.fetchQuery({
      queryKey: key,
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    const second = await client.fetchQuery({
      queryKey: key,
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });

    expect(first?.teacherId).toBe("teacher-a");
    expect(second?.teacherId).toBe("teacher-a");
    expect(fetchRoster).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(key)?.data).toEqual(rosterA);
    expect(client.getQueryState(key)?.status).toBe("success");
  });

  it("uses a different cache entry per institute and per user", async () => {
    const client = makeClient();

    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(USER_A, INST_A),
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(USER_A, INST_B),
      queryFn: () => fetchTeacherPortalRoster(INST_B),
    });

    expect(fetchRoster).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(teacherPortalQueryKey(USER_A, INST_A))).toEqual(rosterA);
    expect(client.getQueryData(teacherPortalQueryKey(USER_A, INST_B))).toEqual(rosterB);
    expect(teacherPortalQueryKey(USER_A, INST_A)).not.toEqual(
      teacherPortalQueryKey(USER_A, INST_B),
    );
    expect(teacherPortalQueryKey(USER_A, INST_A)).not.toEqual(
      teacherPortalQueryKey(USER_B, INST_A),
    );
  });

  it("refetches after invalidateQueries", async () => {
    const client = makeClient();
    const key = teacherPortalQueryKey(USER_A, INST_A);

    await client.fetchQuery({
      queryKey: key,
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    expect(fetchRoster).toHaveBeenCalledTimes(1);

    await invalidateTeacherPortalQueries(client, USER_A, INST_A);
    await client.refetchQueries({ queryKey: key });
    expect(fetchRoster).toHaveBeenCalledTimes(2);
  });

  it("removeQueries clears institute data (logout / role leave)", async () => {
    const client = makeClient();
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(USER_A, INST_A),
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    expect(client.getQueryData(teacherPortalQueryKey(USER_A, INST_A))).toEqual(rosterA);

    removeTeacherPortalQueries(client);
    expect(client.getQueryData(teacherPortalQueryKey(USER_A, INST_A))).toBeUndefined();
  });

  it("ensureTeacherPortalRoster uses bound QueryClient (no duplicate network while fresh)", async () => {
    const client = makeClient();
    bindTeacherPortalQueryClient(client);

    const first = await ensureTeacherPortalRoster(INST_A, USER_A);
    const second = await ensureTeacherPortalRoster(INST_A, USER_A);
    expect(first?.teacherId).toBe("teacher-a");
    expect(second?.teacherId).toBe("teacher-a");
    expect(fetchRoster).toHaveBeenCalledTimes(1);
  });

  it("ensureTeacherPortalRoster ignores module cache from another institute", async () => {
    bindTeacherPortalQueryClient(null);
    const load = await import("./load");
    const spy = vi.spyOn(load, "getTeacherPortalApiCache").mockReturnValue(rosterA);
    fetchRoster.mockClear();

    const other = await ensureTeacherPortalRoster(INST_B);
    expect(other?.teacherId).toBe("teacher-b");
    expect(other?.instituteId).toBe(INST_B);
    expect(fetchRoster).toHaveBeenCalledWith(INST_B, { includeStudents: true });

    spy.mockRestore();
  });

  it("ensureTeacherPortalRoster reuses full module cache for the same institute", async () => {
    bindTeacherPortalQueryClient(null);
    const load = await import("./load");
    const spy = vi.spyOn(load, "getTeacherPortalApiCache").mockReturnValue(rosterA);
    fetchRoster.mockClear();

    const hit = await ensureTeacherPortalRoster(INST_A);
    expect(hit?.teacherId).toBe("teacher-a");
    expect(fetchRoster).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("ensureTeacherPortalRoster upgrades a Home shell roster to include students", async () => {
    const client = makeClient();
    bindTeacherPortalQueryClient(client);
    const shell: TeacherPortalApiData = { ...rosterA, studentsLoaded: false };
    const key = teacherPortalQueryKey(USER_A, INST_A);
    client.setQueryData(key, shell);
    fetchRoster.mockClear();
    fetchRoster.mockResolvedValueOnce({ ...rosterA, studentsLoaded: true });

    const result = await ensureTeacherPortalRoster(INST_A, USER_A);
    expect(result?.studentsLoaded).toBe(true);
    expect(fetchRoster).toHaveBeenCalledWith(INST_A, { includeStudents: true });
  });

  it("ensureTeacherPortalRoster does not treat a shell module cache as complete", async () => {
    bindTeacherPortalQueryClient(null);
    const load = await import("./load");
    const shell: TeacherPortalApiData = { ...rosterA, studentsLoaded: false };
    const spy = vi.spyOn(load, "getTeacherPortalApiCache").mockReturnValue(shell);
    fetchRoster.mockClear();
    fetchRoster.mockResolvedValueOnce({ ...rosterA, studentsLoaded: true });

    const hit = await ensureTeacherPortalRoster(INST_A);
    expect(hit?.studentsLoaded).toBe(true);
    expect(fetchRoster).toHaveBeenCalledWith(INST_A, { includeStudents: true });

    spy.mockRestore();
  });

  it("does not share data across institutes after removeQueries", async () => {
    const client = makeClient();
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(USER_A, INST_A),
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(USER_A, INST_B),
      queryFn: () => fetchTeacherPortalRoster(INST_B),
    });

    removeTeacherPortalQueries(client);
    expect(client.getQueryData(teacherPortalQueryKey(USER_A, INST_A))).toBeUndefined();
    expect(client.getQueryData(teacherPortalQueryKey(USER_A, INST_B))).toBeUndefined();
  });
});
