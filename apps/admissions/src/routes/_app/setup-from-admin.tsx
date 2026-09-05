import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import {
  admissionsInstituteIdForAdminInstitute,
  applyInstituteProfileSyncMessage,
  INSTITUTE_PROFILE_READY,
  isInstituteProfileSyncMessage,
} from "@lumenx/utils";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { continueInstituteWithLumenxAdmin } from "@/lib/admissions/repositories";
import type { LumenxAdminIdentity } from "@/lib/admissions/lumenx-admin-bridge";
import { ensureSharedProfileFromAdmin } from "@/lib/admissions/shared-institute-profile";
import { isApiAuthMode } from "@/auth/auth-mode";
import { applyAdminHandoffSession } from "@/auth/api-auth";

const searchSchema = z.object({
  handoff: z.string().min(1),
});

export const Route = createFileRoute("/_app/setup-from-admin")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Setting up — Admissions" }] }),
  component: SetupFromAdminPage,
});

type HandoffPayload = LumenxAdminIdentity & {
  dest?: "institute" | "applications";
  exp?: number;
  accessToken?: string;
  refreshToken?: string;
};

function decodeHandoff(raw: string): HandoffPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json) as HandoffPayload;
    if (!data.email || !data.name) return null;
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    try {
      const json = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
      return JSON.parse(json) as HandoffPayload;
    } catch {
      return null;
    }
  }
}

const STATUS_LINES = [
  "Setting up…",
  "Linking your school account…",
  "Syncing institute profile…",
  "Preparing Admissions…",
  "Almost ready…",
];

function SetupFromAdminPage() {
  const { handoff: handoffParam } = Route.useSearch();
  const { refresh } = useAdmissionsAuth();
  const nav = useNavigate();
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const minMs = 5000 + Math.floor(Math.random() * 5000); // 5–10s
      const startedAt = Date.now();

      const payload = decodeHandoff(handoffParam);
      if (!payload) {
        setError("This setup link expired or is invalid. Open Admissions again from Admin.");
        return;
      }

      // Ask Admin (opener) for the current institute profile
      try {
        window.opener?.postMessage({ type: INSTITUTE_PROFILE_READY }, "*");
      } catch {
        /* no opener */
      }

      const profileWait = new Promise<void>((resolve) => {
        const onMessage = (event: MessageEvent) => {
          if (!isInstituteProfileSyncMessage(event.data)) return;
          ensureSharedProfileFromAdmin(event.data.admissionsInstituteId, event.data.profile);
          applyInstituteProfileSyncMessage(event.data);
          window.removeEventListener("message", onMessage);
          resolve();
        };
        window.addEventListener("message", onMessage);
        window.setTimeout(() => {
          window.removeEventListener("message", onMessage);
          resolve();
        }, 4000);
      });

      try {
        if (isApiAuthMode() && payload.accessToken) {
          await applyAdminHandoffSession({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            instituteId: payload.instituteId,
            instituteName: payload.instituteName || "Institute",
            name: payload.name,
            phone: payload.phone,
          });
        } else if (isApiAuthMode()) {
          setError(
            "Could not restore your Admin session. Sign in to Admissions with your Admin email and password.",
          );
          return;
        } else {
          continueInstituteWithLumenxAdmin({
            email: payload.email,
            name: payload.name,
            phone: payload.phone,
            instituteId: payload.instituteId || "ins-test1school",
            instituteName: payload.instituteName || "Test1School",
          });
        }
        refresh();
      } catch {
        setError("Could not finish setup. Try again from Admin, or sign in with LumenX Admin.");
        return;
      }

      await profileWait;

      const elapsed = Date.now() - startedAt;
      if (elapsed < minMs) {
        await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
      }

      const dest = payload.dest === "applications" ? "applications" : "institute";
      if (dest === "applications") {
        nav({ to: "/institute/applications", replace: true });
      } else {
        nav({ to: "/institute", replace: true });
      }
    };

    void run();
  }, [handoffParam, nav, refresh]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center animate-in fade-in duration-500">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {error ? (
          <Building2 className="size-8" />
        ) : (
          <Loader2 className="size-8 animate-spin" />
        )}
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
        {error ? "Setup paused" : "Setting up"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error ?? STATUS_LINES[statusIndex]}
      </p>
      {!error ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Connecting your LumenX Admin school to Admissions. This may take a few seconds.
        </p>
      ) : (
        <button
          type="button"
          className="mt-6 text-sm font-medium text-primary"
          onClick={() => nav({ to: "/login" })}
        >
          Go to Admissions sign in
        </button>
      )}
    </div>
  );
}
