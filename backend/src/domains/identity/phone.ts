/**
 * Mirrors public.canonical_phone_digits for backend query parameters.
 * The database remains authoritative and maintains user_profile.phone_digits.
 */
export function canonicalPhoneDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}
