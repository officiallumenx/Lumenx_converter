/**
 * Open the device dialer with a phone number pre-filled.
 * Strips spaces and formatting so `tel:` works on Android/iOS.
 */
export function toTelHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

export function openDialer(phone: string) {
  if (typeof window === "undefined") return;
  window.location.href = toTelHref(phone);
}
