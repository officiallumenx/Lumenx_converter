/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthOtpLayout
 *  Split layout for OTP verification screens.
 * ───────────────────────────────────────────────────────────── */

import type { ReactNode } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { AUTH_PAGE_ENTER, AUTH_PAGE_MAX } from "../auth-ui";

export interface AuthOtpBrandContent {
  badge: string;
  title: ReactNode;
  description: string;
  steps: { icon: string; text: string; done?: boolean }[];
}

interface AuthOtpLayoutProps {
  children: ReactNode;
  brand: AuthOtpBrandContent;
}

function BrandPanel({ brand }: { brand: AuthOtpBrandContent }) {
  return (
    <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-10 text-primary-foreground">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <span className="text-lg font-bold tracking-tight">LumenX Admin</span>
      </div>

      <div className="space-y-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {brand.badge}
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{brand.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            {brand.description}
          </p>
        </div>

        <div className="space-y-3">
          {brand.steps.map(({ icon, text, done }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold backdrop-blur-sm",
                  done ? "bg-emerald-400/30 text-emerald-200" : "bg-white/20",
                ].join(" ")}
              >
                {icon}
              </div>
              <span
                className={[
                  "text-sm",
                  done ? "line-through text-primary-foreground/50" : "text-primary-foreground/85",
                ].join(" ")}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-primary-foreground/50">
        LumenX · Secure · Enterprise-grade
      </p>
    </div>
  );
}

export function AuthOtpLayout({ children, brand }: AuthOtpLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel brand={brand} />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-12">
        <div className={`w-full ${AUTH_PAGE_MAX} ${AUTH_PAGE_ENTER}`}>{children}</div>
      </div>
    </div>
  );
}
