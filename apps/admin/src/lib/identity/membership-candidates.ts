/**
 * Candidates for membership attach — existing linked user_profile ids only.
 * Does not invent Auth users.
 */
export type MembershipCandidate = {
  userId: string;
  label: string;
  source: "teacher" | "student";
};

export function collectMembershipCandidates(input: {
  teachers: Array<{
    userProfileId: string | null;
    displayName: string;
  }>;
  students: Array<{
    userProfileId: string | null;
    displayName: string;
  }>;
  /** Existing membership user ids to exclude. */
  existingUserIds?: string[];
}): MembershipCandidate[] {
  const existing = new Set(input.existingUserIds ?? []);
  const byUser = new Map<string, MembershipCandidate>();

  for (const t of input.teachers) {
    const id = t.userProfileId?.trim();
    if (!id || existing.has(id)) continue;
    byUser.set(id, {
      userId: id,
      label: `${t.displayName} · Teacher`,
      source: "teacher",
    });
  }
  for (const s of input.students) {
    const id = s.userProfileId?.trim();
    if (!id || existing.has(id)) continue;
    if (byUser.has(id)) continue;
    byUser.set(id, {
      userId: id,
      label: `${s.displayName} · Student`,
      source: "student",
    });
  }

  return [...byUser.values()].sort((a, b) => a.label.localeCompare(b.label));
}
