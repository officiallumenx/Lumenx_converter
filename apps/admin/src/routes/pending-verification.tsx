/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Pending Verification
 *  Post-registration review status screen (demo data).
 * ───────────────────────────────────────────────────────────── */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import { useState, useCallback } from "react";
import {
  Sparkles,
  LogOut,
  RefreshCw,
  Headphones,
  Building2,
  FileCheck,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  Phone,
  Globe,
  X,
  Copy,
  Check,
} from "lucide-react";

import { AuthButton } from "@/auth/components/AuthButton";
import { useAuth } from "@/auth/AuthContext";
import { useSignOut } from "@/auth/hooks/useSignOut";
import {
  type DemoApplicationStatus,
  getDemoApplicationStatus,
  refreshDemoApplicationStatus,
  formatDisplayDate,
  formatTimelineTime,
  SUPPORT_CONTACT,
} from "@/auth/pending-verification-data";

export const Route = createFileRoute("/pending-verification")({
  head: () => ({ meta: [{ title: "Application Under Review — LumenX Admin" }] }),
  component: PendingVerificationPage,
});

/* ── Illustration placeholder ───────────────────────────────── */

function ReviewIllustration() {
  return (
    <div
      className="relative mx-auto w-full max-w-[280px] aspect-[4/3] rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-chart-5/[0.05] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-4 left-4 right-4 h-2 rounded-full bg-primary/15" />
      <div className="absolute top-8 left-6 flex items-end gap-2">
        <IconChip icon={Building2} size="lg" className="!size-16 !rounded-lg" />
        <div className="w-12 h-14 rounded-lg bg-muted border border-border flex items-center justify-center">
          <IconChip icon={FileCheck} size="sm" variant="soft" />
        </div>
      </div>
      <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-amber-200/60 bg-amber-50/80 dark:border-amber-800/40 dark:bg-amber-950/30 px-3 py-2.5 flex items-center gap-2">
        <div className="size-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <Clock className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 text-left">
          <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 truncate">
            Review in progress
          </div>
          <div className="text-[9px] text-amber-700/80 dark:text-amber-400/80">
            Typical turnaround 2–3 days
          </div>
        </div>
      </div>
      <div className="absolute top-1/2 right-4 size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>
  );
}

/* ── Status timeline ────────────────────────────────────────── */

function StatusTimeline({ steps }: { steps: DemoApplicationStatus["timeline"] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const time = formatTimelineTime(step.timestamp);
        return (
          <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!last && (
              <div
                className={[
                  "absolute left-[11px] top-6 bottom-0 w-px",
                  step.status === "completed" ? "bg-emerald-500/40" : "bg-border",
                ].join(" ")}
              />
            )}
            <div className="relative z-10 shrink-0 mt-0.5">
              {step.status === "completed" && (
                <div className="size-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
              {step.status === "current" && (
                <div className="size-6 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                </div>
              )}
              {step.status === "upcoming" && (
                <div className="size-6 rounded-full bg-muted border border-border flex items-center justify-center">
                  <Circle className="size-3 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div
                className={[
                  "text-sm font-semibold",
                  step.status === "current"
                    ? "text-primary"
                    : step.status === "completed"
                      ? "text-foreground"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {step.label}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {step.description}
              </p>
              {time && (
                <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{time}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Support modal ──────────────────────────────────────────── */

function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close support dialog"
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="support-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-elevated animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <IconChip icon={Headphones} size="sm" />
            <div>
              <h2 id="support-title" className="text-sm font-semibold">Contact Support</h2>
              <p className="text-[11px] text-muted-foreground">We're here to help with your application</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {[
            { icon: Mail, label: "Email", value: SUPPORT_CONTACT.email, href: `mailto:${SUPPORT_CONTACT.email}` },
            { icon: Phone, label: "Phone", value: SUPPORT_CONTACT.phone, href: `tel:${SUPPORT_CONTACT.phone.replace(/\s/g, "")}` },
            { icon: Globe, label: "Help Center", value: SUPPORT_CONTACT.helpCenter, href: `https://${SUPPORT_CONTACT.helpCenter}` },
          ].map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={label === "Help Center" ? "_blank" : undefined}
              rel={label === "Help Center" ? "noopener noreferrer" : undefined}
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors"
            >
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-sm font-medium truncate">{value}</div>
              </div>
            </a>
          ))}
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            {SUPPORT_CONTACT.hours} · Quote your Application ID when contacting us.
          </p>
        </div>

        <div className="px-5 pb-5">
          <AuthButton variant="outline" fullWidth onClick={onClose}>
            Close
          </AuthButton>
        </div>
      </div>
    </div>
  );
}

/* ── Meta field ─────────────────────────────────────────────── */

function MetaField({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={`text-sm font-semibold truncate ${mono ? "font-mono" : ""}`}>{value}</span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

function PendingVerificationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signOut = useSignOut();
  const [status, setStatus] = useState<DemoApplicationStatus>(() => getDemoApplicationStatus());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  const name = user?.name?.split(" ")[0] ?? "there";

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const next = await refreshDemoApplicationStatus(status);
      setStatus(next);
      setRefreshMsg("Status unchanged — your application is still under review.");
    } finally {
      setRefreshing(false);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-500/[0.04] rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight text-sm">LUMENX ADMIN</span>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </header>

      <main className="relative z-10 flex-1 px-4 sm:px-6 py-8 lg:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Demo bypass — no real admin review in demo environment */}
          <div className="mb-6 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary">Demo environment</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Admin verification is simulated only. You can enter the dashboard without waiting for approval.
              </p>
            </div>
            <AuthButton
              type="button"
              variant="primary"
              fullWidth={false}
              onClick={() => navigate({ to: "/", replace: true })}
            >
              Enter dashboard
            </AuthButton>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

            {/* ── Left column ─────────────────────────────── */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
                <CheckCircle2 className="size-3.5" />
                Application Submitted
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                Institute Under Review
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                Hi {name}, your application for{" "}
                <strong className="text-foreground">{status.instituteName}</strong> is being
                reviewed by our onboarding team. We'll notify you once verification is complete.
              </p>

              <div className="mt-8 mb-8 lg:mb-0">
                <ReviewIllustration />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 lg:mt-8">
                <MetaField
                  label="Application ID"
                  value={status.applicationId}
                  mono
                  copyable
                />
                <MetaField
                  label="Registration Date"
                  value={formatDisplayDate(status.registrationDate)}
                />
              </div>

              <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <Clock className="size-3.5 shrink-0" />
                  Estimated review time: {status.estimatedReviewDays}
                </div>
              </div>
            </div>

            {/* ── Right column: timeline + actions ────────── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <h2 className="text-sm font-semibold">Status Timeline</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Track your application progress
                </p>
              </div>

              <div className="px-5 py-5">
                <StatusTimeline steps={status.timeline} />
              </div>

              {status.lastCheckedAt && (
                <div className="mx-5 mb-4 px-3 py-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground text-center">
                  Last checked {formatTimelineTime(status.lastCheckedAt)}
                </div>
              )}

              {refreshMsg && (
                <div className="mx-5 mb-4 px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-[11px] text-muted-foreground text-center animate-in fade-in duration-200">
                  {refreshMsg}
                </div>
              )}

              <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2.5">
                <AuthButton
                  type="button"
                  variant="outline"
                  fullWidth
                  loading={refreshing}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  Refresh status
                </AuthButton>
                <AuthButton
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={() => setSupportOpen(true)}
                >
                  <Headphones className="size-3.5" />
                  Contact support
                </AuthButton>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-[10px] text-muted-foreground/40">
        &copy; {new Date().getFullYear()} LumenX Technologies · Demo environment
      </footer>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
