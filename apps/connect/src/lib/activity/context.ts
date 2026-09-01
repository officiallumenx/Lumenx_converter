let instituteId: string | null = null;

export function setActivityApiContext(input: { instituteId: string }) {
  instituteId = input.instituteId.trim();
}

export function getActivityApiInstituteId(): string | null {
  return instituteId;
}

export function clearActivityApiContext() {
  instituteId = null;
}
