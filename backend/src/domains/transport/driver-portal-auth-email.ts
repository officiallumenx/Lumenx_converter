/** Deterministic Supabase Auth email for transport driver phone + institute login. */
export function driverPortalAuthEmail(phone: string, instituteId: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  const instituteKey = instituteId.trim().toLowerCase().replace(/-/g, "");
  return `driver.${digits}.${instituteKey}@transport.lumenx.internal`;
}

export function normalizeDriverPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
