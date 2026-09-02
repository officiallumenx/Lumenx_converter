/** In-app chimes — alert uses urgent double tone; notification uses soft single tone. */

export type AlertChimeVariant = "alert" | "notification";

let audioContext: AudioContext | null = null;
let soundEnabled = true;

const ALERT_CHIMES_STORAGE_KEY = "lumenx.alert-chimes-enabled";

export function loadAlertChimesPreference(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(ALERT_CHIMES_STORAGE_KEY);
  if (raw === "0" || raw === "false") return false;
  return true;
}

export function saveAlertChimesPreference(enabled: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ALERT_CHIMES_STORAGE_KEY, enabled ? "1" : "0");
  }
  setAlertChimesEnabled(enabled);
}

/** Call once on app boot to restore persisted preference. */
export function bootstrapAlertChimesPreference(): void {
  setAlertChimesEnabled(loadAlertChimesPreference());
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!soundEnabled) return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioContext;
}

export function setAlertChimesEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function areAlertChimesEnabled(): boolean {
  return soundEnabled;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  gainPeak: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function playNotificationChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    const t = ctx.currentTime;
    playTone(ctx, 520, t, 0.12, 0.08);
  });
}

export function playAlertChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    const t = ctx.currentTime;
    playTone(ctx, 880, t, 0.1, 0.14);
    playTone(ctx, 988, t + 0.14, 0.12, 0.16);
  });
}

export function playChimeForVariant(variant: AlertChimeVariant): void {
  if (variant === "alert") playAlertChime();
  else playNotificationChime();
}
