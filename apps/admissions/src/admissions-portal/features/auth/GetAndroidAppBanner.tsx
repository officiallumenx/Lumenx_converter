import { Smartphone } from "lucide-react";

const PLAY_URL =
  (import.meta.env.VITE_ADMISSIONS_PLAY_URL as string | undefined)?.trim() ||
  "https://play.google.com/store/apps/details?id=com.lumenx.app.admissions";

/** Mobile web users can jump to the Admissions Play Store listing. */
export function GetAndroidAppBanner() {
  return (
    <a
      href={PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Smartphone className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">Get Admissions on Google Play</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Prefer the Android app? Open the Play Store listing.
        </span>
      </span>
    </a>
  );
}
