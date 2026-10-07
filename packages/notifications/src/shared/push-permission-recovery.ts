/**
 * Production push permission recovery — headless state + settings open + recheck.
 * Does not spam the OS permission prompt after a hard deny.
 */

export type PushPermissionRecoveryStatus =
  | "unknown"
  | "granted"
  | "denied"
  | "unsupported";

type Listener = (status: PushPermissionRecoveryStatus) => void;

let status: PushPermissionRecoveryStatus = "unknown";
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l(status);
}

export function getPushPermissionRecoveryStatus(): PushPermissionRecoveryStatus {
  return status;
}

export function setPushPermissionRecoveryStatus(
  next: PushPermissionRecoveryStatus,
): void {
  if (status === next) return;
  status = next;
  emit();
}

export function subscribePushPermissionRecovery(listener: Listener): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

type NativeSettingsApi = {
  open?: (opts: {
    optionAndroid?: { settings?: string };
    optionIOS?: string;
  }) => Promise<void>;
  AndroidSettings?: { AppNotification?: string };
};

/**
 * Open the OS app notification settings page when possible.
 * Uses capacitor-native-settings when present; never throws.
 */
export async function openAppNotificationSettings(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const mod = await import(
      /* @vite-ignore */ "capacitor-native-settings"
    ).catch(() => null);
    const NativeSettings = (mod as { NativeSettings?: NativeSettingsApi } | null)
      ?.NativeSettings;
    const AndroidSettings = (
      mod as { AndroidSettings?: { AppNotification?: string } } | null
    )?.AndroidSettings;
    if (typeof NativeSettings?.open === "function") {
      await NativeSettings.open({
        optionAndroid: {
          settings: AndroidSettings?.AppNotification ?? "APP_NOTIFICATION_SETTINGS",
        },
        optionIOS: "App",
      });
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const { App } = await import(/* @vite-ignore */ "@capacitor/app").catch(
      () => ({ App: null }),
    );
    // Best-effort: some WebViews accept this intent URL.
    if (App && typeof (App as { openUrl?: (o: { url: string }) => Promise<void> }).openUrl === "function") {
      await (App as { openUrl: (o: { url: string }) => Promise<void> }).openUrl({
        url: "app-settings:",
      });
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

type PushPermApi = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
};

/**
 * After returning from settings: check permission; if granted, register again.
 * Does not call requestPermissions when already denied (avoids spam).
 */
export async function recheckAndRegisterPushAfterSettings(input: {
  onGrantedRegister: () => Promise<void>;
}): Promise<PushPermissionRecoveryStatus> {
  try {
    const mod = await import(
      /* @vite-ignore */ "@capacitor/push-notifications"
    ).catch(() => null);
    const PushNotifications = (mod as { PushNotifications?: PushPermApi } | null)
      ?.PushNotifications;
    if (!PushNotifications) {
      setPushPermissionRecoveryStatus("unsupported");
      return "unsupported";
    }
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") {
      await PushNotifications.register();
      await input.onGrantedRegister();
      setPushPermissionRecoveryStatus("granted");
      return "granted";
    }
    setPushPermissionRecoveryStatus("denied");
    return "denied";
  } catch {
    setPushPermissionRecoveryStatus("denied");
    return "denied";
  }
}

/** Test helper */
export function resetPushPermissionRecoveryForTests(): void {
  status = "unknown";
}
