/** Deterministic Supabase Auth email for parent phone + institute login. */
export function parentPortalAuthEmail(phone: string, instituteId: string): string {
  const digits = phone.replace(/\D/g, "");
  const instituteKey = instituteId.trim().toLowerCase();
  return `parent.${digits}.${instituteKey}@portal.lumenx.internal`;
}

export function normalizeParentPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}
