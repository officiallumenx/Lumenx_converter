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

const INST_A = "11111111-1111-4111-8111-111111111111";
const INST_B = "22222222-2222-4222-8222-222222222222";

const rosterA: TeacherPortalApiData = {
  teacherId: "teacher-a",
  classes: [],
  studentsBySection: new Map(),
  allStudents: [],
};

const rosterB: TeacherPortalApiData = {
  teacherId: "teacher-b",
  classes: [],
  studentsBySection: new Map(),
  allStudents: [],
};

const fetchRoster = vi.fn(async (instituteId: string) => {
  if (instituteId === INST_A) return rosterA;
  if (instituteId === INST_B) return rosterB;
  return null;
});

vi.mock("./load", async () => {
  const actual = await vi.importActual<typeof import("./load")>("./load");
  return {
    ...actual,
    loadTeacherPortalApiData: (instituteId: string) => fetchRoster(instituteId),
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
    const key = teacherPortalQueryKey(INST_A);

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

  it("uses a different cache entry per institute", async () => {
    const client = makeClient();

    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(INST_A),
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(INST_B),
      queryFn: () => fetchTeacherPortalRoster(INST_B),
    });

    expect(fetchRoster).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(teacherPortalQueryKey(INST_A))).toEqual(rosterA);
    expect(client.getQueryData(teacherPortalQueryKey(INST_B))).toEqual(rosterB);
    expect(teacherPortalQueryKey(INST_A)).not.toEqual(teacherPortalQueryKey(INST_B));
  });

  it("refetches after invalidateQueries", async () => {
    const client = makeClient();
    const key = teacherPortalQueryKey(INST_A);

    await client.fetchQuery({
      queryKey: key,
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    expect(fetchRoster).toHaveBeenCalledTimes(1);

    await invalidateTeacherPortalQueries(client, INST_A);
    await client.refetchQueries({ queryKey: key });
    expect(fetchRoster).toHaveBeenCalledTimes(2);
  });

  it("removeQueries clears institute data (logout / role leave)", async () => {
    const client = makeClient();
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(INST_A),
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    expect(client.getQueryData(teacherPortalQueryKey(INST_A))).toEqual(rosterA);

    removeTeacherPortalQueries(client);
    expect(client.getQueryData(teacherPortalQueryKey(INST_A))).toBeUndefined();
  });

  it("ensureTeacherPortalRoster uses bound QueryClient (no duplicate network while fresh)", async () => {
    const client = makeClient();
    bindTeacherPortalQueryClient(client);

    const first = await ensureTeacherPortalRoster(INST_A);
    const second = await ensureTeacherPortalRoster(INST_A);
    expect(first?.teacherId).toBe("teacher-a");
    expect(second?.teacherId).toBe("teacher-a");
    expect(fetchRoster).toHaveBeenCalledTimes(1);
  });

  it("does not share data across institutes after removeQueries", async () => {
    const client = makeClient();
    await client.fetchQuery({
      queryKey: teacherPortalQueryKey(INST_A),
      queryFn: () => fetchTeacherPortalRoster(INST_A),
    });
    removeTeacherPortalQueries(client);

    const next = await client.fetchQuery({
      queryKey: teacherPortalQueryKey(INST_B),
      queryFn: () => fetchTeacherPortalRoster(INST_B),
    });
    expect(next?.teacherId).toBe("teacher-b");
    expect(client.getQueryData(teacherPortalQueryKey(INST_A))).toBeUndefined();
  });
});
