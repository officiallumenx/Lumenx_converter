import type {
  CoachNoteDto,
  EquipmentDto,
  MatchResultDto,
  PracticeSessionDto,
  SportsAttendanceDto,
  TournamentDto,
  VenueDto,
} from "./api-types";
import { defaultNotificationPrefs } from "./sports/activities-notifications";
import { defaultCoachMetrics } from "./sports/coach-notes-types";
import { defaultMatchResultNotificationPrefs } from "./sports/match-results-notifications";
import { defaultPracticeNotificationPrefs } from "./sports/practice-sessions-notifications";
import type { CoachNoteRecord } from "./sports/coach-notes-types";
import type { MatchResult, MatchResultStatus } from "./sports/match-results-types";
import type { PracticeSession } from "./sports/practice-sessions-types";
import type { SportsAttendanceRecord } from "./sports/sports-attendance-types";
import type { SportsTournament, TournamentType } from "./sports/tournaments-types";
import type { SportType } from "./sports/types";
import type {
  EquipmentCategoryId,
  EquipmentCondition,
  EquipmentItem,
} from "./sports-equipment/types";
import type { SportsVenue, VenueType } from "./sports-venues/types";

/**
 * The v2 API intentionally has a smaller persistence model than the legacy UI.
 * Parent activity links, denormalized names, notifications, audiences, metrics,
 * awards, attachments, venue bookings, equipment transactions and similar
 * display-only fields are not persisted and therefore map to safe empty values.
 */

const sportTypes = new Set<SportType>([
  "football",
  "basketball",
  "cricket",
  "volleyball",
  "kabaddi",
  "athletics",
  "badminton",
  "chess",
  "table_tennis",
  "swimming",
]);
const tournamentTypes = new Set<TournamentType>([
  "intra_school",
  "inter_school",
  "district",
  "state",
  "national",
  "international",
]);
const venueTypes = new Set<VenueType>([
  "indoor",
  "outdoor_ground",
  "swimming_pool",
  "court",
  "track",
  "auditorium",
]);
const equipmentCategories = new Set<EquipmentCategoryId>([
  "balls",
  "protective_gear",
  "training",
  "field_equipment",
  "fitness",
  "uniforms",
  "other",
]);

function enumOr<T extends string>(value: string | null, values: Set<T>, fallback: T): T {
  return value && values.has(value as T) ? (value as T) : fallback;
}

export function mapPracticeSessionDto(row: PracticeSessionDto): PracticeSession {
  return {
    id: row.id,
    title: row.title,
    sportsActivityId: "",
    sportsActivityTitle: "",
    teamId: row.teamId,
    teamName: "",
    coach: "",
    venue: row.location ?? "",
    date: row.scheduledOn,
    startTime: row.startTime ?? "",
    endTime: row.endTime ?? "",
    objectives: "",
    equipmentRequired: "",
    notes: row.notes ?? "",
    status: row.status,
    notifications: defaultPracticeNotificationPrefs(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapSportsAttendanceDto(row: SportsAttendanceDto): SportsAttendanceRecord {
  return {
    id: row.id,
    practiceSessionId: "",
    practiceSessionTitle: "",
    teamId: row.teamId,
    teamName: "",
    sessionDate: row.sessionOn,
    studentId: row.studentId,
    studentName: "",
    studentClassLabel: "",
    status: row.status,
    remarks: row.notes ?? "",
    performanceRating: "average",
    coachNotes: "",
    improvementAreas: "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCoachNoteDto(row: CoachNoteDto): CoachNoteRecord {
  return {
    id: row.id,
    attendanceRecordId: "",
    practiceSessionId: "",
    practiceSessionTitle: "",
    teamId: row.teamId,
    teamName: "",
    sessionDate: row.noteDate,
    studentId: row.studentId ?? "",
    studentName: "",
    studentClassLabel: "",
    coach: "",
    performanceRating: "average",
    skillsObserved: "",
    strengths: "",
    improvementAreas: "",
    coachNotes: row.body,
    nextPracticeGoals: "",
    followUpRequired: false,
    metrics: defaultCoachMetrics(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapTournamentDto(row: TournamentDto): SportsTournament {
  return {
    id: row.id,
    name: row.name,
    tournamentType: enumOr(row.tournamentType, tournamentTypes, "intra_school"),
    sportType: enumOr(
      row.sportLabel?.toLowerCase().replace(/\s+/g, "_") ?? null,
      sportTypes,
      "football",
    ),
    academicYear: "",
    venue: "",
    startDate: row.startsOn ?? "",
    endDate: row.endsOn ?? "",
    organizer: "",
    description: row.description ?? "",
    status: row.status,
    audience: { type: "entire_institute" },
    linkedTeamIds: [],
    matches: [],
    notifications: defaultNotificationPrefs(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapResultStatus(status: MatchResultDto["resultStatus"]): MatchResultStatus {
  return status === "scheduled" ? "abandoned" : status;
}

export function mapMatchResultDto(row: MatchResultDto): MatchResult {
  const score =
    row.homeScore == null && row.awayScore == null
      ? ""
      : `${row.homeScore ?? 0} - ${row.awayScore ?? 0}`;
  return {
    id: row.id,
    tournamentMatchId: "",
    tournamentId: row.tournamentId,
    tournamentName: "",
    matchName: row.matchLabel,
    sportType: "football",
    matchDate: row.playedOn ?? "",
    venue: row.venueText ?? "",
    matchStatus: mapResultStatus(row.resultStatus),
    isDraw: row.homeScore != null && row.homeScore === row.awayScore,
    finalScore: score,
    matchSummary: row.notes ?? "",
    awards: {},
    statistics: {},
    highlights: {},
    attachments: [],
    notifications: defaultMatchResultNotificationPrefs(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapVenueDto(row: VenueDto): SportsVenue {
  return {
    id: row.id,
    name: row.name,
    venueType: enumOr(row.venueType, venueTypes, "indoor"),
    location: row.locationNotes ?? "",
    capacity: row.capacity ?? 0,
    status: row.status === "archived" ? "archived" : "available",
    equipmentAvailable: [],
    description: "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEquipmentCondition(condition: EquipmentDto["condition"]): EquipmentCondition {
  if (condition === "poor") return "damaged";
  if (condition === "retired") return "lost";
  return condition;
}

export function mapEquipmentDto(row: EquipmentDto): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    categoryId: enumOr(row.category, equipmentCategories, "other"),
    quantity: row.quantity,
    available: row.quantity,
    issued: 0,
    damaged: 0,
    lost: 0,
    inMaintenance: 0,
    condition: mapEquipmentCondition(row.condition),
    purchaseDate: "",
    cost: 0,
    vendor: "",
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
