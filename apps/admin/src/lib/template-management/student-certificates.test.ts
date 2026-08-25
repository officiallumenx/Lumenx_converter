import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_ADMIN_STUDENTS } from "@lumenx/module-students";
import { COLLEGE_MOCK_STUDENTS } from "@/lib/academic-data";
import { SEED_GENERATED } from "./seed-data";
import {
  certificatesForStudent,
  orphanCertificates,
} from "./student-certificates";

const store = new Map<string, string>();
let profileId = "single_institute";

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.mock("@lumenx/types", async () => {
  const actual = await vi.importActual<typeof import("@lumenx/types")>("@lumenx/types");
  return {
    ...actual,
    readDemoProfileId: () => profileId,
  };
});

function asDirectory(students: typeof MOCK_ADMIN_STUDENTS) {
  return students.map((s) => {
    const parts = s.name.trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[parts.length - 1]! : "";
    const firstName = parts.slice(0, -1).join(" ") || s.name;
    return {
      ...s,
      firstName,
      surname,
      admissionNumber: s.id,
    };
  });
}

describe("Certificates → Students functional matching", () => {
  beforeEach(() => {
    store.clear();
    profileId = "single_institute";
  });

  it("matches seed certificates to school directory with no orphans", () => {
    const students = asDirectory(MOCK_ADMIN_STUDENTS);
    const orphans = orphanCertificates(students, SEED_GENERATED);
    expect(orphans).toEqual([]);

    const aanya = students.find((s) => s.id === "STU-1042")!;
    const aanyaCerts = certificatesForStudent(aanya, SEED_GENERATED);
    expect(aanyaCerts.length).toBe(3);
    expect(aanyaCerts.every((d) => d.kind === "certificate")).toBe(true);

    const withCerts = students.filter(
      (s) => certificatesForStudent(s, SEED_GENERATED).length > 0,
    );
    expect(withCerts.map((s) => s.id).sort()).toEqual(
      ["STU-1042", "STU-1043", "STU-1045", "STU-1047", "STU-1048"].sort(),
    );
  });

  it("excludes reports, id cards, and documents from student certificate counts", () => {
    const marcus = asDirectory(MOCK_ADMIN_STUDENTS).find((s) => s.id === "STU-1047")!;
    const docs = certificatesForStudent(marcus, SEED_GENERATED);
    expect(docs.every((d) => d.kind === "certificate")).toBe(true);
    expect(docs.some((d) => d.id === "gen-1003")).toBe(false); // id_card
    expect(docs.some((d) => d.id === "gen-1009")).toBe(true);
  });

  it("remaps generated recipients for college profile", async () => {
    profileId = "inter_college";
    const { getGeneratedDocuments } = await import("./store");
    const docs = getGeneratedDocuments();
    const college = asDirectory(COLLEGE_MOCK_STUDENTS);
    const orphans = orphanCertificates(college, docs);
    expect(orphans).toEqual([]);

    const neha = college.find((s) => s.id === "STU-2001")!;
    expect(certificatesForStudent(neha, docs).length).toBe(3);
  });
});
