import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

export const Route = createFileRoute("/splash")({
  head: () => ({ meta: [{ title: "LumenX Admin" }] }),
  component: SplashScreen,
});

const SPLASH_DURATION_MS = 2600;

function SplashScreen() {
  const navigate     = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [progress, setProgress] = useState(0);
  const [phase,    setPhase]    = useState<"entering" | "loaded" | "exiting">("entering");

  useEffect(() => {
    // Animate progress bar to 100% over SPLASH_DURATION_MS
    const step = 100 / (SPLASH_DURATION_MS / 50);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);

    // Phase: entering → loaded after 400ms
    const t1 = setTimeout(() => setPhase("loaded"),    400);
    // Phase: loaded → exiting 400ms before navigation
    const t2 = setTimeout(() => setPhase("exiting"),   SPLASH_DURATION_MS - 400);

    // Navigate after splash
    const t3 = setTimeout(() => {
      clearInterval(interval);
      if (!isLoading) {
        navigate({ to: isAuthenticated ? "/" : "/welcome", replace: true });
      }
    }, SPLASH_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If auth resolves before splash ends, navigate immediately after fade
  useEffect(() => {
    if (!isLoading && phase === "exiting") {
      const t = setTimeout(() => {
        navigate({ to: isAuthenticated ? "/" : "/welcome", replace: true });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isLoading, isAuthenticated, phase, navigate]);

  return (
    <div
      className={[
        "min-h-screen flex flex-col items-center justify-center bg-background transition-opacity duration-400",
        phase === "exiting" ? "opacity-0" : "opacity-100",
      ].join(" ")}
      aria-label="Loading LumenX Admin"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-primary/[0.07] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-chart-5/[0.06] rounded-full blur-3xl" />
      </div>

      {/* Logo + brand */}
      <div
        className={[
          "relative z-10 flex flex-col items-center transition-all duration-500",
          phase === "entering" ? "opacity-0 scale-90 translate-y-4" : "opacity-100 scale-100 translate-y-0",
        ].join(" ")}
      >
        {/* Animated logo */}
        <div className="relative mb-6">
          {/* Outer ring pulse */}
          <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
          <div className="relative size-20 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
            <Sparkles className="size-9 text-primary-foreground" />
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight">LUMENX ADMIN</div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mt-1.5">
            Institute Intelligence Platform
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-10 w-48 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Version tag */}
      <div className="fixed bottom-5 text-[10px] text-muted-foreground/40 tracking-wide">
        v2.0.0 · Session 2025–26
      </div>
    </div>
  );
}
