import type { GeneratedDocument } from "./types";

/** Match generated certificates to a student directory record. */
export function certificatesForStudent<
  TStudent extends {
    id: string;
    name?: string;
    firstName?: string;
    surname?: string;
    admissionNumber?: string;
  },
>(student: TStudent, all: GeneratedDocument[]): GeneratedDocument[] {
  const fullName = `${student.firstName ?? ""} ${student.surname ?? ""}`.trim().toLowerCase();
  const altName = student.name?.trim().toLowerCase() ?? "";
  const id = student.id.toLowerCase();
  const admission = (student.admissionNumber ?? "").toLowerCase();

  return all.filter((d) => {
    if (d.kind !== "certificate") return false;
    const recipient = d.recipientName.trim().toLowerCase();
    const ref = d.recipientRef.trim().toLowerCase();
    if (recipient === fullName || (altName && recipient === altName)) return true;
    if (ref === id || (admission && ref === admission)) return true;
    if (fullName.length > 3 && (recipient.includes(fullName) || fullName.includes(recipient))) {
      return true;
    }
    return false;
  });
}

export function orphanCertificates<
  TStudent extends {
    id: string;
    name?: string;
    firstName?: string;
    surname?: string;
    admissionNumber?: string;
  },
>(students: TStudent[], all: GeneratedDocument[]): GeneratedDocument[] {
  return all.filter(
    (d) =>
      d.kind === "certificate" &&
      !students.some((s) => certificatesForStudent(s, [d]).length > 0),
  );
}
