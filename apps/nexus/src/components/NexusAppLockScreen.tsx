/**
 * Full-screen Nexus app lock — 4–8 digit PIN unlock (no login).
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Delete, Hexagon, Lock } from "lucide-react";
import {
  appLockStore,
  MAX_PIN_ATTEMPTS,
  PIN_MAX_LENGTH,
} from "@/lib/app-lock-store";

function PinDots({
  filled,
  total,
  error,
}: {
  filled: number;
  total: number;
  error: boolean;
}) {
  return (
    <div className={`flex items-center justify-center gap-2.5 ${error ? "animate-pulse" : ""}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={[
            "size-3 rounded-full border-2 transition-all",
            i < filled
              ? error
                ? "border-destructive bg-destructive scale-110"
                : "border-primary bg-primary scale-110"
              : "border-border bg-transparent",
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
        "flex h-14 items-center justify-center rounded-xl font-semibold transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "digit"
          ? "border border-border bg-surface text-xl hover:bg-surface-hover"
          : "border border-border bg-muted/30 hover:bg-muted/50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function NexusAppLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const pinLength = useSyncExternalStore(
    appLockStore.subscribe,
    appLockStore.getPinLength,
    () => 6,
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);

  const lockedOut = attempts >= MAX_PIN_ATTEMPTS;
  const dots = Math.min(PIN_MAX_LENGTH, Math.max(4, pinLength || 6));

  const triggerShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  }, []);

  const verify = useCallback(
    async (value: string) => {
      if (value.length !== pinLength || verifying || lockedOut) return;
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
            setError("Too many attempts. Turn off app lock in Settings → Security.");
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
    [attempts, lockedOut, onUnlocked, pinLength, triggerShake, verifying],
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (lockedOut || verifying) return;
      setError(null);
      setPin((current) => {
        if (current.length >= pinLength) return current;
        const next = current + digit;
        if (next.length === pinLength) void verify(next);
        return next;
      });
    },
    [lockedOut, pinLength, verifying, verify],
  );

  const deleteDigit = useCallback(() => {
    if (verifying) return;
    setError(null);
    setPin((current) => current.slice(0, -1));
  }, [verifying]);

  useEffect(() => {
    if (lockedOut || verifying) return;
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
  }, [appendDigit, deleteDigit, lockedOut, verifying]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-center border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Hexagon className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">LumenX Nexus</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[22rem] space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-6" />
            </div>
            <h1 className="font-semibold">App locked</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your {pinLength || 4}–digit PIN to open Nexus
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated">
            <div className="mb-5 flex justify-center">
              <PinDots filled={pin.length} total={dots} error={shake} />
            </div>

            {verifying ? (
              <p className="mb-3 text-center text-xs text-muted-foreground animate-pulse">
                Checking…
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mb-3 text-center text-xs text-destructive leading-relaxed">
                {error}
              </p>
            ) : null}

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

          <Link
            to="/settings"
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Open Settings → Security to manage app lock
          </Link>
        </div>
      </main>
    </div>
  );
}
