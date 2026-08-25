/** Holds the Careers Connect window opened from Admin (for named-window reuse). */

let careersPortalWindow: Window | null = null;

export function setCareersPortalWindow(win: Window | null) {
  careersPortalWindow = win;
}

export function getCareersPortalWindow(): Window | null {
  if (careersPortalWindow && careersPortalWindow.closed) {
    careersPortalWindow = null;
  }
  return careersPortalWindow;
}
