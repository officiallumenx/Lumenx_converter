import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Label } from "@lumenx/ui";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import {
  getActiveLumenxAdminSession,
  verifyLumenxAdminCredentials,
  type LumenxAdminIdentity,
} from "@/lib/admin-handoff";
import { continueRecruiterWithLumenxAdmin } from "@/lib/careers/repositories";

/**
 * Recruiter sign-in / sign-up via an existing LumenX Admin account (demo same-origin).
 * API mode: institute staff sign in below with Admin email/password, or open from Admin.
 */
export function LumenxAdminContinueCard({
  mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  const { refresh } = useCareersAuth();
  const nav = useNavigate();
  const apiMode = isApiAuthMode();
  const [activeAdmin, setActiveAdmin] = useState<LumenxAdminIdentity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiMode) {
      setActiveAdmin(getActiveLumenxAdminSession());
    }
  }, [apiMode]);

  const finish = (admin: LumenxAdminIdentity) => {
    setLoading(true);
    try {
      continueRecruiterWithLumenxAdmin(admin);
      refresh();
      toast.success(
        mode === "sign-up"
          ? "Recruiter access ready via LumenX Admin"
          : `Signed in as ${admin.name}`,
      );
      nav({ to: "/recruiter" });
    } catch {
      toast.error("Could not continue with LumenX Admin");
    } finally {
      setLoading(false);
    }
  };

  const submitCredentials = () => {
    const admin = verifyLumenxAdminCredentials(identifier, password);
    if (!admin) {
      toast.error("No LumenX Admin account for those details");
      return;
    }
    finish(admin);
  };

  if (apiMode) {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              Institute staff
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sign in below with the same email and password as LumenX Admin, or open
              Careers from Admin → Careers for automatic setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {mode === "sign-up" ? "Sign up with LumenX Admin" : "Sign in with LumenX Admin"}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            For institutes that already have a LumenX Admin account. Opens Careers as your
            school recruiter — no separate Careers password needed.
          </p>

          {activeAdmin && !showForm ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Admin session found:{" "}
                <span className="font-medium text-foreground">{activeAdmin.name}</span>
              </p>
              <Button size="sm" disabled={loading} onClick={() => finish(activeAdmin)}>
                <Briefcase className="size-3.5 mr-1.5" />
                Continue as recruiter
              </Button>
              <button
                type="button"
                className="block text-xs text-muted-foreground hover:text-primary"
                onClick={() => setShowForm(true)}
              >
                Use different Admin credentials
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Admin email or mobile</Label>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin password</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPwd((v) => !v)}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button size="sm" disabled={loading} onClick={submitCredentials}>
                Continue with LumenX Admin
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
