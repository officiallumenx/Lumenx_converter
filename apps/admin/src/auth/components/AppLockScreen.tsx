/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — App Lock Screen
 *  Banking-style PIN entry shown on every app launch while
 *  the user session remains active.
 * ───────────────────────────────────────────────────────────── */

import { IconChip } from "@/components/IconChip";
import { LumenXAdminLogo } from "@/components/LumenXAdminLogo";
import { useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Delete,
  Lock,
} from "lucide-react";

import { useAuth } from "@/auth/AuthContext";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  PIN_LENGTH,
  MAX_PIN_ATTEMPTS,
  mockVerifyAppPin,
  setAppUnlocked,
} from "@/auth/app-lock-store";
import { usePrefersTouchKeypad } from "@/auth/hooks/usePrefersTouchKeypad";

interface AppLockScreenProps {
  onUnlocked: () => void;
}

function PinDots({ length, filled, error }: { length: number; filled: number; error: boolean }) {
  return (
    <div
      className={[
        "flex items-center justify-center gap-3.5",
        error ? "animate-shake" : "",
      ].join(" ")}
      aria-hidden
    >
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={[
            "size-3.5 rounded-full border-2 transition-all duration-150",
            i < filled
              ? error
                ? "bg-destructive border-destructive scale-110"
                : "bg-primary border-primary scale-110"
              : "bg-transparent border-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function KeypadButton({
  label,
  onClick,
  disabled,
  variant = "digit",
}: {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "digit" | "action";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex items-center justify-center rounded-2xl font-semibold transition-all",
        "active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
        variant === "digit"
          ? "h-14 sm:h-16 border border-border bg-card text-xl shadow-xs hover:border-border-strong hover:bg-muted/50"
          : "h-14 sm:h-16 text-sm bg-muted/40 border border-border hover:bg-muted/70",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function InstituteLogo({ name, logo }: { name: string; logo: string }) {
  const isImage = logo.startsWith("data:") || logo.startsWith("http");

  if (isImage) {
    return (
      <div className="size-16 rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
        <img src={logo} alt={`${name} logo`} className="size-full object-cover" />
      </div>
    );
  }

  if (logo) {
    return (
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted shadow-xs">
        <span className="px-2 text-center text-[10px] font-bold leading-tight text-foreground">
          {logo.slice(0, 12)}
        </span>
      </div>
    );
  }

  return (
    <IconChip icon={Building2} size="lg" className="!size-16 !rounded-2xl border border-border shadow-xs" />
  );
}

export function AppLockScreen({ onUnlocked }: AppLockScreenProps) {
  const { user } = useAuth();
  const { instituteProfile } = useDemoProfile();
  const showTouchKeypad = usePrefersTouchKeypad();

  const [pin, setPin]       = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake]   = useState(false);

  const instituteName = instituteProfile.name || user?.instituteName || "Test1School";
  const logo          = instituteProfile.logo ?? "";
  const userName      = user?.name ?? "Administrator";
  const userTitle     = user?.title ?? "";
  const initials      = user?.initials ?? "LX";

  const lockedOut = attempts >= MAX_PIN_ATTEMPTS;

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const verifyPin = useCallback(
    async (value: string) => {
      if (!user || value.length !== PIN_LENGTH || verifying || lockedOut) return;

      setVerifying(true);
      setError(null);
      try {
        const ok = await mockVerifyAppPin(user.id, value, user.email);
        if (ok) {
          setAppUnlocked(true);
          onUnlocked();
        } else {
          const next = attempts + 1;
          setAttempts(next);
          setPin("");
          triggerShake();
          if (next >= MAX_PIN_ATTEMPTS) {
            setError("Too many attempts. Use Forgot PIN or sign out and try again.");
          } else {
            setError(`Incorrect PIN. ${MAX_PIN_ATTEMPTS - next} attempt${MAX_PIN_ATTEMPTS - next === 1 ? "" : "s"} remaining.`);
          }
        }
      } finally {
        setVerifying(false);
      }
    },
    [user, verifying, lockedOut, attempts, onUnlocked, triggerShake],
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (lockedOut || verifying) return;
      setError(null);
      setPin((current) => {
        if (current.length >= PIN_LENGTH) return current;
        const next = current + digit;
        if (next.length === PIN_LENGTH) {
          queueMicrotask(() => {
            void verifyPin(next);
          });
        }
        return next;
      });
    },
    [lockedOut, verifying, verifyPin],
  );

  const deleteDigit = useCallback(() => {
    if (verifying) return;
    setError(null);
    setPin((current) => current.slice(0, -1));
  }, [verifying]);

  // Physical keyboard (desktop / laptop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lockedOut || verifying) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteDigit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lockedOut, verifying, appendDigit, deleteDigit]);

  return (
    <div className="flex min-h-screen-dvh flex-col bg-background text-foreground">
      <header className="lx-auth-top-bar relative z-10 flex items-center justify-center border-b border-border">
        <LumenXAdminLogo size="sm" className="max-h-8" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[22rem]">

          {/* Institute + user */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <InstituteLogo name={instituteName} logo={logo} />
            </div>
            <h1 className="truncate px-2 text-base font-bold tracking-tight">{instituteName}</h1>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              Secure session
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xs">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground">
                {initials}
              </div>
              <div className="text-left min-w-0">
                <div className="text-sm font-semibold truncate">{userName}</div>
                {userTitle && (
                  <div className="text-[11px] text-muted-foreground truncate">{userTitle}</div>
                )}
              </div>
            </div>
          </div>

          {/* PIN card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
            <div className="mb-1 flex items-center justify-center gap-2">
              <IconChip icon={Lock} size="xs" />
              <h2 className="text-sm font-semibold">Enter 6-Digit Security PIN</h2>
            </div>
            <p className="mb-6 text-center text-[11px] text-muted-foreground">
              Use the 6-digit Security PIN from signup (not your login password)
            </p>

            <div className="mb-6 flex min-h-[20px] justify-center">
              <PinDots
                length={PIN_LENGTH}
                filled={pin.length}
                error={shake}
              />
            </div>

            {verifying && (
              <p className="mb-4 text-center text-[11px] text-muted-foreground">
                Verifying…
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="text-center text-[11px] text-destructive mb-4 leading-relaxed px-1"
              >
                {error}
              </p>
            )}

            {lockedOut && (
              <p className="text-center text-[11px] text-muted-foreground mb-4 px-1">
                Keypad is locked. Reset your PIN below, then try again.
              </p>
            )}

            {!showTouchKeypad && !lockedOut && (
              <p className="text-center text-[11px] text-muted-foreground mb-4">
                Type your PIN on the keyboard · Backspace to delete
              </p>
            )}

            {/* On-screen keypad — touch / mobile only */}
            {showTouchKeypad && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <KeypadButton
                  key={d}
                  label={d}
                  onClick={() => appendDigit(d)}
                  disabled={lockedOut || verifying}
                />
              ))}
              <div />
              <KeypadButton
                label="0"
                onClick={() => appendDigit("0")}
                disabled={lockedOut || verifying}
              />
              <KeypadButton
                label={<Delete className="size-5" />}
                onClick={deleteDigit}
                disabled={lockedOut || verifying || pin.length === 0}
                variant="action"
              />
            </div>
            )}
          </div>

          <div className="mt-6 text-center space-y-2">
            <Link
              to="/forgot-pin"
              className="text-xs font-medium text-primary hover:underline"
            >
              {lockedOut ? "Reset PIN to continue" : "Forgot PIN?"}
            </Link>
            <p className="text-[10px] text-muted-foreground px-4">
              Demo accounts use PIN 123456. Registered institutes use the PIN
              chosen during signup.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
