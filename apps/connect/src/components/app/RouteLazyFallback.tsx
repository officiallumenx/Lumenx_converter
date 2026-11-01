export function RouteLazyFallback() {
  return (
    <div className="space-y-4 animate-pulse py-2">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-40 rounded-2xl bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
