import { KeyRound, Sparkles } from "lucide-react";
import {
  CONNECT_DEMO_OTP,
  CONNECT_DEMO_PASSWORD,
  DUAL_ROLE_DEMO_TEACHER,
} from "@/lib/connect-demo-credentials";

type ConnectDemoCredentialsCardProps = {
  /** Highlight the dual-role teacher demo (e.g. on teacher login steps). */
  emphasizeDualTeacher?: boolean;
  className?: string;
};

export function ConnectDemoCredentialsCard({
  emphasizeDualTeacher = false,
  className,
}: ConnectDemoCredentialsCardProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] shadow-soft overflow-hidden">
        <div className="flex items-center gap-2 border-b border-primary/15 bg-primary/[0.03] px-4 py-3">
          <KeyRound className="size-4 text-primary" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Demo sign-in
          </span>
        </div>
        <div className="space-y-2.5 px-4 py-3.5 text-xs leading-relaxed">
          <CredentialRow label="Password (all roles)" value={CONNECT_DEMO_PASSWORD} />
          <CredentialRow label="OTP (all roles)" value={CONNECT_DEMO_OTP} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pick any institute, then choose Parent, Teacher, or Student. Any valid mobile number works
            for demo login.
          </p>
        </div>
      </div>

      <div
        className={
          emphasizeDualTeacher
            ? "mt-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] shadow-soft overflow-hidden"
            : "mt-3 rounded-xl border border-border bg-muted/20 shadow-soft overflow-hidden"
        }
      >
        <div
          className={
            emphasizeDualTeacher
              ? "flex items-center gap-2 border-b border-violet-500/15 bg-violet-500/[0.04] px-4 py-3"
              : "flex items-center gap-2 border-b border-border/80 bg-muted/30 px-4 py-3"
          }
        >
          <Sparkles className="size-4 text-violet-600 dark:text-violet-300" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Dual-role teacher demo
          </span>
        </div>
        <div className="space-y-2.5 px-4 py-3.5 text-xs leading-relaxed">
          <CredentialRow label="Role" value="Teacher Portal" />
          <CredentialRow label="Mobile" value={DUAL_ROLE_DEMO_TEACHER.phone} />
          <CredentialRow label="Teacher" value={`${DUAL_ROLE_DEMO_TEACHER.name} (${DUAL_ROLE_DEMO_TEACHER.id})`} />
          <CredentialRow label="Assignment" value="Subject + Activity (dual_role)" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            After sign-in, open <span className="font-medium text-foreground">Settings</span> and use
            the <span className="font-medium text-foreground">Subject / Activity</span> switch to move
            between the class teacher portal and the activity coordinator portal.
          </p>
        </div>
      </div>
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  );
}
