import { useEffect, useState } from "react";
import { Input, Button } from "@lumenx/ui";
import { Smartphone, Wifi } from "lucide-react";
import {
  buildStudentQrScanValue,
  getPublicAppOrigin,
  isLocalDevOrigin,
  setPublicAppOrigin,
} from "@/lib/student/public-app-origin";

/** Stable short verify URL for QR codes (client-only origin). */
export function useStudentQrUrl(studentId: string): string {
  const [url, setUrl] = useState(() =>
    typeof window !== "undefined" ? buildStudentQrScanValue(studentId) : "",
  );

  useEffect(() => {
    setUrl(buildStudentQrScanValue(studentId));
    const refresh = () => setUrl(buildStudentQrScanValue(studentId));
    window.addEventListener("connect:qr-origin-updated", refresh);
    return () => window.removeEventListener("connect:qr-origin-updated", refresh);
  }, [studentId]);

  return url;
}

export function IdCardScanUrlHint() {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(() =>
    typeof window !== "undefined" ? getPublicAppOrigin() : "",
  );
  const show = isLocalDevOrigin();

  if (!show) return null;

  return (
    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Smartphone className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Scan from another phone</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            For local testing, open this app via your network IP (e.g.{" "}
            <code className="rounded bg-muted px-1">http://192.168.1.10:5173</code>) or paste it
            below so the QR opens on other devices.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="http://192.168.x.x:5173"
              className="rounded-xl text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 rounded-xl"
              onClick={() => {
                if (draft.trim()) setPublicAppOrigin(draft);
                setSaved(getPublicAppOrigin());
                setDraft("");
                window.dispatchEvent(new Event("connect:qr-origin-updated"));
              }}
            >
              <Wifi className="size-4" />
              Use for QR
            </Button>
          </div>
          {saved ? (
            <p className="mt-2 break-all text-[11px] text-muted-foreground">
              QR base URL: <span className="font-medium text-foreground">{saved}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
