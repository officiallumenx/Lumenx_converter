import type { ReactNode } from "react";
import {
  PLATFORM_READONLY_COPY,
  getActiveReadOnlyReasons,
  isPlatformReadOnly,
  loadPlatformReadOnlyState,
  type PlatformReadOnlyReason,
  type PlatformReadOnlyState,
} from "@lumenx/utils";

export type PlatformReadOnlyBannerProps = {
  /** Override loaded state (e.g. from React subscription). */
  state?: PlatformReadOnlyState;
  className?: string;
  /** Extra actions (e.g. link to Modules & Plan). */
  actions?: ReactNode;
};

/**
 * Shared read-only banner for Subscription Expired and Academic Year Locked.
 * Use anywhere mutations must be blocked while viewing remains allowed.
 */
export function PlatformReadOnlyBanner({
  state: stateProp,
  className = "",
  actions,
}: PlatformReadOnlyBannerProps) {
  const state = stateProp ?? loadPlatformReadOnlyState();
  if (!isPlatformReadOnly(state)) return null;

  const reasons = getActiveReadOnlyReasons(state);

  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm ${className}`}
    >
      <div className="font-semibold text-amber-950 dark:text-amber-100">Read only</div>
      <ul className="mt-2 space-y-2">
        {reasons.map((reason) => (
          <ReasonRow key={reason} reason={reason} state={state} />
        ))}
      </ul>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function ReasonRow({
  reason,
  state,
}: {
  reason: PlatformReadOnlyReason;
  state: PlatformReadOnlyState;
}) {
  const copy = PLATFORM_READONLY_COPY[reason];
  const detail =
    reason === "subscription_expired"
      ? state.subscriptionMessage ?? copy.body
      : state.academicYearMessage ?? copy.body;

  return (
    <li>
      <div className="font-medium">{copy.title}</div>
      <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">{detail}</p>
    </li>
  );
}

/**
 * Shared gate: when platform is read-only, hide write UI and show children as view-only.
 */
export function PlatformReadOnlyGate({
  state: stateProp,
  children,
  writeFallback,
}: {
  state?: PlatformReadOnlyState;
  children: ReactNode;
  /** Shown instead of write controls when locked. */
  writeFallback?: ReactNode;
}) {
  const state = stateProp ?? loadPlatformReadOnlyState();
  if (isPlatformReadOnly(state)) {
    return (
      <>
        <PlatformReadOnlyBanner state={state} className="mb-4" />
        {writeFallback ?? null}
      </>
    );
  }
  return <>{children}</>;
}
