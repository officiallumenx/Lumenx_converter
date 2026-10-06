import { isApiAuthMode } from "@/auth/auth-mode";
import { listIssuedCertificates } from "@/lib/certificates/api";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import {
  listAchievements,
  listActivityTeams,
  listCalendarEvents,
  listPracticeSessions,
} from "@/lib/activity/api";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import { loadActivityApiHierarchy, getActivityApiSnapshot } from "@/lib/activity/api-store";
import { activityDashboardSnapshot } from "./mock-data";
import type {
  ActivityDashboardSnapshot,
  ActivityNotification,
  ActivityTimelineItem,
  CalendarActivityMark,
  TodayActivity,
  UpcomingActivityEvent,
  UpcomingCompetition,
} from "./types";
import { resetAchievementsStore } from "./achievements/store";
import { resetCertificatesStore } from "./certificates/store";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

let dashboardStore: ActivityDashboardSnapshot = isApiAuthMode()
  ? {
      stats: {
        todayActivities: 0,
        thisWeekEvents: 0,
        activeClubs: 0,
        pendingAttendance: 0,
        openCompetitions: 0,
        workshopSessions: 0,
        unreadMessages: 0,
        certificatesIssued: 0,
      },
      todayActivities: [],
      upcomingEvents: [],
      upcomingCompetitions: [],
      calendarMarks: [],
      notifications: [],
      timeline: [],
      participationSummary: {
        totalParticipants: 0,
        weekOverWeekChange: 0,
        byCategory: [
          { category: "sports", count: 0, label: "Sports" },
          { category: "clubs", count: 0, label: "Clubs" },
          { category: "events", count: 0, label: "Events" },
          { category: "workshops", count: 0, label: "Workshops" },
          { category: "competitions", count: 0, label: "Competitions" },
        ],
      },
    }
  : { ...activityDashboardSnapshot };

/**
 * Satellite sports workspace modules are reset via dynamic import so they are
 * NOT evaluated on app bootstrap. ActivityPortalRegistry imports this file on
 * every page — eager imports previously pulled the full sports repository graph
 * (~600KB) before login, causing slow loads and intermittent startup crashes.
 */
async function resetSportsWorkspaceModules() {
  await Promise.all([
    import("./sports-reports/repositories").then((m) => m.sportsReportsRepository.reset()),
    import("./sports-equipment/repositories").then((m) => m.sportsEquipmentRepository.reset()),
    import("./sports-venues/repositories").then((m) => m.sportsVenuesRepository.reset()),
    import("./sports-medical-fitness/repositories").then((m) =>
      m.sportsMedicalFitnessRepository.reset(),
    ),
    import("./sports-team-selection/repositories").then((m) =>
      m.sportsTeamSelectionRepository.reset(),
    ),
    import("./sports-communication/repositories").then((m) =>
      m.sportsCommunicationRepository.reset(),
    ),
    import("./sports-unified-calendar/repositories").then((m) =>
      m.sportsUnifiedCalendarRepository.reset(),
    ),
    import("./sports-archive/store").then((m) => m.resetSportsArchiveStore()),
  ]);
}

function requireInstituteId(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

function formatTimeAgo(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso.slice(0, 10);
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr ago`;
  return iso.slice(0, 10);
}

function emptyDashboard(): ActivityDashboardSnapshot {
  return {
    stats: {
      todayActivities: 0,
      thisWeekEvents: 0,
      activeClubs: 0,
      pendingAttendance: 0,
      openCompetitions: 0,
      workshopSessions: 0,
      unreadMessages: 0,
      certificatesIssued: 0,
    },
    todayActivities: [],
    upcomingEvents: [],
    upcomingCompetitions: [],
    calendarMarks: [],
    notifications: [],
    timeline: [],
    participationSummary: {
      totalParticipants: 0,
      weekOverWeekChange: 0,
      byCategory: [
        { category: "sports", count: 0, label: "Sports" },
        { category: "clubs", count: 0, label: "Clubs" },
        { category: "events", count: 0, label: "Events" },
        { category: "workshops", count: 0, label: "Workshops" },
        { category: "competitions", count: 0, label: "Competitions" },
      ],
    },
  };
}

async function composeDashboardFromApis(): Promise<ActivityDashboardSnapshot> {
  const instituteId = requireInstituteId();
  await loadActivityApiHierarchy();
  const snapshot = getActivityApiSnapshot();
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const sectionById = new Map(snapshot.sections.map((s) => [s.id, s]));
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);

  const [practice, calendarEvents, achievements, certificates, inbox, teams] =
    await Promise.all([
      listPracticeSessions(instituteId),
      listCalendarEvents(instituteId),
      listAchievements(instituteId),
      listIssuedCertificates({ instituteId }),
      loadConnectPortalInbox(instituteId),
      listActivityTeams(instituteId),
    ]);

  const todayPractice = practice.filter(
    (s) => s.scheduledOn === today && s.status !== "cancelled",
  );

  const todayActivities: TodayActivity[] = todayPractice.map((s) => {
    const team = teamById.get(s.teamId);
    const section = team ? sectionById.get(team.sectionId) : undefined;
    return {
      id: s.id,
      title: s.title,
      category: section?.domain === "eca" ? "clubs" : "sports",
      venue: s.location ?? "—",
      time: s.startTime ?? "—",
      participantCount: snapshot.memberships.filter(
        (m) => m.teamId === s.teamId && m.status === "active",
      ).length,
      status: s.status === "completed" ? "completed" : "upcoming",
    };
  });

  const upcomingEvents: UpcomingActivityEvent[] = calendarEvents
    .filter((e) => e.eventOn >= today)
    .sort((a, b) => a.eventOn.localeCompare(b.eventOn))
    .slice(0, 8)
    .map((e) => {
      const team = e.teamId ? teamById.get(e.teamId) : undefined;
      return {
        id: e.id,
        title: e.title,
        date: e.eventOn,
        time: e.startTime ?? "—",
        venue: e.venueText ?? "—",
        audience: team?.name ?? "Activity",
      };
    });

  const upcomingCompetitions: UpcomingCompetition[] = calendarEvents
    .filter((e) => e.eventKind === "match" || e.eventKind === "tournament")
    .filter((e) => e.eventOn >= today)
    .slice(0, 6)
    .map((e) => {
      const team = e.teamId ? teamById.get(e.teamId) : undefined;
      return {
        id: e.id,
        title: e.title,
        sport: team?.name ?? "Activity",
        date: e.eventOn,
        teamsRegistered: 1,
        maxTeams: 1,
      };
    });

  const markCounts = new Map<string, number>();
  for (const s of practice) {
    if (s.status === "cancelled") continue;
    markCounts.set(s.scheduledOn, (markCounts.get(s.scheduledOn) ?? 0) + 1);
  }
  for (const e of calendarEvents) {
    markCounts.set(e.eventOn, (markCounts.get(e.eventOn) ?? 0) + 1);
  }
  const calendarMarks: CalendarActivityMark[] = [...markCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 21)
    .map(([date, count]) => ({
      date,
      count,
      highlight: date === today,
    }));

  const notifications: ActivityNotification[] = inbox.slice(0, 8).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.desc,
    category: n.type === "warning" ? "urgent" : "reminder",
    timeAgo: formatTimeAgo(n.createdAt ?? n.time),
    unread: Boolean(n.unread),
  }));

  const timeline: ActivityTimelineItem[] = [
    ...todayPractice.slice(0, 3).map((s) => ({
      id: `tl-p-${s.id}`,
      action: "Practice scheduled",
      detail: s.title,
      timeAgo: formatTimeAgo(s.createdAt),
      category: "sports" as const,
    })),
    ...achievements.slice(0, 3).map((a) => ({
      id: `tl-a-${a.id}`,
      action: "Achievement recorded",
      detail: a.title,
      timeAgo: formatTimeAgo(a.createdAt),
      category: "competitions" as const,
    })),
  ].slice(0, 8);

  const activeTeams = teams.filter((t) => t.status === "active");
  const ecaTeams = activeTeams.filter((t) => {
    const section = sectionById.get(t.sectionId);
    return section?.domain === "eca";
  });
  const sportsTeams = activeTeams.filter((t) => {
    const section = sectionById.get(t.sectionId);
    return section?.domain === "sports";
  });
  const thisWeekEvents = [
    ...practice.filter((s) => s.scheduledOn >= today && s.scheduledOn <= weekEndIso),
    ...calendarEvents.filter((e) => e.eventOn >= today && e.eventOn <= weekEndIso),
  ].length;

  const unreadMessages = inbox.filter((n) => n.unread).length;
  const pendingAttendance = todayPractice.filter((s) => s.status === "scheduled").length;
  const workshopSessions = calendarEvents.filter((e) => /workshop/i.test(e.title)).length;

  return {
    stats: {
      todayActivities: todayActivities.length,
      thisWeekEvents,
      activeClubs: ecaTeams.length,
      pendingAttendance,
      openCompetitions: upcomingCompetitions.length,
      workshopSessions,
      unreadMessages,
      certificatesIssued: certificates.length,
    },
    todayActivities,
    upcomingEvents,
    upcomingCompetitions,
    calendarMarks,
    notifications,
    timeline,
    participationSummary: {
      totalParticipants: snapshot.memberships.filter((m) => m.status === "active").length,
      weekOverWeekChange: 0,
      byCategory: [
        { category: "sports", count: sportsTeams.length, label: "Sports" },
        { category: "clubs", count: ecaTeams.length, label: "Clubs" },
        { category: "events", count: upcomingEvents.length, label: "Events" },
        { category: "workshops", count: workshopSessions, label: "Workshops" },
        {
          category: "competitions",
          count: upcomingCompetitions.length,
          label: "Competitions",
        },
      ],
    },
  };
}

export const activityRepository = {
  async getDashboard(): Promise<ActivityDashboardSnapshot> {
    if (isApiAuthMode()) {
      dashboardStore = await composeDashboardFromApis();
      return dashboardStore;
    }
    await delay();
    return dashboardStore;
  },
  getDashboardSnapshot(): ActivityDashboardSnapshot {
    return dashboardStore;
  },
  /** Demo hook for future mutations from other activity modules. */
  setDashboardSnapshot(next: ActivityDashboardSnapshot) {
    dashboardStore = next;
  },
  async reset() {
    dashboardStore = isApiAuthMode() ? emptyDashboard() : { ...activityDashboardSnapshot };
    resetAchievementsStore();
    resetCertificatesStore();
    await resetSportsWorkspaceModules();
  },
};
