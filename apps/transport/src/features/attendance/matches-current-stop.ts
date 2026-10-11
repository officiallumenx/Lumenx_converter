/** Roster filter: assigned students only at their stop UUID; unassigned at every stop. */
export function matchesCurrentStop(
  student: { stopId?: string | null },
  stop: { id: string } | null,
): boolean {
  if (!stop) return false;
  const stopId = student.stopId?.trim();
  if (!stopId) return true;
  return stopId === stop.id;
}
