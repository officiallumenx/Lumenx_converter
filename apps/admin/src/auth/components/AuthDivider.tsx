/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthDivider
 * ───────────────────────────────────────────────────────────── */

interface AuthDividerProps {
  label: string;
}

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
