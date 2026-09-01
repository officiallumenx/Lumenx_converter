/** Mirrors backend student DTO (subset used by Connect). */

export type StudentDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  displayName: string;
  firstName: string;
  surname: string;
  classLabel: string | null;
  sectionLabel: string | null;
  rollNo: string | null;
  status: string;
  accessStatus: string;
};

export type ListStudentsParams = {
  instituteId: string;
  status?: string;
  q?: string;
};
