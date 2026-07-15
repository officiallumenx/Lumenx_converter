/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Sign In
 * ───────────────────────────────────────────────────────────── */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AtSign,
  UserCircle2,
} from "lucide-react";

import { AuthLayout } from "@/auth/components/AuthLayout";
import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthFormError } from "@/auth/components/AuthFormError";
import { AuthInfoCallout } from "@/auth/components/AuthInfoCallout";
import { AuthDivider } from "@/auth/components/AuthDivider";
import { DemoCredentialsCard } from "@/auth/components/DemoCredentialsCard";
import { useAuth } from "@/auth/AuthContext";
import { validateSignIn, hasErrors, isValidEmail } from "@/auth/validation";
import { DEMO_USERS } from "@/auth/constants";
import {
  loadLoginFlowDraft,
  saveLoginFlowDraft,
  clearLoginFlowDraft,
} from "@/auth/login-flow-store";
import type { SignInFormErrors } from "@/auth/types";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — LumenX Admin" }] }),
  component: LoginPage,
});

const DEMO_PASSWORD = "Admin@1234";

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, error: authError, clearError } = useAuth();

  const flowDraft = loadLoginFlowDraft();
  const [identifier, setIdentifier] = useState(flowDraft?.identifier ?? "");
  const [password,   setPassword]   = useState("");
  const [rememberMe, setRememberMe] = useState(flowDraft?.rememberMe ?? false);
  const [errors,     setErrors]     = useState<SignInFormErrors>({});
  const [loading,    setLoading]    = useState(false);

  const persistFlow = useCallback(
    (id: string, remember: boolean) => {
      saveLoginFlowDraft({ identifier: id, rememberMe: remember });
    },
    [],
  );

  useEffect(() => {
    persistFlow(identifier, rememberMe);
  }, [identifier, rememberMe, persistFlow]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSignIn({ identifier, password, rememberMe });
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    clearError();
    try {
      await signIn(identifier.trim(), password, rememberMe);
      clearLoginFlowDraft();
      navigate({ to: "/", replace: true });
    } catch {
      // authError set by context
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    const id = demoEmail;
    setIdentifier(id);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    setLoading(true);
    clearError();
    persistFlow(id, false);
    try {
      await signIn(id, DEMO_PASSWORD, false);
      clearLoginFlowDraft();
      navigate({ to: "/", replace: true });
    } catch {
      // handled by context
    } finally {
      setLoading(false);
    }
  };

  const identifierHint = identifier.trim()
    ? isValidEmail(identifier.trim())
      ? "Signing in with email"
      : "Signing in with mobile number"
    : "Use your registered email or mobile number";

  return (
    <AuthLayout
      title="Sign in to LumenX"
      subtitle="Secure access to your institute admin dashboard"
      showBack
      backTo="/welcome"
      backLabel="Back"
    >
      <AuthInfoCallout icon={ShieldCheck} title="Enterprise-grade security" variant="primary" className="mb-6">
        Encrypted session · Role-based access · Audit-ready
      </AuthInfoCallout>

      <div className="mb-6">
        <DemoCredentialsCard />
      </div>
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/[0.04] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-primary/15 bg-primary/[0.03]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Demo — Quick sign in
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          {DEMO_USERS.filter((u) => u.user.isVerified).map((u) => (
            <button
              key={u.email}
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin(u.email)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background/70 hover:bg-surface-hover hover:border-primary/30 text-left transition-all group disabled:opacity-50"
            >
              <div className="size-8 rounded-full bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                {u.user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold group-hover:text-primary transition-colors truncate">
                  {u.label}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {u.user.title} · {u.email}
                </div>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <AuthDivider label="or continue with credentials" />

      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
        <AuthInput
          label="Email or mobile number"
          name="identifier"
          type="text"
          icon={AtSign}
          placeholder="admin@institute.edu or +91 98765 43210"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (errors.identifier) setErrors((p) => ({ ...p, identifier: undefined }));
          }}
          error={errors.identifier}
          hint={identifierHint}
          autoComplete="username"
          inputMode="email"
          required
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          error={errors.password}
          autoComplete="current-password"
          required
          trailing={
            <Link
              to="/forgot-password"
              className="text-primary hover:underline font-medium"
              onClick={() => persistFlow(identifier, rememberMe)}
            >
              Forgot password?
            </Link>
          }
        />

        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border accent-primary"
          />
          <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
            Keep me signed in for 30 days on this device
          </span>
        </label>

        {authError && <AuthFormError message={authError} />}

        <AuthButton type="submit" loading={loading}>
          Sign in to dashboard
          <ArrowRight className="size-4" />
        </AuthButton>
      </form>

      <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
        <p className="text-center text-[11px] text-muted-foreground">
          <Link to="/forgot-pin" className="text-primary hover:underline font-medium">
            Forgot your security PIN?
          </Link>
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <UserCircle2 className="size-3.5 shrink-0" />
          <span>
            New to LumenX?{" "}
            <Link to="/signup" className="text-primary hover:underline font-semibold">
              Create an account
            </Link>
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
