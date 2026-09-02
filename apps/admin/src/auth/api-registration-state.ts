/**
 * In-memory API registration snapshot for sync registration gate + pending UI.
 * Never persisted to localStorage — refreshed from GET /api/v1/registrations/me.
 */
import { ApiClientError } from "@/lib/api";
import { fetchOwnRegistration } from "@/lib/registrations/api";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

export type ApiRegistrationView = {
  boundUserId: string | null;
  /** undefined = not loaded yet; null = loaded, no registration row. */
  snapshot: InstituteRegistrationDto | null | undefined;
  syncError: string | null;
  loaded: boolean;
  syncing: boolean;
};

let boundUserId: string | null = null;
let snapshot: InstituteRegistrationDto | null | undefined = undefined;
let syncError: string | null = null;
let loaded = false;
let syncing = false;

const EMPTY_VIEW: ApiRegistrationView = {
  boundUserId: null,
  snapshot: undefined,
  syncError: null,
  loaded: false,
  syncing: false,
};

let cachedView: ApiRegistrationView = EMPTY_VIEW;

function refreshCachedView(): ApiRegistrationView {
  if (
    cachedView.boundUserId === boundUserId &&
    cachedView.snapshot === snapshot &&
    cachedView.syncError === syncError &&
    cachedView.loaded === loaded &&
    cachedView.syncing === syncing
  ) {
    return cachedView;
  }
  cachedView = { boundUserId, snapshot, syncError, loaded, syncing };
  return cachedView;
}

const listeners = new Set<() => void>();

function emit(): void {
  refreshCachedView();
  listeners.forEach((listener) => listener());
}

export function subscribeApiRegistration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiRegistrationView(): ApiRegistrationView {
  return refreshCachedView();
}

/** Stable SSR / hydration snapshot for useSyncExternalStore. */
export function getApiRegistrationServerSnapshot(): ApiRegistrationView {
  return EMPTY_VIEW;
}

/** @deprecated Prefer getApiRegistrationView().snapshot */
export function getApiRegistrationSnapshot():
  | InstituteRegistrationDto
  | null
  | undefined {
  return snapshot;
}

export function setApiRegistrationSnapshot(
  registration: InstituteRegistrationDto | null,
  userId?: string | null,
): void {
  if (userId !== undefined) {
    boundUserId = userId;
  } else if (registration?.applicantUserId) {
    boundUserId = registration.applicantUserId;
  }
  snapshot = registration;
  syncError = null;
  loaded = true;
  syncing = false;
  emit();
}

export function clearApiRegistrationSnapshot(): void {
  boundUserId = null;
  snapshot = undefined;
  syncError = null;
  loaded = false;
  syncing = false;
  cachedView = EMPTY_VIEW;
  emit();
}

/** Bind snapshot lifecycle to the authenticated user — clears stale rows on account change. */
export function bindApiRegistrationUser(userId: string | null): void {
  if (boundUserId === userId) return;
  boundUserId = userId;
  snapshot = undefined;
  syncError = null;
  loaded = false;
  syncing = false;
  emit();
}

function toSyncError(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unable to load registration status.";
}

/** Fetch own registration; 404 → null. Never falls back to demo store. */
export async function syncApiRegistrationFromBackend(): Promise<
  InstituteRegistrationDto | null
> {
  if (!boundUserId) {
    throw new Error("Registration sync requires a bound user id.");
  }

  syncing = true;
  syncError = null;
  emit();

  try {
    const registration = await fetchOwnRegistration();
    if (registration.applicantUserId !== boundUserId) {
      snapshot = null;
      loaded = true;
      syncing = false;
      emit();
      return null;
    }
    snapshot = registration;
    loaded = true;
    syncing = false;
    emit();
    return registration;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      snapshot = null;
      loaded = true;
      syncing = false;
      emit();
      return null;
    }
    syncError = toSyncError(err);
    loaded = true;
    syncing = false;
    emit();
    throw err;
  }
}

/** Drop cached registration so the next sync hits the backend. */
export function invalidateApiRegistrationCache(): void {
  loaded = false;
  snapshot = undefined;
  syncError = null;
  emit();
}

/** Ensure registration status is loaded for the current API user. */
export async function ensureApiRegistrationForUser(
  userId: string,
  opts?: { force?: boolean },
): Promise<InstituteRegistrationDto | null> {
  bindApiRegistrationUser(userId);
  if (loaded && !opts?.force) {
    return snapshot ?? null;
  }
  try {
    return await syncApiRegistrationFromBackend();
  } catch {
    return null;
  }
}
