/**
 * Admin Home birthday board.
 *
 * Source of truth: student directory DOB + teacher directory DOB.
 * Today = month/day match (year ignored). Leap-day DOBs celebrate 28 Feb
 * in non-leap years. Wish flow: open WhatsApp with a pre-filled message,
 * then mark the person wished for today so the board can be cleared.
 */

import { normalizePhoneDigits } from "@lumenx/utils";
import type { TeacherRecord } from "@lumenx/types";
import {
  loadStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";
import { loadTeacherDirectory } from "@/lib/career-to-teacher";

export const BIRTHDAY_UPCOMING_DAYS = 7;
export const BIRTHDAY_WISHES_KEY = "lumenx.admin.birthday-wishes.v1";
export const BIRTHDAY_WISHES_EVENT = "lumenx-birthday-wishes-changed";

export type BirthdayRole = "Student" | "Teacher";

export type BirthdayPerson = {
  id: string;
  name: string;
  role: BirthdayRole;
  detail: string;
  phone: string;
  dateOfBirth: string;
  turningAge: number;
  daysUntil: number;
  href?: string;
};

export type BirthdayBoard = {
  today: BirthdayPerson[];
  upcoming: BirthdayPerson[];
};

export type ParsedDob = { year: number; month: number; day: number };

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function parseDateOfBirth(raw: string | undefined | null): ParsedDob | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }
  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function celebrateDay(dob: ParsedDob, year: number): number {
  if (dob.month === 2 && dob.day === 29 && !isLeapYear(year)) return 28;
  return dob.day;
}

export function nextBirthdayDate(dob: ParsedDob, from: Date): Date {
  const start = startOfDay(from);
  const year = start.getFullYear();
  const thisYear = new Date(year, dob.month - 1, celebrateDay(dob, year));
  if (thisYear >= start) return thisYear;
  const nextYear = year + 1;
  return new Date(nextYear, dob.month - 1, celebrateDay(dob, nextYear));
}

export function daysUntilNextBirthday(dob: ParsedDob, from: Date): number {
  const next = nextBirthdayDate(dob, from);
  const start = startOfDay(from);
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}

export function ageOnDate(dob: ParsedDob, on: Date): number {
  let age = on.getFullYear() - dob.year;
  const hadBirthday =
    on.getMonth() + 1 > dob.month ||
    (on.getMonth() + 1 === dob.month && on.getDate() >= celebrateDay(dob, on.getFullYear()));
  if (!hadBirthday) age -= 1;
  return Math.max(age, 0);
}

export function turningAgeOnBirthday(dob: ParsedDob, from: Date): number {
  const next = nextBirthdayDate(dob, from);
  return next.getFullYear() - dob.year;
}

export function whatsAppRecipientId(phone: string): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Prefer last-10 / strip India 91 so wa.me always gets a stable E.164-ish id.
  const local = normalizePhoneDigits(raw);
  if (local.length === 10) return `91${local}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export type BirthdayWishBranding = {
  instituteName: string;
  principalName?: string | null;
};

function resolveWishBranding(
  branding: string | BirthdayWishBranding,
): { instituteName: string; principalName: string } {
  if (typeof branding === "string") {
    return {
      instituteName: branding.trim() || "our school",
      principalName: "Principal",
    };
  }
  return {
    instituteName: branding.instituteName?.trim() || "our school",
    principalName: branding.principalName?.trim() || "Principal",
  };
}

const PARTY = String.fromCodePoint(0x1f389); // 🎉
const CAKE = String.fromCodePoint(0x1f382); // 🎂
const STAR = String.fromCodePoint(0x1f31f); // 🌟

export function birthdayWishMessage(
  person: Pick<BirthdayPerson, "name" | "role">,
  branding: string | BirthdayWishBranding,
): string {
  const { instituteName, principalName } = resolveWishBranding(branding);
  if (person.role === "Student") {
    return [
      `${PARTY} Happy Birthday, ${person.name}!`,
      `Wishing you a day filled with happiness, laughter, and wonderful memories. Keep learning, keep growing, and keep shining! ${STAR} ${CAKE}`,
      "",
      `Warm wishes from ${instituteName}`,
      `Principal: ${principalName}`,
    ].join("\n");
  }
  return [
    `${CAKE} Happy Birthday, ${person.name}!`,
    `Wishing you happiness, success, and a wonderful year ahead. Thank you for inspiring our students every day! ${STAR}`,
    "",
    `Warm wishes from ${instituteName}`,
    `Principal: ${principalName}`,
  ].join("\n");
}

function birthdayWhatsAppHref(recipient: string, text: string): string {
  // api.whatsapp.com preserves UTF-8 emoji better than some wa.me handoffs.
  return `https://api.whatsapp.com/send?phone=${recipient}&text=${text}`;
}

export function birthdayWhatsAppUrl(
  person: BirthdayPerson,
  branding: string | BirthdayWishBranding,
): string | null {
  const recipient = whatsAppRecipientId(person.phone);
  if (!recipient) return null;
  return birthdayWhatsAppHref(
    recipient,
    encodeURIComponent(birthdayWishMessage(person, branding)),
  );
}

/**
 * WhatsApp wish URL.
 * Requires a resolvable phone so the chat opens directly to the linked number.
 */
export function birthdayWhatsAppComposeUrl(
  person: Pick<BirthdayPerson, "name" | "role" | "phone">,
  branding: string | BirthdayWishBranding,
): string | null {
  const recipient = whatsAppRecipientId(person.phone);
  if (!recipient) return null;
  return birthdayWhatsAppHref(
    recipient,
    encodeURIComponent(birthdayWishMessage(person, branding)),
  );
}

function openWhatsAppUrl(url: string): void {
  // Prefer an anchor click so mobile browsers hand off emoji text cleanly.
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function openBirthdayWhatsAppCompose(
  person: Pick<BirthdayPerson, "id" | "name" | "role" | "phone">,
  branding: string | BirthdayWishBranding,
): boolean {
  const url = birthdayWhatsAppComposeUrl(person, branding);
  if (!url) return false;
  openWhatsAppUrl(url);
  if (person.id) markBirthdayWished(person.id);
  return true;
}

function wishKey(personId: string, day: Date): string {
  return `${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(day.getDate())}:${personId}`;
}

export function loadWishedBirthdayIds(day = new Date()): Set<string> {
  try {
    const raw = localStorage.getItem(BIRTHDAY_WISHES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, string>;
    const prefix = wishKey("", day).slice(0, 11);
    const ids = new Set<string>();
    for (const key of Object.keys(parsed)) {
      if (key.startsWith(prefix)) ids.add(key.slice(prefix.length));
    }
    return ids;
  } catch {
    return new Set();
  }
}

export function markBirthdayWished(personId: string, day = new Date()): void {
  try {
    const raw = localStorage.getItem(BIRTHDAY_WISHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[wishKey(personId, day)] = new Date().toISOString();
    localStorage.setItem(BIRTHDAY_WISHES_KEY, JSON.stringify(parsed));
  } catch {
    // Keep in-memory UI state when storage is unavailable.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BIRTHDAY_WISHES_EVENT));
  }
}

export function subscribeBirthdayWishes(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BIRTHDAY_WISHES_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(BIRTHDAY_WISHES_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function studentEligible(student: StudentDirectoryRecord): boolean {
  if (student.status === "inactive") return false;
  return true;
}

function toStudentPerson(
  student: StudentDirectoryRecord,
  dob: ParsedDob,
  from: Date,
): BirthdayPerson {
  const daysUntil = daysUntilNextBirthday(dob, from);
  const classLabel = [student.grade, student.rollNo ? `Roll ${student.rollNo}` : null]
    .filter(Boolean)
    .join(" \u00b7 ");
  return {
    id: student.id,
    name: student.name,
    role: "Student",
    detail: classLabel || "Student",
    phone: student.parentPhone || student.connectAccount?.phone || student.emergencyContact || "",
    dateOfBirth: student.dateOfBirth ?? "",
    turningAge: turningAgeOnBirthday(dob, from),
    daysUntil,
    href: `/students/${student.id}`,
  };
}

function toTeacherPerson(teacher: TeacherRecord, dob: ParsedDob, from: Date): BirthdayPerson {
  return {
    id: teacher.id,
    name: teacher.name,
    role: "Teacher",
    detail: [teacher.dept, teacher.role === "activity-coordinator" ? "Activity" : "Faculty"]
      .filter(Boolean)
      .join(" \u00b7 "),
    phone: teacher.phone,
    dateOfBirth: teacher.dateOfBirth ?? "",
    turningAge: turningAgeOnBirthday(dob, from),
    daysUntil: daysUntilNextBirthday(dob, from),
    href: "/teachers",
  };
}

export function buildBirthdayBoard(input: {
  students: StudentDirectoryRecord[];
  teachers?: TeacherRecord[];
  now?: Date;
  upcomingDays?: number;
}): BirthdayBoard {
  const now = input.now ?? new Date();
  const windowDays = input.upcomingDays ?? BIRTHDAY_UPCOMING_DAYS;
  const people: BirthdayPerson[] = [];

  for (const student of input.students) {
    if (!studentEligible(student)) continue;
    const dob = parseDateOfBirth(student.dateOfBirth);
    if (!dob) continue;
    people.push(toStudentPerson(student, dob, now));
  }

  for (const teacher of input.teachers ?? []) {
    if (teacher.status === "pending") continue;
    const dob = parseDateOfBirth(teacher.dateOfBirth);
    if (!dob) continue;
    people.push(toTeacherPerson(teacher, dob, now));
  }

  const byName = (a: BirthdayPerson, b: BirthdayPerson) => a.name.localeCompare(b.name);
  const today = people.filter((p) => p.daysUntil === 0).sort(byName);
  const upcoming = people
    .filter((p) => p.daysUntil > 0 && p.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));

  return { today, upcoming };
}

export function loadBirthdayBoard(now = new Date()): BirthdayBoard {
  return buildBirthdayBoard({
    students: loadStudentDirectory(),
    teachers: loadTeacherDirectory(),
    now,
  });
}

export function openBirthdayWhatsApp(
  person: BirthdayPerson,
  branding: string | BirthdayWishBranding,
): boolean {
  const url = birthdayWhatsAppUrl(person, branding);
  if (!url) return false;
  openWhatsAppUrl(url);
  markBirthdayWished(person.id);
  return true;
}
