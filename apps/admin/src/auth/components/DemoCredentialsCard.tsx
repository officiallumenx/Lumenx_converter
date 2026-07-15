/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — DemoCredentialsCard
 *  Visible demo login details for the admin app.
 * ───────────────────────────────────────────────────────────── */

import { KeyRound, ShieldCheck } from "lucide-react";
import { DEMO_USERS } from "../constants";
import { DEMO_SECURITY_PIN } from "../app-lock-store";

const DEMO_PASSWORD = "Admin@1234";

export function DemoCredentialsCard() {
  const admin = DEMO_USERS.find((u) => u.user.role === "super_admin") ?? DEMO_USERS[0];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-primary/15 bg-primary/[0.03] flex items-center gap-2">
        <KeyRound className="size-3.5 text-primary" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Demo admin credentials
        </span>
      </div>
      <div className="px-4 py-3 space-y-2.5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-muted-foreground">Email</span>
          <span className="font-mono font-medium text-foreground">{admin.email}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-muted-foreground">Password</span>
          <span className="font-mono font-medium text-foreground">{DEMO_PASSWORD}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="text-muted-foreground">Mobile (optional)</span>
          <span className="font-mono font-medium text-foreground">{admin.user.phone ?? "—"}</span>
        </div>
        <div className="pt-2 border-t border-primary/10 flex items-start gap-2">
          <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            After sign-in, use app-lock PIN{" "}
            <span className="font-mono font-semibold text-foreground">{DEMO_SECURITY_PIN}</span>{" "}
            when prompted on launch.
          </p>
        </div>
      </div>
    </div>
  );
}
