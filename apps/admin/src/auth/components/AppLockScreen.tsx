/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — App Lock Screen
 *  Banking-style PIN entry shown on every app launch while
 *  the user session remains active.
 * ───────────────────────────────────────────────────────────── */

import { IconChip } from "@/components/IconChip";
import { useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Delete,
  Lock,
  Sparkles,
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
          ? "h-14 sm:h-16 text-xl bg-card border border-border shadow-sm hover:bg-muted/50 hover:border-primary/25"
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
      <div className="size-16 rounded-2xl border border-primary/20 bg-primary flex items-center justify-center shadow-sm">
        <span className="text-[10px] font-bold text-primary-foreground text-center px-2 leading-tight">
          {logo.slice(0, 12)}
        </span>
      </div>
    );
  }

  return (
    <IconChip icon={Building2} size="lg" className="!size-16 !rounded-2xl shadow-sm border border-primary/20" />
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

  const instituteName = instituteProfile.name || user?.instituteName || "LumenX Institute";
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
        const ok = await mockVerifyAppPin(user.id, value);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/30 text-foreground">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.04] rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-center px-6 py-5 border-b border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground">
          <IconChip icon={Sparkles} size="xs" />
          <span className="text-xs font-semibold tracking-widest uppercase">LumenX Admin</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[22rem]">

          {/* Institute + user */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <InstituteLogo name={instituteName} logo={logo} />
            </div>
            <h1 className="text-base font-bold tracking-tight truncate px-2">{instituteName}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">
              Secure session
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-sm">
              <div className="size-11 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-sm font-bold text-primary shrink-0">
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
          <div className="rounded-3xl border border-border bg-card shadow-elevated p-6 sm:p-7">
            <div className="flex items-center justify-center gap-2 mb-1">
              <IconChip icon={Lock} size="xs" />
              <h2 className="text-sm font-semibold">Enter 6-Digit Security PIN</h2>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mb-6">
              Required every time you open the app
            </p>

            <div className="mb-6 min-h-[20px] flex justify-center">
              <PinDots
                length={PIN_LENGTH}
                filled={pin.length}
                error={shake}
              />
            </div>

            {verifying && (
              <p className="text-center text-[11px] text-muted-foreground mb-4 animate-pulse">
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

            {!showTouchKeypad && (
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

          <div className="mt-6 text-center">
            <Link
              to="/forgot-pin"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot PIN?
            </Link>
          </div>

          <p className="mt-8 text-center text-[10px] text-muted-foreground/60 leading-relaxed">
            Demo PIN for all accounts: <span className="font-mono font-semibold">123456</span>
          </p>
        </div>
      </main>
    </div>
  );
}
