import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Input, Label } from "@lumenx/ui";
import { Building2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import {
  getActiveLumenxAdminSession,
  verifyLumenxAdminCredentials,
  type LumenxAdminIdentity,
} from "@/lib/admissions/lumenx-admin-bridge";
import { continueInstituteWithLumenxAdmin } from "@/lib/admissions/repositories";

/**
 * Institute sign-in / sign-up via an existing LumenX Admin account.
 */
export function LumenxAdminContinueCard({
  mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  const { refresh } = useAdmissionsAuth();
  const nav = useNavigate();
  const [activeAdmin, setActiveAdmin] = useState<LumenxAdminIdentity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveAdmin(getActiveLumenxAdminSession());
  }, []);

  const finish = (admin: LumenxAdminIdentity) => {
    setLoading(true);
    try {
      continueInstituteWithLumenxAdmin(admin);
      refresh();
      toast.success(
        mode === "sign-up"
          ? "Institute Admissions access ready via LumenX Admin"
          : `Signed in as ${admin.name}`,
      );
      nav({ to: "/admissions/institute" });
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
            For institutes that already have a LumenX Admin account. Opens Admissions as your
            school — no separate institute password needed.
          </p>

          {activeAdmin && !showForm ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Admin session found:{" "}
                <span className="font-medium text-foreground">{activeAdmin.name}</span>
                {" · "}
                <span className="font-mono">{activeAdmin.email}</span>
              </p>
              <Button
                className="w-full"
                disabled={loading}
                onClick={() => finish(activeAdmin)}
              >
                <Building2 className="size-4" />
                {loading ? "Continuing…" : "Continue with this Admin account"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-primary"
                onClick={() => setShowForm(true)}
              >
                Use a different Admin account
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {!showForm ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowForm(true)}
                >
                  <ShieldCheck className="size-4" />
                  {mode === "sign-up"
                    ? "Sign up with LumenX Admin"
                    : "Sign in with LumenX Admin"}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Admin email or mobile</Label>
                    <Input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="principal@lumenx.edu"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin password</Label>
                    <div className="relative">
                      <Input
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        onKeyDown={(e) => e.key === "Enter" && submitCredentials()}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPwd(!showPwd)}
                      >
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Demo: principal@lumenx.edu / Admin@1234
                    </p>
                  </div>
                  <Button className="w-full" disabled={loading} onClick={submitCredentials}>
                    {loading ? "Checking…" : "Continue"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
