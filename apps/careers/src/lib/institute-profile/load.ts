import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { DemoInstituteProfile } from "@lumenx/types";
import { normalizeInstituteProfile } from "@lumenx/utils";
import { getInstitutePublicProfile } from "./api";

export async function loadInstitutePublicProfile(
  instituteId: string,
): Promise<DemoInstituteProfile | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) return null;
  try {
    const row = await getInstitutePublicProfile(instituteId);
    return normalizeInstituteProfile(row.profile);
  } catch {
    return null;
  }
}
