/**
 * Minimal API-mode institute indicator + switcher for Admin chrome.
 * Hidden entirely in demo mode.
 *
 * Logo = institute profile photo uploaded in Institute Profile (not the LumenX product mark).
 */
import { Building2, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildInstituteMonogramLogoUrl } from "@lumenx/utils";
import { useAuth } from "@/auth/AuthContext";
import { useInstituteContext, settingsToDemoProfile } from "@/lib/institutes";
import { useInstituteProfileQuery } from "@/lib/admin-queries";
import { cn } from "@lumenx/ui";

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360;
  return h;
}

function isImageUrl(value: string | null | undefined): boolean {
  const v = value?.trim() ?? "";
  return (
    v.startsWith("data:image/") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("blob:")
  );
}

/** Prefer uploaded profile photo; fall back to logo only when it is an image URL. */
function resolveInstituteMarkUrl(profile: {
  profilePhoto?: string;
  logo?: string;
} | null): string | null {
  if (!profile) return null;
  if (isImageUrl(profile.profilePhoto)) return profile.profilePhoto!.trim();
  if (isImageUrl(profile.logo)) return profile.logo!.trim();
  return null;
}

function SwitcherMark({
  name,
  imageUrl,
  instituteId,
  size = "sm",
}: {
  name: string;
  imageUrl?: string | null;
  instituteId: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "size-7" : "size-5";
  const src = imageUrl?.trim() || null;

  if (src && isImageUrl(src)) {
    return (
      <span
        className={cn(
          dim,
          "shrink-0 overflow-hidden rounded-md border border-border/70 bg-background",
        )}
      >
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  const monogram = buildInstituteMonogramLogoUrl(
    name.trim().slice(0, 2) || "IN",
    hueFromId(instituteId),
  );

  return (
    <span
      className={cn(
        dim,
        "shrink-0 overflow-hidden rounded-md border border-border/70 bg-background",
      )}
    >
      <img src={monogram} alt="" className="size-full object-cover" />
    </span>
  );
}

export function ApiInstituteSwitcher({ className }: { className?: string }) {
  const ctx = useInstituteContext();
  const { applyApiActiveInstitute, clearApiActiveInstitutePresentation } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const profileEnabled =
    ctx.isApiMode && ctx.status === "ready" && Boolean(ctx.activeInstituteId);
  const profileQuery = useInstituteProfileQuery(
    ctx.activeInstituteId,
    profileEnabled,
  );

  const activeMarkUrl = useMemo(() => {
    const institute = profileQuery.data?.institute;
    const settings = profileQuery.data?.settings;
    if (!institute || !settings) return null;
    return resolveInstituteMarkUrl(settingsToDemoProfile(institute, settings));
  }, [profileQuery.data]);

  // Sync AuthUser institute presentation with validated context (never demo fallback).
  useEffect(() => {
    if (!ctx.isApiMode) return;

    if (ctx.status === "ready" && ctx.activeInstitute) {
      applyApiActiveInstitute(ctx.activeInstitute.id, ctx.activeInstitute.name);
      return;
    }

    if (
      ctx.status === "error" ||
      ctx.status === "forbidden" ||
      ctx.status === "empty" ||
      ctx.status === "needs_selection"
    ) {
      clearApiActiveInstitutePresentation();
    }
  }, [
    ctx.isApiMode,
    ctx.status,
    ctx.activeInstitute,
    applyApiActiveInstitute,
    clearApiActiveInstitutePresentation,
  ]);

  if (!ctx.isApiMode) return null;

  const onSelect = async (instituteId: string) => {
    setSelectError(null);
    try {
      const chosen = await ctx.selectInstitute(instituteId);
      applyApiActiveInstitute(chosen.id, chosen.name);
      setOpen(false);
    } catch (err) {
      setSelectError(err instanceof Error ? err.message : "Selection failed");
    }
  };

  if (ctx.status === "loading") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] text-muted-foreground",
          className,
        )}
        aria-live="polite"
      >
        <Building2 className="size-3 shrink-0 opacity-60" aria-hidden />
        <span>Loading institute…</span>
      </div>
    );
  }

  if (ctx.status === "empty") {
    return (
      <div
        className={cn("text-[10px] text-muted-foreground", className)}
        title="No active institute membership"
      >
        No institute access
      </div>
    );
  }

  if (ctx.status === "forbidden") {
    return (
      <div
        className={cn("text-[10px] text-amber-700 dark:text-amber-400", className)}
        title={ctx.errorMessage ?? "Forbidden"}
      >
        Institute access denied
      </div>
    );
  }

  if (ctx.status === "error") {
    return (
      <div
        className={cn("text-[10px] text-destructive", className)}
        title={ctx.errorMessage ?? "Error"}
      >
        Institute unavailable
      </div>
    );
  }

  const needsSelection = ctx.status === "needs_selection";
  const canSwitch = ctx.institutes.length > 1;
  const active = ctx.activeInstitute;
  const titleName = active?.name?.trim() || "Institute";
  const titleCode = active?.code?.trim() || "";
  const fullLabel = titleCode ? `${titleName} · ${titleCode}` : titleName;

  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      <button
        type="button"
        disabled={!canSwitch && !needsSelection}
        onClick={() => {
          if (canSwitch || needsSelection) setOpen((v) => !v);
        }}
        className={cn(
          "flex w-full max-w-full items-center gap-2 text-left",
          needsSelection
            ? "font-semibold text-amber-700 dark:text-amber-400"
            : "text-foreground",
          (canSwitch || needsSelection) && "hover:opacity-90",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={
          needsSelection ? "Select an institute to continue" : fullLabel
        }
      >
        {active && !needsSelection ? (
          <SwitcherMark
            name={titleName}
            imageUrl={activeMarkUrl}
            instituteId={active.id}
          />
        ) : (
          <Building2 className="size-4 shrink-0 opacity-70" aria-hidden />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          {needsSelection ? (
            <span className="block truncate text-[11px]">Select institute…</span>
          ) : (
            <>
              <span className="block truncate text-[11px] font-semibold normal-case tracking-normal">
                {titleName}
              </span>
              {titleCode ? (
                <span className="block truncate text-[9px] font-normal uppercase tracking-[0.12em] text-muted-foreground">
                  {titleCode}
                </span>
              ) : null}
            </>
          )}
        </span>
        {(canSwitch || needsSelection) && (
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        )}
      </button>

      {open && (canSwitch || needsSelection) && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] max-w-[20rem] rounded-md border border-border bg-popover py-1 shadow-md"
        >
          {ctx.institutes.map((inst) => (
            <button
              key={inst.id}
              type="button"
              role="option"
              aria-selected={inst.id === ctx.activeInstituteId}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-muted",
                inst.id === ctx.activeInstituteId && "bg-muted/60",
              )}
              onClick={() => void onSelect(inst.id)}
            >
              <SwitcherMark
                name={inst.name}
                imageUrl={
                  inst.id === ctx.activeInstituteId ? activeMarkUrl : null
                }
                instituteId={inst.id}
                size="md"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {inst.name}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {inst.code}
                </span>
              </span>
            </button>
          ))}
          {selectError && (
            <div className="border-t border-border px-3 py-2 text-[10px] text-destructive">
              {selectError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
