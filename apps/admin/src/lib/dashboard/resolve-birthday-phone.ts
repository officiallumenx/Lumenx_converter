/**
 * Resolve the best WhatsApp number for a Home birthday row.
 * Teachers: directory phone. Students: list phone / emergency, else primary guardian.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { whatsAppRecipientId } from "@/lib/birthday-workflow";
import type { BirthdayRow } from "@/lib/dashboard";
import { getStudentGuardians } from "@/lib/students/api";

export async function resolveBirthdayWishPhone(
  person: Pick<BirthdayRow, "id" | "role" | "phone">,
): Promise<string | null> {
  const existing = person.phone?.trim() || "";
  if (whatsAppRecipientId(existing)) return existing;

  if (!isApiAuthMode() || person.role !== "Student" || !person.id.trim()) {
    return null;
  }

  try {
    const guardians = await getStudentGuardians(person.id.trim());
    const ordered = [
      ...guardians.filter((g) => g.isPrimary),
      ...guardians.filter((g) => !g.isPrimary),
    ];
    for (const guardian of ordered) {
      const phone = guardian.phone?.trim() || "";
      if (whatsAppRecipientId(phone)) return phone;
    }
  } catch {
    return null;
  }
  return null;
}
