/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthSectionHeader
 * ───────────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";
import { IconChip } from "@/components/IconChip";

interface AuthSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function AuthSectionHeader({ icon: Icon, title, subtitle }: AuthSectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-3 border-b border-border">
      <IconChip icon={Icon} size="sm" className="mt-0.5" />
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
