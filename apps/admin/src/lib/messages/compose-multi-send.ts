/** Plan multi-recipient direct message sends (one createDirectThread per user). */

export function planDirectMultiSend(
  selected: { userId: string }[],
): { ok: true; userIds: string[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const userIds: string[] = [];
  for (const row of selected) {
    const id = row.userId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    userIds.push(id);
  }
  if (userIds.length === 0) {
    return { ok: false, error: "Select at least one recipient" };
  }
  return { ok: true, userIds };
}

export function summarizeMultiSendResults(
  results: { userId: string; ok: boolean; error?: string }[],
): string {
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  if (fail === 0) {
    return ok === 1
      ? "Conversation started"
      : `${ok} conversations started`;
  }
  if (ok === 0) {
    return `Failed to start conversations (${fail})`;
  }
  return `${ok} started · ${fail} failed`;
}
