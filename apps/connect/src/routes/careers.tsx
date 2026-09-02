import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { redirectToCareersPortal } from "@/lib/careers-origin";

export const Route = createFileRoute("/careers")({
  head: () => ({ meta: [{ title: "Redirecting — LumenX Careers" }] }),
  component: CareersRootRedirect,
});

function CareersRootRedirect() {
  useEffect(() => {
    redirectToCareersPortal("/");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Redirecting to LumenX Careers…</p>
    </div>
  );
}
