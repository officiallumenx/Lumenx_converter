/**
 * Optional verify/test helper — writes demo registers only when the store is empty.
 * Dashboards must never call this; empty registers → empty/0 UI.
 */

import { listAllSlotRegisters, upsertSlotRegister } from "./register-store";
import type { AttendanceSlotRegister } from "./types";

function isoDaysAgo(daysAgo: number, from = "2026-09-15"): string {
  const d = new Date(`${from}T12:00:00`);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function maPair(input: {
  idPrefix: string;
  sectionKey: string;
  classLabel: string;
  section: string;
  date: string;
  markedById: string;
  markedByName: string;
  morningAbsent: string[];
  afternoonAbsent: string[];
  afternoonLeave?: string[];
}): AttendanceSlotRegister[] {
  const base = {
    sectionKey: input.sectionKey,
    classLabel: input.classLabel,
    section: input.section,
    markedById: input.markedById,
    markedByName: input.markedByName,
    status: "submitted" as const,
    configVersionId: "att-cfg-seed-ma",
    method: "morning_afternoon" as const,
    owner: "class_teacher" as const,
  };
  return [
    {
      ...base,
      id: `${input.idPrefix}-am`,
      date: input.date,
      slotId: "slot:morning",
      slotLabel: "Morning",
      slotKind: "morning",
      absentIds: input.morningAbsent,
      leaveIds: [],
      updatedAt: `${input.date}T09:05:00.000Z`,
      submittedAt: `${input.date}T09:05:00.000Z`,
    },
    {
      ...base,
      id: `${input.idPrefix}-pm`,
      date: input.date,
      slotId: "slot:afternoon",
      slotLabel: "Afternoon",
      slotKind: "afternoon",
      absentIds: input.afternoonAbsent,
      leaveIds: input.afternoonLeave ?? [],
      updatedAt: `${input.date}T14:10:00.000Z`,
      submittedAt: `${input.date}T14:10:00.000Z`,
    },
  ];
}

/** Ensure demo history exists for report accuracy across method changes. */
export function ensureDemoAttendanceHistorySeed(): void {
  if (listAllSlotRegisters().length > 0) return;

  const s10b = ["stu:10:B:01", "stu:10:B:02", "stu:10:B:03", "stu:10:B:04", "stu:10:B:05"];
  const s9a = ["stu:9:A:01", "stu:9:A:02", "stu:9:A:03", "stu:9:A:04", "stu:9:A:05"];
  const s11c = ["stu:11:C:01", "stu:11:C:02", "stu:11:C:03", "stu:11:C:04"];

  const rows: AttendanceSlotRegister[] = [
    ...maPair({
      idPrefix: "att-reg-10b-0714",
      sectionKey: "10::B",
      classLabel: "10",
      section: "B",
      date: "2026-07-14",
      markedById: "T-1042",
      markedByName: "Ananya Iyer",
      morningAbsent: [s10b[1]!],
      afternoonAbsent: [s10b[1]!, s10b[4]!],
    }),
    ...maPair({
      idPrefix: "att-reg-10b-0715",
      sectionKey: "10::B",
      classLabel: "10",
      section: "B",
      date: "2026-07-15",
      markedById: "T-1042",
      markedByName: "Ananya Iyer",
      morningAbsent: [s10b[4]!],
      afternoonAbsent: [s10b[4]!],
    }),
    ...maPair({
      idPrefix: "att-reg-10b-0721",
      sectionKey: "10::B",
      classLabel: "10",
      section: "B",
      date: "2026-07-21",
      markedById: "T-1042",
      markedByName: "Ananya Iyer",
      morningAbsent: [s10b[1]!, s10b[4]!],
      afternoonAbsent: [s10b[1]!],
      afternoonLeave: [s10b[2]!],
    }),
    ...maPair({
      idPrefix: "att-reg-10b-0728",
      sectionKey: "10::B",
      classLabel: "10",
      section: "B",
      date: "2026-07-28",
      markedById: "T-1042",
      markedByName: "Ananya Iyer",
      morningAbsent: [],
      afternoonAbsent: [s10b[4]!],
    }),
    ...maPair({
      idPrefix: "att-reg-9a-0714",
      sectionKey: "9::A",
      classLabel: "9",
      section: "A",
      date: "2026-07-14",
      markedById: "T-2081",
      markedByName: "Ravi Menon",
      morningAbsent: [s9a[0]!, s9a[1]!, s9a[2]!],
      afternoonAbsent: [s9a[0]!, s9a[1]!],
    }),
    ...maPair({
      idPrefix: "att-reg-9a-0721",
      sectionKey: "9::A",
      classLabel: "9",
      section: "A",
      date: "2026-07-21",
      markedById: "T-2081",
      markedByName: "Ravi Menon",
      morningAbsent: [s9a[0]!, s9a[3]!],
      afternoonAbsent: [s9a[0]!],
    }),
    ...maPair({
      idPrefix: "att-reg-9a-0728",
      sectionKey: "9::A",
      classLabel: "9",
      section: "A",
      date: "2026-07-28",
      markedById: "T-2081",
      markedByName: "Ravi Menon",
      morningAbsent: [s9a[0]!, s9a[1]!],
      afternoonAbsent: [s9a[0]!, s9a[1]!, s9a[4]!],
    }),
    ...maPair({
      idPrefix: "att-reg-11c-0715",
      sectionKey: "11::C",
      classLabel: "11",
      section: "C",
      date: "2026-07-15",
      markedById: "T-3110",
      markedByName: "Priya Nair",
      morningAbsent: [s11c[2]!],
      afternoonAbsent: [s11c[2]!, s11c[3]!],
    }),
    ...maPair({
      idPrefix: "att-reg-11c-0722",
      sectionKey: "11::C",
      classLabel: "11",
      section: "C",
      date: "2026-07-22",
      markedById: "T-3110",
      markedByName: "Priya Nair",
      morningAbsent: [s11c[2]!],
      afternoonAbsent: [],
    }),
  ];

  const septDate = "2026-09-10";
  rows.push({
    id: "att-reg-seed-p1",
    sectionKey: "10::B",
    classLabel: "10",
    section: "B",
    markedById: "T-1042",
    markedByName: "Ananya Iyer",
    status: "submitted",
    configVersionId: "att-cfg-seed-period",
    method: "period_wise",
    owner: "current_period_teacher",
    date: septDate,
    slotId: "slot:period:1",
    slotLabel: "P2 · Mathematics",
    slotKind: "period",
    absentIds: [s10b[4]!],
    leaveIds: [s10b[1]!],
    updatedAt: `${septDate}T09:10:00.000Z`,
    submittedAt: `${septDate}T09:10:00.000Z`,
  });

  const recent = isoDaysAgo(1);
  rows.push({
    id: "att-reg-seed-recent",
    sectionKey: "10::B",
    classLabel: "10",
    section: "B",
    markedById: "T-1042",
    markedByName: "Ananya Iyer",
    status: "submitted",
    configVersionId: "att-cfg-seed-period",
    method: "period_wise",
    owner: "current_period_teacher",
    date: recent,
    slotId: "slot:period:1",
    slotLabel: "P2 · Mathematics",
    slotKind: "period",
    absentIds: [],
    leaveIds: [],
    updatedAt: `${recent}T09:00:00.000Z`,
    submittedAt: `${recent}T09:00:00.000Z`,
  });

  for (const row of rows) {
    upsertSlotRegister(row);
  }
}
