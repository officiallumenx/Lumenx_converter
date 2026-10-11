/** Lightweight placeholder while a lazy route/feature chunk loads. */
export function RouteChunkFallback({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[12rem] items-center justify-center gap-3 px-4 py-10 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div
        className="size-6 shrink-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
