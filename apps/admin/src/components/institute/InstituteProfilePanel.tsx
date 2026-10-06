import { isApiAuthMode } from "@/auth/auth-mode";
import { InstituteApiProfilePage } from "@/components/institute/InstituteApiProfilePage";
import { InstituteDemoPage } from "@/routes/institute";

/** Institute profile editor for Institute Settings. */
export function InstituteProfilePanel({ embedded = true }: { embedded?: boolean }) {
  if (isApiAuthMode()) return <InstituteApiProfilePage embedded={embedded} />;
  return <InstituteDemoPage embedded={embedded} />;
}
