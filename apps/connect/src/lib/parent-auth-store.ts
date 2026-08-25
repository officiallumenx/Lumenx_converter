import { DEMO_CONNECT_PASSWORD } from "@lumenx/auth";
import { normalizePhoneDigits } from "@lumenx/utils";
import { readDemoProfileId } from "@lumenx/types";

const DIRECTORY_KEY_PREFIX = "lumenx.admin.parents.v2";

type ParentDirectoryRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  accessStatus?: "active" | "hold" | "suspended";
  inviteStatus?: "active" | "pending";
};

export type ParentSignInResult =
  | { ok: true; displayName?: string }
  | { ok: false; error: string };

function normalizePhone(phone: string): string {
  return normalizePhoneDigits(phone);
}

function loadParentDirectory(): ParentDirectoryRecord[] {
  try {
    const raw = localStorage.getItem(`${DIRECTORY_KEY_PREFIX}.${readDemoProfileId()}`);
    if (!raw) return [];
    return JSON.parse(raw) as ParentDirectoryRecord[];
  } catch {
    return [];
  }
}

function findParentByPhone(phone: string): ParentDirectoryRecord | null {
  const digits = normalizePhone(phone);
  if (!/^\d{10}$/.test(digits)) return null;
  return (
    loadParentDirectory().find((parent) => normalizePhone(parent.phone) === digits) ?? null
  );
}

/**
 * Parent Connect login is phone + password only (no email login).
 * Admin-provisioned accounts use the directory password for that phone.
 * Unknown phones still accept the shared demo password for existing demos.
 */
export function attemptParentPassword(phone: string, password: string): ParentSignInResult {
  const digits = normalizePhone(phone);
  if (!/^\d{10}$/.test(digits)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const parent = findParentByPhone(digits);
  if (parent) {
    if (parent.accessStatus === "suspended") {
      return { ok: false, error: "This parent account is suspended. Contact the institute." };
    }
    if (parent.accessStatus === "hold") {
      return { ok: false, error: "This parent account is on hold. Contact the institute." };
    }
    if (password !== parent.password) {
      return { ok: false, error: "Incorrect password for this mobile number." };
    }
    return { ok: true, displayName: parent.name };
  }

  if (password !== DEMO_CONNECT_PASSWORD) {
    return {
      ok: false,
      error: `No parent account for this mobile. Use an Admin-issued phone, or demo password ${DEMO_CONNECT_PASSWORD}.`,
    };
  }
  return { ok: true };
}

export function getParentAccountDisplayName(phone: string): string | undefined {
  return findParentByPhone(phone)?.name;
}
