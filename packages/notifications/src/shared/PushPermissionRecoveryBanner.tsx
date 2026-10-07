import { useEffect, useState, type ReactElement } from "react";
import {
  getPushPermissionRecoveryStatus,
  openAppNotificationSettings,
  recheckAndRegisterPushAfterSettings,
  subscribePushPermissionRecovery,
  type PushPermissionRecoveryStatus,
} from "./push-permission-recovery";

type Props = {
  /** Soft re-register after permission granted from Settings. */
  onRecovered?: () => void;
  className?: string;
};

/**
 * Non-blocking banner when Android notification permission is denied.
 * Opens OS notification settings; on return, rechecks and re-registers FCM.
 */
export function PushPermissionRecoveryBanner({
  onRecovered,
  className,
}: Props): ReactElement | null {
  const [status, setStatus] = useState<PushPermissionRecoveryStatus>(() =>
    getPushPermissionRecoveryStatus(),
  );
  const [opening, setOpening] = useState(false);

  useEffect(() => subscribePushPermissionRecovery(setStatus), []);

  if (status !== "denied") return null;

  return (
    <div
      role="status"
      className={
        className ??
        "mx-auto flex max-w-lg items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      }
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">Notifications are off</p>
        <p className="mt-0.5 text-amber-900/80">
          Enable notifications in system settings so you receive bus and school
          alerts. LumenX will not keep asking until you change the setting.
        </p>
      </div>
      <button
        type="button"
        disabled={opening}
        className="shrink-0 rounded-md bg-amber-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        onClick={() => {
          setOpening(true);
          void (async () => {
            await openAppNotificationSettings();
            const next = await recheckAndRegisterPushAfterSettings({
              onGrantedRegister: async () => {
                onRecovered?.();
              },
            });
            setStatus(next);
            setOpening(false);
          })();
        }}
      >
        {opening ? "Opening…" : "Open settings"}
      </button>
    </div>
  );
}
