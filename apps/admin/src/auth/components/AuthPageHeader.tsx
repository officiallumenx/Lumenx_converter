/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthPageHeader
 *  Centered icon + title block for standalone auth steps.
 * ───────────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";
import { IconChip } from "@/components/IconChip";

interface AuthPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  highlight?: string;
}

export function AuthPageHeader({ icon: Icon, title, description, highlight }: AuthPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col items-center text-center gap-4">
      <IconChip icon={Icon} size="lg" className="mb-1" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
        {highlight && (
          <p className="mt-0.5 text-sm font-semibold text-foreground">{highlight}</p>
        )}
      </div>
    </div>
  );
}
