/**
 * Build downloadable text stand-ins for Connect ID cards / certificates.
 * Saves via @lumenx/utils downloadToDevice — device Downloads only, no in-app copy.
 */
import { downloadTextToDevice } from "@lumenx/utils";
import type { ConnectIdCardViewModel } from "@/lib/student/admin-id-card-bridge";
import type { StudentCertificateRecord } from "@/lib/student/mock-data";

function safeFilePart(value: string): string {
  return value.trim().replace(/[^\w.-]+/g, "_").slice(0, 48) || "file";
}

export function downloadStudentIdCardToDevice(card: ConnectIdCardViewModel): { filename: string } {
  const lines = [
    card.institute,
    "DIGITAL STUDENT ID CARD",
    "========================================",
    `Name           : ${card.name}`,
    `Student ID     : ${card.id}`,
    `Class / Sec.   : ${card.className}-${card.section}`,
    `Roll No.       : ${card.rollNo}`,
    `House          : ${card.house}`,
    `Blood group    : ${card.bloodGroup}`,
    `Parent         : ${card.parentName}`,
    `Emergency      : ${card.emergencyContact}`,
    `Issued         : ${card.issuedOn}`,
    `Valid till     : ${card.validTill}`,
    `Address        : ${card.address}`,
    "========================================",
    "Saved to this device's Downloads folder.",
    "This is a computer-generated ID card copy.",
    "",
  ];
  return downloadTextToDevice(
    `ID-Card-${safeFilePart(card.id)}.txt`,
    lines.join("\n"),
    "text/plain;charset=utf-8",
  );
}

export function downloadStudentCertificateToDevice(
  cert: StudentCertificateRecord,
  studentName: string,
): { filename: string } {
  const lines = [
    "Test1School",
    "CERTIFICATE OF ACHIEVEMENT",
    "========================================",
    `Title      : ${cert.title}`,
    `Reference  : ${cert.refNo}`,
    `Awarded to : ${studentName}`,
    `Category   : ${cert.category}`,
    `Issuer     : ${cert.issuer}`,
    `Issued on  : ${cert.issuedOn}`,
    "----------------------------------------",
    cert.description,
    "========================================",
    "Saved to this device's Downloads folder.",
    "This is a computer-generated certificate copy.",
    "",
  ];
  return downloadTextToDevice(
    `Certificate-${safeFilePart(cert.refNo)}.txt`,
    lines.join("\n"),
    "text/plain;charset=utf-8",
  );
}
