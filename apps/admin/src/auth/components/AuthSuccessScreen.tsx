/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthSuccessScreen
 *  Standardized completion state for auth wizards.
 * ───────────────────────────────────────────────────────────── */

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { AUTH_CARD_ENTER } from "../auth-ui";

interface AuthSuccessScreenProps {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function AuthSuccessScreen({ title, description, children, footer }: AuthSuccessScreenProps) {
  return (
    <div className={`flex flex-col items-center text-center py-4 ${AUTH_CARD_ENTER}`}>
      <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-5">
        <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{description}</p>
      {children && <div className="w-full mt-6">{children}</div>}
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
