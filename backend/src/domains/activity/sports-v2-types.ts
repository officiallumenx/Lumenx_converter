/** Activity / Sports V2 satellite types. */

// ── Enums ────────────────────────────────────────────────────────

export type VenueStatus = "active" | "archived";
export type EquipmentCondition = "good" | "fair" | "poor" | "retired";
export type EquipmentStatus = "active" | "archived";
export type TournamentStatus =
  | "draft"
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "archived";
export type MatchResultStatus =
  | "scheduled"
  | "completed"
  | "walkover"
  | "cancelled";
export type CoachNoteVisibility = "staff" | "guardians";
export type SportsAttendanceStatus = "present" | "absent" | "late" | "excused";
export type TeamSelectionStatus = "draft" | "published" | "archived";
export type MedicalClearance = "clear" | "restricted" | "unfit" | "pending";
export type CalendarEventKind = "practice" | "match" | "tournament" | "other";

// ── Row types (snake_case — DB shape) ────────────────────────────

export type VenueRow = {
  id: string;
  institute_id: string;
  name: string;
  venue_type: string | null;
  location_notes: string | null;
  capacity: number | null;
  status: VenueStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type EquipmentRow = {
  id: string;
  institute_id: string;
  name: string;
  category: string | null;
  quantity: number;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TournamentRow = {
  id: string;
  institute_id: string;
  section_id: string | null;
  venue_id: string | null;
  name: string;
  sport_label: string | null;
  tournament_type: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: TournamentStatus;
  description: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MatchResultRow = {
  id: string;
  institute_id: string;
  tournament_id: string;
  match_label: string;
  played_on: string | null;
  venue_text: string | null;
  home_score: number | null;
  away_score: number | null;
  result_status: MatchResultStatus;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CoachNoteRow = {
  id: string;
  institute_id: string;
  team_id: string;
  student_id: string | null;
  note_date: string;
  body: string;
  visibility: CoachNoteVisibility;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SportsAttendanceRow = {
  id: string;
  institute_id: string;
  team_id: string;
  session_on: string;
  student_id: string;
  status: SportsAttendanceStatus;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TeamSelectionRow = {
  id: string;
  institute_id: string;
  team_id: string;
  title: string;
  event_on: string | null;
  venue_text: string | null;
  status: TeamSelectionStatus;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TeamSelectionMemberRow = {
  id: string;
  institute_id: string;
  selection_id: string;
  student_id: string;
  created_at: string;
};

export type MedicalFitnessRow = {
  id: string;
  institute_id: string;
  student_id: string;
  clearance_status: MedicalClearance;
  valid_until: string | null;
  notes: string | null;
  assessed_on: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CalendarEventRow = {
  id: string;
  institute_id: string;
  section_id: string | null;
  team_id: string | null;
  title: string;
  event_on: string;
  start_time: string | null;
  end_time: string | null;
  venue_text: string | null;
  event_kind: CalendarEventKind;
  source_ref: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ── DTO types (camelCase — API shape) ────────────────────────────

export type VenueDto = {
  id: string;
  instituteId: string;
  name: string;
  venueType: string | null;
  locationNotes: string | null;
  capacity: number | null;
  status: VenueStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentDto = {
  id: string;
  instituteId: string;
  name: string;
  category: string | null;
  quantity: number;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type TournamentDto = {
  id: string;
  instituteId: string;
  sectionId: string | null;
  venueId: string | null;
  name: string;
  sportLabel: string | null;
  tournamentType: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: TournamentStatus;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchResultDto = {
  id: string;
  instituteId: string;
  tournamentId: string;
  matchLabel: string;
  playedOn: string | null;
  venueText: string | null;
  homeScore: number | null;
  awayScore: number | null;
  resultStatus: MatchResultStatus;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CoachNoteDto = {
  id: string;
  instituteId: string;
  teamId: string;
  studentId: string | null;
  noteDate: string;
  body: string;
  visibility: CoachNoteVisibility;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type SportsAttendanceDto = {
  id: string;
  instituteId: string;
  teamId: string;
  sessionOn: string;
  studentId: string;
  status: SportsAttendanceStatus;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamSelectionDto = {
  id: string;
  instituteId: string;
  teamId: string;
  title: string;
  eventOn: string | null;
  venueText: string | null;
  status: TeamSelectionStatus;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamSelectionMemberDto = {
  id: string;
  instituteId: string;
  selectionId: string;
  studentId: string;
  createdAt: string;
};

export type MedicalFitnessDto = {
  id: string;
  instituteId: string;
  studentId: string;
  clearanceStatus: MedicalClearance;
  validUntil: string | null;
  notes: string | null;
  assessedOn: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventDto = {
  id: string;
  instituteId: string;
  sectionId: string | null;
  teamId: string | null;
  title: string;
  eventOn: string;
  startTime: string | null;
  endTime: string | null;
  venueText: string | null;
  eventKind: CalendarEventKind;
  sourceRef: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

// ── Create / Update input types ──────────────────────────────────

export type CreateVenueInput = {
  instituteId: string;
  name: string;
  venueType?: string | null;
  locationNotes?: string | null;
  capacity?: number | null;
  status?: VenueStatus;
};

export type UpdateVenueInput = {
  name?: string;
  venueType?: string | null;
  locationNotes?: string | null;
  capacity?: number | null;
  status?: VenueStatus;
};

export type CreateEquipmentInput = {
  instituteId: string;
  name: string;
  category?: string | null;
  quantity?: number;
  condition?: EquipmentCondition;
  status?: EquipmentStatus;
  notes?: string | null;
};

export type UpdateEquipmentInput = {
  name?: string;
  category?: string | null;
  quantity?: number;
  condition?: EquipmentCondition;
  status?: EquipmentStatus;
  notes?: string | null;
};

export type CreateTournamentInput = {
  instituteId: string;
  sectionId?: string | null;
  venueId?: string | null;
  name: string;
  sportLabel?: string | null;
  tournamentType?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  status?: TournamentStatus;
  description?: string | null;
};

export type UpdateTournamentInput = {
  sectionId?: string | null;
  venueId?: string | null;
  name?: string;
  sportLabel?: string | null;
  tournamentType?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  status?: TournamentStatus;
  description?: string | null;
};

export type CreateMatchResultInput = {
  instituteId: string;
  tournamentId: string;
  matchLabel: string;
  playedOn?: string | null;
  venueText?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  resultStatus?: MatchResultStatus;
  notes?: string | null;
};

export type UpdateMatchResultInput = {
  matchLabel?: string;
  playedOn?: string | null;
  venueText?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  resultStatus?: MatchResultStatus;
  notes?: string | null;
};

export type CreateCoachNoteInput = {
  instituteId: string;
  teamId: string;
  studentId?: string | null;
  noteDate: string;
  body: string;
  visibility?: CoachNoteVisibility;
};

export type UpdateCoachNoteInput = {
  body?: string;
  visibility?: CoachNoteVisibility;
  noteDate?: string;
  studentId?: string | null;
};

export type CreateSportsAttendanceInput = {
  instituteId: string;
  teamId: string;
  sessionOn: string;
  studentId: string;
  status?: SportsAttendanceStatus;
  notes?: string | null;
};

export type UpdateSportsAttendanceInput = {
  status?: SportsAttendanceStatus;
  notes?: string | null;
};

export type CreateTeamSelectionInput = {
  instituteId: string;
  teamId: string;
  title: string;
  eventOn?: string | null;
  venueText?: string | null;
  status?: TeamSelectionStatus;
  notes?: string | null;
  memberStudentIds?: string[];
};

export type UpdateTeamSelectionInput = {
  title?: string;
  eventOn?: string | null;
  venueText?: string | null;
  status?: TeamSelectionStatus;
  notes?: string | null;
};

export type CreateMedicalFitnessInput = {
  instituteId: string;
  studentId: string;
  clearanceStatus?: MedicalClearance;
  validUntil?: string | null;
  notes?: string | null;
  assessedOn: string;
};

export type UpdateMedicalFitnessInput = {
  clearanceStatus?: MedicalClearance;
  validUntil?: string | null;
  notes?: string | null;
  assessedOn?: string;
};

export type CreateCalendarEventInput = {
  instituteId: string;
  sectionId?: string | null;
  teamId?: string | null;
  title: string;
  eventOn: string;
  startTime?: string | null;
  endTime?: string | null;
  venueText?: string | null;
  eventKind?: CalendarEventKind;
  sourceRef?: string | null;
};

export type UpdateCalendarEventInput = {
  sectionId?: string | null;
  teamId?: string | null;
  title?: string;
  eventOn?: string;
  startTime?: string | null;
  endTime?: string | null;
  venueText?: string | null;
  eventKind?: CalendarEventKind;
  sourceRef?: string | null;
};
