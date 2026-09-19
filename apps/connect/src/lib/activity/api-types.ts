/** Mirrors backend activity DTOs (Connect API mode). */

export type ActivityDomain = "sports" | "eca";
export type SportsCategory = "indoor" | "outdoor";
export type ActivityTeamKind = "team" | "group";
export type ActivityMembershipStatus = "active" | "left";
export type AchievementKind = "award" | "certificate" | "participation" | "other";
export type PracticeSessionStatus = "scheduled" | "completed" | "cancelled";

export type ActivitySectionDto = {
  id: string;
  instituteId: string;
  domain: ActivityDomain;
  sportsCategory: SportsCategory | null;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTeamDto = {
  id: string;
  instituteId: string;
  sectionId: string;
  kind: ActivityTeamKind;
  name: string;
  status: "active" | "archived";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityMembershipDto = {
  id: string;
  instituteId: string;
  teamId: string;
  studentId: string;
  role: "member" | "captain" | "coach_assist";
  status: ActivityMembershipStatus;
  joinedAt: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AchievementDto = {
  id: string;
  instituteId: string;
  studentId: string;
  sectionId: string | null;
  teamId: string | null;
  title: string;
  kind: AchievementKind;
  awardedOn: string;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeSessionDto = {
  id: string;
  instituteId: string;
  teamId: string;
  title: string;
  scheduledOn: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  status: PracticeSessionStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTeamRecipientsDto = {
  teamId: string;
  recipientUserIds: string[];
};

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
export type MatchResultStatus = "scheduled" | "completed" | "walkover" | "cancelled";
export type CoachNoteVisibility = "staff" | "guardians";
export type SportsAttendanceStatus = "present" | "absent" | "late" | "excused";
export type TeamSelectionStatus = "draft" | "published" | "archived";
export type MedicalClearance = "clear" | "restricted" | "unfit" | "pending";
export type CalendarEventKind = "practice" | "match" | "tournament" | "other";

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

export type CreateVenueInput = {
  instituteId: string;
  name: string;
  venueType?: string | null;
  locationNotes?: string | null;
  capacity?: number | null;
  status?: VenueStatus;
};
export type UpdateVenueInput = Omit<Partial<CreateVenueInput>, "instituteId">;

export type CreateEquipmentInput = {
  instituteId: string;
  name: string;
  category?: string | null;
  quantity?: number;
  condition?: EquipmentCondition;
  status?: EquipmentStatus;
  notes?: string | null;
};
export type UpdateEquipmentInput = Omit<Partial<CreateEquipmentInput>, "instituteId">;

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
export type UpdateTournamentInput = Omit<Partial<CreateTournamentInput>, "instituteId">;

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
export type UpdateMatchResultInput = Omit<
  Partial<CreateMatchResultInput>,
  "instituteId" | "tournamentId"
>;

export type CreateCoachNoteInput = {
  instituteId: string;
  teamId: string;
  studentId?: string | null;
  noteDate: string;
  body: string;
  visibility?: CoachNoteVisibility;
};
export type UpdateCoachNoteInput = Omit<Partial<CreateCoachNoteInput>, "instituteId" | "teamId">;

export type CreateSportsAttendanceInput = {
  instituteId: string;
  teamId: string;
  sessionOn: string;
  studentId: string;
  status?: SportsAttendanceStatus;
  notes?: string | null;
};
export type UpdateSportsAttendanceInput = Pick<
  Partial<CreateSportsAttendanceInput>,
  "status" | "notes"
>;

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
export type UpdateTeamSelectionInput = Omit<
  Partial<CreateTeamSelectionInput>,
  "instituteId" | "teamId" | "memberStudentIds"
>;

export type CreateMedicalFitnessInput = {
  instituteId: string;
  studentId: string;
  clearanceStatus?: MedicalClearance;
  validUntil?: string | null;
  notes?: string | null;
  assessedOn: string;
};
export type UpdateMedicalFitnessInput = Omit<
  Partial<CreateMedicalFitnessInput>,
  "instituteId" | "studentId"
>;

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
export type UpdateCalendarEventInput = Omit<Partial<CreateCalendarEventInput>, "instituteId">;
