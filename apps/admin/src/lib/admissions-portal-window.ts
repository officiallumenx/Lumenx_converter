/** Holds the Admissions Connect window opened from Admin (for cross-port profile sync). */

let admissionsPortalWindow: Window | null = null;

export function setAdmissionsPortalWindow(win: Window | null) {
  admissionsPortalWindow = win;
}

export function getAdmissionsPortalWindow(): Window | null {
  if (admissionsPortalWindow && admissionsPortalWindow.closed) {
    admissionsPortalWindow = null;
  }
  return admissionsPortalWindow;
}
