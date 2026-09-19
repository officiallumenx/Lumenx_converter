/**
 * Settings → Security: enable / change / disable Nexus app lock (4–8 digit PIN).
 */

import { useState, useSyncExternalStore } from "react";
import { Button, Field, TextInput } from "@lumenx/ui-admin";
import {
  appLockStore,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
} from "@/lib/app-lock-store";

export function NexusAppLockSettings() {
  const enabled = useSyncExternalStore(appLockStore.subscribe, appLockStore.isEnabled, () => false);
  const hasPin = useSyncExternalStore(appLockStore.subscribe, appLockStore.hasPin, () => false);
  const [mode, setMode] = useState<"idle" | "create" | "change">("idle");
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const resetDrafts = () => {
    setPinDraft("");
    setPinConfirm("");
    setCurrentPin("");
    setError(null);
    setMode("idle");
  };

  const onToggle = () => {
    setFlash(null);
    setError(null);
    if (enabled) {
      appLockStore.disable();
      setFlash("App lock turned off. Your PIN is saved for next time.");
      return;
    }
    if (appLockStore.hasPin()) {
      appLockStore.enableWithExistingPin();
      setFlash("App lock enabled with your saved PIN.");
      return;
    }
    setMode("create");
    setPinDraft("");
    setPinConfirm("");
  };

  const saveNewPin = () => {
    setError(null);
    if (!appLockStore.isValidPin(pinDraft)) {
      setError(`Enter a ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digit PIN.`);
      return;
    }
    if (pinDraft !== pinConfirm) {
      setError("PINs do not match.");
      return;
    }
    appLockStore.enableWithPin(pinDraft);
    resetDrafts();
    setFlash("App lock enabled. PIN stays on this device.");
  };

  const saveChangedPin = () => {
    setError(null);
    if (!appLockStore.verifyPin(currentPin)) {
      setError("Current PIN is incorrect.");
      return;
    }
    if (!appLockStore.isValidPin(pinDraft)) {
      setError(`New PIN must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits.`);
      return;
    }
    if (pinDraft !== pinConfirm) {
      setError("New PINs do not match.");
      return;
    }
    appLockStore.updatePin(pinDraft);
    resetDrafts();
    setFlash("PIN updated.");
  };

  const digitsOnly = (v: string) => v.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">App lock</div>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
            {hasPin
              ? `Protect Nexus on this device with a ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digit PIN. No login required.`
              : `Set a ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digit PIN to lock Nexus when you leave the tab or reopen the app.`}
          </p>
        </div>
        <Button
          size="sm"
          variant={enabled ? "outline" : "primary"}
          onClick={onToggle}
          disabled={mode !== "idle"}
        >
          {enabled ? "Turn off" : "Turn on"}
        </Button>
      </div>

      {hasPin && mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("change")}>
            Change PIN
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              appLockStore.lockSession();
              setFlash("Session locked. Enter PIN to continue.");
            }}
            disabled={!enabled}
          >
            Lock now
          </Button>
        </div>
      ) : null}

      {flash ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {flash}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
          <div className="text-sm font-medium">Create app lock PIN</div>
          <Field label={`PIN (${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits)`}>
            <TextInput
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={pinDraft}
              onChange={(e) => setPinDraft(digitsOnly(e.target.value))}
              placeholder={`${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits`}
            />
          </Field>
          <Field label="Confirm PIN">
            <TextInput
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(digitsOnly(e.target.value))}
              placeholder="Re-enter PIN"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={saveNewPin}>
              Save PIN
            </Button>
            <Button size="sm" variant="ghost" onClick={resetDrafts}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "change" ? (
        <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
          <div className="text-sm font-medium">Change PIN</div>
          <Field label="Current PIN">
            <TextInput
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(digitsOnly(e.target.value))}
            />
          </Field>
          <Field label={`New PIN (${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits)`}>
            <TextInput
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={pinDraft}
              onChange={(e) => setPinDraft(digitsOnly(e.target.value))}
            />
          </Field>
          <Field label="Confirm new PIN">
            <TextInput
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(digitsOnly(e.target.value))}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={saveChangedPin}>
              Update PIN
            </Button>
            <Button size="sm" variant="ghost" onClick={resetDrafts}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
