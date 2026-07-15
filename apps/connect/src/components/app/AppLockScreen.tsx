import { useCallback, useEffect, useState } from "react";
import { getInitials } from "@lumenx/utils";
import { Delete, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { LumenXLogo } from "@/components/app/LumenXLogo";
import { AppLockForgotPinFlow } from "@/components/app/AppLockPinFlows";
import {
  appLockStore,
  MAX_PIN_ATTEMPTS,
  PIN_LENGTH,
} from "@/lib/app-lock-store";
import { cn } from "@lumenx/ui";
import { Button } from "@lumenx/ui";

function PinDots({ filled, error }: { filled: number; error: boolean }) {
  return (
    <div className={cn("flex items-center justify-center gap-3", error && "animate-shake")}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "size-3 rounded-full border-2 transition-all",
            i < filled
              ? error
                ? "border-destructive bg-destructive scale-110"
                : "border-primary bg-primary scale-110"
              : "border-border bg-transparent",
          )}
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
      className={cn(
        "connect-keypad-btn flex items-center justify-center rounded-2xl font-semibold",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "digit"
          ? "h-14 text-xl border border-border bg-card shadow-soft hover:bg-muted/40"
          : "h-14 border border-border bg-muted/30 hover:bg-muted/50",
      )}
    >
      {label}
    </button>
  );
}

export function AppLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const { user, role, institute, activeInstituteId } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const lockedOut = attempts >= MAX_PIN_ATTEMPTS;
  const initials = user?.name != null ? getInitials(user.name, 2) : "LX";

  const triggerShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  }, []);

  const verify = useCallback(
    async (value: string) => {
      if (value.length !== PIN_LENGTH || verifying || lockedOut) return;
      setVerifying(true);
      setError(null);
      try {
        const ok = await appLockStore.verifyPinAsync(value);
        if (ok) {
          appLockStore.setUnlocked(true);
          onUnlocked();
        } else {
          const next = attempts + 1;
          setAttempts(next);
          setPin("");
          triggerShake();
          if (next >= MAX_PIN_ATTEMPTS) {
            setError("Too many attempts. Turn off app lock in Settings or try again later.");
          } else {
            setError(
              `Incorrect PIN. ${MAX_PIN_ATTEMPTS - next} attempt${MAX_PIN_ATTEMPTS - next === 1 ? "" : "s"} left.`,
            );
          }
        }
      } finally {
        setVerifying(false);
      }
    },
    [attempts, lockedOut, onUnlocked, triggerShake, verifying],
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (lockedOut || verifying) return;
      setError(null);
      setPin((current) => {
        if (current.length >= PIN_LENGTH) return current;
        const next = current + digit;
        if (next.length === PIN_LENGTH) void verify(next);
        return next;
      });
    },
    [lockedOut, verify, verifying],
  );

  const deleteDigit = useCallback(() => {
    if (verifying) return;
    setError(null);
    setPin((current) => current.slice(0, -1));
  }, [verifying]);

  useEffect(() => {
    if (forgotOpen || lockedOut || verifying) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        deleteDigit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appendDigit, deleteDigit, forgotOpen, lockedOut, verifying]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-background text-foreground safe-area-pt">
      <header className="flex items-center justify-center border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <LumenXLogo size="sm" />
          <span className="text-sm font-semibold">LumenX Connect</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[22rem] space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary font-display text-lg font-bold">
              {initials}
            </div>
            <h1 className="font-semibold">{user?.name ?? "Welcome back"}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {institute?.name ?? "Enter your PIN to continue"}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-1 flex items-center justify-center gap-2 text-sm font-semibold">
              <Lock className="size-4 text-primary" />
              Enter 6-digit PIN
            </div>
            <p className="mb-5 text-center text-[11px] text-muted-foreground">
              Required while app lock is on
            </p>

            <div className="mb-4 flex justify-center">
              <PinDots filled={pin.length} error={shake} />
            </div>

            {verifying && (
              <p className="mb-3 text-center text-xs text-muted-foreground animate-pulse">Checking…</p>
            )}
            {error && (
              <p role="alert" className="mb-3 text-center text-xs text-destructive leading-relaxed">
                {error}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2.5">
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
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl text-xs text-primary touch-manipulation"
            onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur?.();
              setForgotOpen(true);
            }}
          >
            Forgot PIN?
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl text-xs text-muted-foreground"
            asChild
          >
            <Link to="/profile">Open Settings to manage app lock</Link>
          </Button>
        </div>
      </main>

      <AppLockForgotPinFlow
        active={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSuccess={onUnlocked}
        phone={user?.phone ?? ""}
        role={role}
        instituteId={activeInstituteId}
      />
    </div>
  );
}
