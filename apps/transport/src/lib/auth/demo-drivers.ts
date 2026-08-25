import { DEMO_TRANSPORT_OTP } from "@lumenx/auth";
import { findDriverAccountByPhone } from "@lumenx/utils";

import type { DriverProfile } from "@/lib/transport/types";

export type DemoDriver = DriverProfile;

/** Normalize to 10-digit Indian mobile (strips +91 / leading 0). */
export function normalizeIndianMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(phone: string): boolean {
  return normalizeIndianMobile(phone).length === 10;
}

export function formatIndianMobile(phone: string): string {
  const digits = normalizeIndianMobile(phone);
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Resolve driver profile from Admin-created Transport app accounts (ops bridge). */
export function findDriverByPhone(phone: string): DemoDriver | null {
  const digits = normalizeIndianMobile(phone);
  if (digits.length !== 10) return null;

  const account = findDriverAccountByPhone(digits);
  if (!account || account.status !== "active") return null;

  return {
    id: account.id,
    name: account.name,
    phone: formatIndianMobile(digits),
    employeeId: account.employeeId,
    licenseNumber: account.licenseNumber,
    busNumber: account.vehicleNumber ?? "—",
  };
}

export function isValidTransportOtp(otp: string): boolean {
  return otp.replace(/\D/g, "") === DEMO_TRANSPORT_OTP;
}
