let instituteId: string | null = null;
let teacherId: string | null = null;

export function setDiaryApiContext(input: {
  instituteId: string | null;
  teacherId: string | null;
}): void {
  instituteId = input.instituteId;
  teacherId = input.teacherId;
}

export function getDiaryApiContext(): {
  instituteId: string | null;
  teacherId: string | null;
} {
  return { instituteId, teacherId };
}

export function requireDiaryApiContext(): { instituteId: string; teacherId: string } {
  if (!instituteId || !teacherId) {
    throw new Error("Diary API context is not configured");
  }
  return { instituteId, teacherId };
}

export function clearDiaryApiContext(): void {
  instituteId = null;
  teacherId = null;
}
