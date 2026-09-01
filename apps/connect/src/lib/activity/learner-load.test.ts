import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./api", () => ({
  listActivitySections: vi.fn(),
  listActivityTeams: vi.fn(),
  listActivityMemberships: vi.fn(),
  listAchievements: vi.fn(),
  listPracticeSessions: vi.fn(),
}));

vi.mock("@/lib/announcements/api", () => ({
  listAnnouncements: vi.fn(),
}));

import {
  listAchievements,
  listActivityMemberships,
  listActivitySections,
  listActivityTeams,
  listPracticeSessions,
} from "./api";
import { listAnnouncements } from "@/lib/announcements/api";
import { loadLearnerActivities } from "./learner-load";

const instituteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const studentId = "ac111111-1111-4111-8111-111111111111";
const teamId = "a0333333-3333-4333-8333-333333333333";
const sectionId = "a0111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.mocked(listActivitySections).mockResolvedValue([
    {
      id: sectionId,
      instituteId,
      domain: "sports",
      sportsCategory: "outdoor",
      name: "Cricket",
      slug: "cricket",
      description: null,
      status: "active",
      createdByUserId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ]);
  vi.mocked(listActivityTeams).mockResolvedValue([
    {
      id: teamId,
      instituteId,
      sectionId,
      kind: "team",
      name: "Team A",
      status: "active",
      createdByUserId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ]);
  vi.mocked(listActivityMemberships).mockResolvedValue([
    {
      id: "m1",
      instituteId,
      teamId,
      studentId,
      role: "member",
      status: "active",
      joinedAt: "2026-08-01",
      createdByUserId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ]);
  vi.mocked(listAchievements).mockResolvedValue([]);
  vi.mocked(listPracticeSessions).mockResolvedValue([]);
  vi.mocked(listAnnouncements).mockResolvedValue([
    {
      id: "ann-1",
      instituteId,
      title: "Practice moved",
      body: "Report at 4 PM",
      audienceScope: "activity_team",
      audienceLabel: "Cricket · Team A",
      classId: null,
      sectionId: null,
      activityTeamId: teamId,
      status: "published",
      scheduledAt: null,
      publishedAt: "2026-08-10T09:00:00.000Z",
      archivedAt: null,
      pinned: false,
      pinUntil: null,
      views: 0,
      createdByUserId: "u1",
      createdAt: "2026-08-10T09:00:00.000Z",
      updatedAt: "2026-08-10T09:00:00.000Z",
    },
  ]);
});

describe("loadLearnerActivities", () => {
  it("returns squads and team announcements for the student", async () => {
    const data = await loadLearnerActivities({ instituteId, studentId });
    expect(data.sportsSquads).toHaveLength(1);
    expect(data.sportsSquads[0]?.teamName).toBe("Team A");
    expect(data.sportsAnnouncements).toHaveLength(1);
    expect(data.sportsAnnouncements[0]?.title).toBe("Practice moved");
  });
});
